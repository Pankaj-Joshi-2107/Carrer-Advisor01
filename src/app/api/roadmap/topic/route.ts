import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { TopicLearningContent } from '@/types/learning';
import { hasGeminiCredentials, requestGeminiCompletion } from '@/utils/gemini';

const rateLimitEnabled = process.env.NODE_ENV === 'production' || process.env.DISABLE_RATE_LIMIT !== 'true';
const ratelimit = rateLimitEnabled
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(
        Number.parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '5', 10),
        '60 s',
      ),
      analytics: true,
      prefix: '@upstash/ratelimit/roadmap-topic',
    })
  : null;

const TopicRequestSchema = z.object({
  jobTitle: z.string().min(3).max(50),
  name: z.string().min(1).max(120),
  description: z.string().max(500),
  group: z.string().max(120).optional(),
  relatedTopics: z.array(z.string().max(120)).max(20).default([]),
});

function removeTrailingCommas(value: string): string {
  let result = '';
  let inString = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (inString) {
      result += character;
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      result += character;
      continue;
    }
    if (character === ',') {
      let next = index + 1;
      while (/\s/.test(value[next] ?? '')) next += 1;
      if (value[next] === '}' || value[next] === ']') continue;
    }
    result += character;
  }
  return result;
}

function parseModelJson(content: string): TopicLearningContent {
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i) ?? content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('The AI response did not contain JSON.');
  }

  const json = removeTrailingCommas((jsonMatch[1] ?? jsonMatch[0]).replace(/^\uFEFF/, ''));
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('The AI response must be a JSON object.');
  }
  const toDisplayString = (value: unknown): unknown => {
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(toDisplayString).join(', ');
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => {
        const label = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase());
        const text = toDisplayString(item);
        return typeof text === 'string' ? `${label}: ${text}` : '';
      })
      .filter(Boolean)
      .join('. ');
  };
  const stringValue = z.preprocess(
    toDisplayString,
    z.string(),
  );
  const stringList = (min = 0, max = 50) => z.preprocess(
    (value) => Array.isArray(value) ? value : typeof value === 'string' ? [value] : value,
    z.array(stringValue).min(min).max(max),
  );
  const fourOptionList = z.preprocess(
    (value) => Array.isArray(value) ? value : typeof value === 'string' ? [value] : value,
    z.array(stringValue).length(4),
  );
  const activitySchema = z.object({
    id: z.union([z.string(), z.number()]).transform(String),
    type: z.enum([
      'Tutorial',
      'Coding exercise',
      'Quiz',
      'Mini project',
      'Reading assignment',
      'Research task',
      'Real-world case study',
    ]),
    title: stringValue,
    description: stringValue,
    objective: stringValue,
    difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
    estimatedMinutes: z.coerce.number().int().min(5).max(600),
    steps: stringList(1, 20),
    expectedOutput: stringValue,
    hint: stringValue,
  });
  const activities: z.infer<typeof activitySchema>[] = [];
  if (Array.isArray(parsed.activities)) {
    parsed.activities.forEach((activity: unknown, index: number) => {
      const withStableId = activity && typeof activity === 'object' && !Array.isArray(activity)
        ? { ...activity, id: (activity as Record<string, unknown>).id ?? `activity-${index + 1}` }
        : activity;
      const result = activitySchema.safeParse(withStableId);
      if (result.success) activities.push(result.data);
    });
  }
  if (activities.length < 2) {
    throw new Error('The AI response did not include at least two complete activities.');
  }

  const resourceSchema = z.object({
    title: stringValue,
    url: stringValue,
    description: stringValue,
  });
  const result = z.object({
    overview: z.string(),
    explanation: z.string(),
    whyItMatters: z.string(),
    prerequisites: stringList(0, 20),
    difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
    estimatedMinutes: z.coerce.number().int().min(15).max(10000),
    learningObjectives: stringList(1, 20),
    concepts: stringList(1, 30),
    learningGuide: stringList(1, 20),
    examples: stringList(1, 20),
    commonMistakes: stringList(1, 20),
    subtopics: stringList(0, 20),
    activities: z.array(activitySchema).min(2).max(5),
    resources: z.array(resourceSchema).min(1).max(10),
    quiz: z.object({
      question: z.string(),
      options: fourOptionList,
      answerIndex: z.coerce.number().int().min(0).max(3),
      explanation: z.string(),
    }),
  }).parse({ ...parsed, activities });

  const resources = result.resources.map((resource) => {
    try {
      const url = new URL(resource.url);
      if (url.protocol === 'https:') return resource;
    } catch {
      // Fall back to a real search URL when the model returns a malformed link.
    }
    return {
      ...resource,
      url: `https://www.google.com/search?q=${encodeURIComponent(`${resource.title} ${result.overview}`)}`,
    };
  });

  return { ...result, resources };
}

