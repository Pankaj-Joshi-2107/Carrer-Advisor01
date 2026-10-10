import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { z } from 'zod';
import { PublishedRoadmap } from '@/utils/learningStore';

const INDEX_KEY = 'career-advisor:community:roadmaps';
const recordKey = (id: string) => `career-advisor:community:roadmap:${id}`;
const DifficultySchema = z.enum(['Beginner', 'Intermediate', 'Advanced']);
const RoadmapDataSchema = z.object({
  nodes: z.array(z.object({
    id: z.string().min(1).max(120),
    name: z.string().min(1).max(200),
    description: z.string().max(1000),
    type: z.enum(['primary', 'secondary', 'tertiary']).optional(),
    group: z.string().max(120).optional(),
  })).min(1).max(100),
  links: z.array(z.object({
    source: z.string().min(1).max(120),
    target: z.string().min(1).max(120),
    type: z.string().max(60),
  })).max(300),
});
const LearningContentSchema = z.object({
  overview: z.string(),
  explanation: z.string(),
  whyItMatters: z.string(),
  prerequisites: z.array(z.string()),
  difficulty: DifficultySchema,
  estimatedMinutes: z.number(),
  learningObjectives: z.array(z.string()),
  concepts: z.array(z.string()),
  learningGuide: z.array(z.string()),
  examples: z.array(z.string()),
  commonMistakes: z.array(z.string()),
  subtopics: z.array(z.string()),
  activities: z.array(z.object({
    id: z.string(),
    type: z.enum(['Tutorial', 'Coding exercise', 'Quiz', 'Mini project', 'Reading assignment', 'Research task', 'Real-world case study']),
    title: z.string(),
    description: z.string(),
    objective: z.string(),
    difficulty: DifficultySchema,
    estimatedMinutes: z.number(),
    steps: z.array(z.string()),
    expectedOutput: z.string(),
    hint: z.string(),
  })),
  resources: z.array(z.object({
    title: z.string(),
    url: z.string(),
    description: z.string(),
  })),
  quiz: z.object({
    question: z.string(),
    options: z.array(z.string()).length(4),
    answerIndex: z.number().int().min(0).max(3),
    explanation: z.string(),
  }),
});
const ListingSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(500),
  category: z.string().trim().min(1).max(60),
  targetCareer: z.string().trim().min(1).max(80),
  difficulty: DifficultySchema,
  targetAudience: z.string().trim().min(1).max(100),
  visibility: z.enum(['public', 'unlisted', 'private']),
  data: RoadmapDataSchema,
  learningContent: z.record(z.string(), LearningContentSchema).optional(),
});
const PublishSchema = z.object({
  listing: ListingSchema,
  id: z.string().uuid().optional(),
  ownerToken: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
}).refine((value) => Boolean(value.id) === Boolean(value.ownerToken), {
  message: 'Roadmap ID and owner token must be provided together.',
});
const DeleteSchema = z.object({
  id: z.string().uuid(),
  ownerToken: z.string().regex(/^[a-f0-9]{64}$/i),
});

interface StoredRoadmap {
  roadmap: PublishedRoadmap;
  ownerTokenHash: string;
}

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return Redis.fromEnv();
}

function ownerTokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function checkWriteLimit(redis: Redis, request: Request): Promise<NextResponse | null> {
  if (process.env.NODE_ENV !== 'production' && process.env.DISABLE_RATE_LIMIT === 'true') return null;
  const forwardedFor = request.headers.get('x-forwarded-for');
  const clientId = forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '60 s'),
    prefix: '@upstash/ratelimit/community-roadmaps',
  });
  const { success, reset } = await limiter.limit(clientId);
  if (success) return null;
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return NextResponse.json(
    { message: `Too many publishing requests. Please try again in ${retryAfter} seconds.` },
    { status: 429, headers: { 'Retry-After': retryAfter.toString() } },
  );
}

async function readJson(request: Request): Promise<unknown> {
  const body = await request.text();
  if (body.length > 2 * 1024 * 1024) {
    throw new Error('Roadmap listings cannot exceed 2 MB.');
  }
  return JSON.parse(body);
}

function serviceUnavailable() {
  return NextResponse.json(
    { message: 'The shared roadmap library is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN on the server.' },
    { status: 503 },
  );
}

export async function GET(request: Request) {
  const redis = getRedis();
  if (!redis) return serviceUnavailable();

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const ownerToken = request.headers.get('X-Roadmap-Owner-Token');
    if (id) {
      if (!z.string().uuid().safeParse(id).success) {
        return NextResponse.json({ message: 'Invalid roadmap ID.' }, { status: 400 });
      }
      const owned = await redis.get<StoredRoadmap>(recordKey(id));
      if (!owned) return NextResponse.json({ message: 'Roadmap not found.' }, { status: 404 });
      if (ownerToken && /^[a-f0-9]{64}$/i.test(ownerToken) && owned.ownerTokenHash === ownerTokenHash(ownerToken)) {
        return NextResponse.json({ roadmap: owned.roadmap });
      }
      if (owned.roadmap.visibility !== 'private') return NextResponse.json({ roadmap: owned.roadmap });
      return NextResponse.json({ message: 'Roadmap not found.' }, { status: 404 });
    }
    if (ownerToken) {
      return NextResponse.json({ message: 'A roadmap ID is required for owner lookup.' }, { status: 400 });
    }

    const ids = await redis.zrange<string[]>(INDEX_KEY, 0, 199, { rev: true });
    const records = await Promise.all(ids.map((id) => redis.get<StoredRoadmap>(recordKey(id))));
    const roadmaps = records
      .map((record) => record?.roadmap)
      .filter((roadmap): roadmap is PublishedRoadmap => Boolean(roadmap && roadmap.visibility === 'public'));
    return NextResponse.json({ roadmaps });
  } catch (error) {
    console.error('Could not load shared roadmaps:', error);
    return NextResponse.json({ message: 'Could not load the shared roadmap library. Please try again.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const redis = getRedis();
  if (!redis) return serviceUnavailable();

  try {
    const rateLimitResponse = await checkWriteLimit(redis, request);
    if (rateLimitResponse) return rateLimitResponse;
  } catch (error) {
    console.error('Could not check community publish rate limit:', error);
    return NextResponse.json({ message: 'Could not verify publishing limits. Please retry.' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await readJson(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request body.';
    return NextResponse.json({ message }, { status: message.includes('2 MB') ? 413 : 400 });
  }
  const input = PublishSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json({ message: 'Invalid roadmap listing.' }, { status: 400 });
  }

  try {
    const { listing, id, ownerToken } = input.data;
    const roadmapId = id ?? randomUUID();
    const key = recordKey(roadmapId);
    const existing = await redis.get<StoredRoadmap>(key);
    if (existing && (!id || existing.ownerTokenHash !== ownerTokenHash(ownerToken!))) {
      return NextResponse.json({ message: 'This roadmap cannot be updated from this browser. Its private owner token may be missing.' }, { status: 403 });
    }

    const roadmap: PublishedRoadmap = {
      id: roadmapId,
      ...listing,
      publishedAt: existing?.roadmap.publishedAt ?? new Date().toISOString(),
      followCount: existing?.roadmap.followCount ?? 0,
      startedCount: existing?.roadmap.startedCount ?? 0,
      completedCount: existing?.roadmap.completedCount ?? 0,
    };
    const token = ownerToken ?? randomBytes(32).toString('hex');
    const record: StoredRoadmap = {
      roadmap,
      ownerTokenHash: existing?.ownerTokenHash ?? ownerTokenHash(token),
    };

    if (!existing) {
      const reserved = await redis.set(key, record, { nx: true });
      if (reserved !== 'OK') {
        return NextResponse.json({ message: 'Could not reserve a unique roadmap ID. Please retry.' }, { status: 409 });
      }
    } else {
      await redis.set(key, record);
    }
    await redis.zadd(INDEX_KEY, { score: Date.parse(roadmap.publishedAt), member: roadmapId });
    return NextResponse.json({ roadmap, ...(!ownerToken ? { ownerToken: token } : {}) }, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error('Could not publish shared roadmap:', error);
    return NextResponse.json({ message: 'Could not publish this roadmap. Your current roadmap remains unchanged.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const redis = getRedis();
  if (!redis) return serviceUnavailable();

  try {
    const rateLimitResponse = await checkWriteLimit(redis, request);
    if (rateLimitResponse) return rateLimitResponse;
  } catch (error) {
    console.error('Could not check community unpublish rate limit:', error);
    return NextResponse.json({ message: 'Could not verify publishing limits. Please retry.' }, { status: 503 });
  }

  const input = DeleteSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json({ message: 'Invalid unpublish request.' }, { status: 400 });
  }

  try {
    const { id, ownerToken } = input.data;
    const key = recordKey(id);
    const existing = await redis.get<StoredRoadmap>(key);
    if (!existing || existing.ownerTokenHash !== ownerTokenHash(ownerToken)) {
      return NextResponse.json({ message: 'This roadmap cannot be removed from this browser.' }, { status: 403 });
    }
    await redis.del(key);
    await redis.zrem(INDEX_KEY, id);
    return NextResponse.json({ removed: true });
  } catch (error) {
    console.error('Could not unpublish shared roadmap:', error);
    return NextResponse.json({ message: 'Could not remove this roadmap. Please try again.' }, { status: 500 });
  }
}