export async function POST(request: Request) {
  try {
    if (ratelimit) {
      const { success, reset } = await ratelimit.limit('api/roadmap/topic');
      if (!success) {
        const retryAfterSeconds = Math.ceil((reset - Date.now()) / 1000);
        return NextResponse.json(
          { message: `Too many lesson requests. Please try again in ${retryAfterSeconds} seconds.` },
          { status: 429, headers: { 'Retry-After': retryAfterSeconds.toString() } },
        );
      }
    }

    const input = TopicRequestSchema.safeParse(await request.json());
    if (!input.success) {
      return NextResponse.json({ message: 'Invalid topic request.' }, { status: 400 });
    }
    if (!hasGeminiCredentials()) {
      return NextResponse.json(
        { message: 'Topic lessons need at least one Gemini API key and GEMINI_MODEL configured.' },
        { status: 503 },
      );
    }

    const { jobTitle, name, description, group, relatedTopics } = input.data;
    const { response, model } = await requestGeminiCompletion({
      method: 'POST',
      headers: {
                Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GEMINI_MODEL,
        max_tokens: 8192,
        messages: [{
          role: 'user',
          content: `Create a practical, accurate learning lesson as a single JSON object for a learner pursuing ${jobTitle}.
Topic: ${name}
Existing roadmap description: ${description}
Category: ${group ?? 'General'}
Related topics: ${relatedTopics.join(', ') || 'none provided'}

Return one syntactically valid JSON object only (no markdown fences or commentary). Use string values for every item in learningObjectives, concepts, learningGuide, examples, commonMistakes, prerequisites, and subtopics; do not return objects in those arrays. Escape quotes and line breaks correctly in JSON strings. Return keys overview, explanation, whyItMatters, prerequisites (array of strings), difficulty (Beginner, Intermediate, Advanced), estimatedMinutes (integer), learningObjectives (array of strings), concepts (array of strings), learningGuide (ordered array of strings), examples (array of strings), commonMistakes (array of strings), subtopics (array of strings), resources (array of {title,url,description}), activities (2-4 array items), quiz ({question,options: exactly 4 strings,answerIndex: 0-3,explanation}).
Each activity must include id, type (one of Tutorial, Coding exercise, Quiz, Mini project, Reading assignment, Research task, Real-world case study), title, description, objective, difficulty (Beginner, Intermediate, Advanced), estimatedMinutes (5-600), steps (array), expectedOutput, and hint.
Give specific, useful instructions grounded in the actual topic. Prefer authoritative documentation and reputable freely accessible resources; never invent URLs. If no reliable direct URL is known, use a reputable search URL for that topic. Do not claim a learner completed anything. Keep the lesson concise but substantive: 3-5 objectives, 4-8 concepts, 3-6 guide steps, 2-4 examples, 2-4 common mistakes, and exactly 2 fully specified activities. Use string IDs for activities, numeric durations and quiz answerIndex, and return all requested fields.`,
        }],
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Gemini topic lesson request failed after model fallback:', {
        model,
        status: response.status,
        detail: detail.slice(0, 500),
      });
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const retryAfterSeconds = retryAfter && /^\d+$/.test(retryAfter)
          ? Number(retryAfter)
          : null;
        const message = retryAfterSeconds
          ? `Gemini is rate-limiting lesson requests. Please wait ${retryAfterSeconds} seconds before retrying. If this continues, check your Google AI Studio quota and model limits.`
          : 'Gemini is rate-limiting lesson requests. Please wait a minute before retrying. If this continues, check your Google AI Studio quota and model limits.';
        return NextResponse.json(
          { message },
          {
            status: 429,
            ...(retryAfter ? { headers: { 'Retry-After': retryAfter } } : {}),
          },
        );
      }
      return NextResponse.json(
        { message: `The learning lesson service returned an error (${response.status}). Please try again.` },
        { status: 502 },
      );
    }

    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      console.error('Gemini returned no topic lesson content:', {
        model: payload.model,
        finishReason: payload.choices?.[0]?.finish_reason,
      });
      return NextResponse.json({ message: 'The AI service returned an empty lesson.' }, { status: 502 });
    }

    try {
      return NextResponse.json(parseModelJson(content));
    } catch (error) {
      const finishReason = payload.choices?.[0]?.finish_reason;
      console.error('Could not validate AI topic lesson:', {
        error,
        model: payload.model,
        finishReason,
      });
      if (finishReason === 'length') {
        return NextResponse.json(
          { message: 'Gemini cut off the lesson before it was complete. Please retry; your roadmap progress is unchanged.' },
          { status: 502 },
        );
      }
      return NextResponse.json(
        { message: 'Gemini returned an incomplete or invalid lesson format. Please retry; your roadmap progress is unchanged.' },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error('Error in POST /api/roadmap/topic:', error);
    return NextResponse.json(
      { message: 'Could not load the topic lesson. Check your connection and try again.' },
      { status: 500 },
    );
  }
}
