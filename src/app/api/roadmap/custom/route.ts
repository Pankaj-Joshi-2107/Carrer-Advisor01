import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { z } from 'zod';
import { hasGeminiCredentials, requestGeminiCompletion } from '@/utils/gemini';

const rateLimitRequestsPerMinute = parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '10', 10);
const ratelimit = process.env.NODE_ENV === 'production' || process.env.DISABLE_RATE_LIMIT !== 'true'
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(rateLimitRequestsPerMinute, '60 s'),
      analytics: true,
      prefix: '@upstash/ratelimit/roadmap-custom',
    })
  : null;

const NodeSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(120),
  description: z.string().max(500),
  objective: z.string().max(500).optional(),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional(),
  estimatedHours: z.number().min(0).max(1000).optional(),
  subtopics: z.array(z.string().max(120)).max(20).optional(),
  projectPlan: z.string().max(10000).optional(),
});

const RequestSchema = z.object({
  action: z.enum(['review', 'topic', 'project']),
  roadmap: z.object({
    title: z.string().min(1).max(120),
    description: z.string().max(500),
    target: z.string().max(120),
    currentLevel: z.enum(['Beginner', 'Intermediate', 'Advanced']),
    targetLevel: z.string().max(120),
    availability: z.string().max(120),
    preferences: z.string().max(300),
  }),
  nodes: z.array(NodeSchema).max(100),
  edges: z.array(z.object({ source: z.string(), target: z.string() })).max(300),
  selectedNodeId: z.string().optional(),
});

const reviewSchema = z.object({
  overallAssessment: z.string(),
  learningSequence: z.string(),
  missingTopics: z.array(z.object({
    title: z.string(),
    description: z.string(),
    afterTopic: z.string().nullable(),
  })).max(12),
  duplicateTopics: z.array(z.string()),
  prerequisiteIssues: z.array(z.string()),
  connectionSuggestions: z.array(z.string()),
  topicImprovements: z.array(z.string()),
  projectRecommendations: z.array(z.string()),
  estimatedDurationFeedback: z.string(),
  finalRecommendation: z.string(),
});

function extractJson(content: string): unknown {
  const match = content.match(/```(?:json)?\s*([\s\S]*?)```/) ?? content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Gemini returned no JSON.');
  return JSON.parse(match[1] ?? match[0]);
}

export async function POST(request: Request) {
  try {
    if (ratelimit) {
      const { success, limit, remaining, reset } = await ratelimit.limit('api/roadmap/custom');
      if (!success) {
        const retryAfterSeconds = Math.ceil((reset - Date.now()) / 1000);
        return NextResponse.json(
          { message: `Too many AI requests. Please try again in ${retryAfterSeconds} seconds.` },
          {
            status: 429,
            headers: {
              'Retry-After': retryAfterSeconds.toString(),
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': reset.toString(),
            },
          },
        );
      }
    }

    const parsedInput = RequestSchema.safeParse(await request.json());
    if (!parsedInput.success) {
      return NextResponse.json({ message: 'Invalid custom roadmap request.' }, { status: 400 });
    }
    if (!hasGeminiCredentials()) {
      return NextResponse.json(
        { message: 'AI assistance requires at least one Gemini API key and GEMINI_MODEL.' },
        { status: 503 },
      );
    }

    const { action, roadmap, nodes, edges, selectedNodeId } = parsedInput.data;
    const selectedNode = nodes.find((node) => node.id === selectedNodeId);
    if (action !== 'review' && !selectedNode) {
      return NextResponse.json({ message: 'Select a topic before requesting AI assistance.' }, { status: 400 });
    }

    const instruction = action === 'review'
      ? `Review this learner-created roadmap. Return only JSON with keys overallAssessment, learningSequence, missingTopics (array of {title,description,afterTopic}), duplicateTopics (string array), prerequisiteIssues (string array), connectionSuggestions (string array), topicImprovements (string array), projectRecommendations (string array), estimatedDurationFeedback, finalRecommendation. Make cautious suggestions; never claim career outcomes are guaranteed. Do not rewrite or remove user content.`
      : action === 'topic'
        ? `Suggest improvements for this topic in the context of the full roadmap. Return only JSON with keys description, objective, difficulty (Beginner, Intermediate, Advanced), estimatedHours (number), subtopics (string array), activities (string array), projectIdeas (string array), prerequisites (string array).`
        : `Design a practical learning project associated with this roadmap topic. Return only JSON with keys title, shortDescription, problemStatement, learningObjectives (string array), prerequisites (string array), tools (string array), coreFeatures (string array), implementationPlan (string array), testingRequirements (string array), deliverables (string array), estimatedHours (number), evaluationCriteria (string array), completionChecklist (string array).`;

    const { response } = await requestGeminiCompletion({
      method: 'POST',
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: `${instruction}\n\nRoadmap context:\n${JSON.stringify({ roadmap, nodes, edges, selectedNode })}`,
        }],
        response_format: { type: 'json_object' },
        max_tokens: action === 'review' ? 3000 : 2200,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Gemini custom roadmap request failed:', response.status, detail.slice(0, 500));
      return NextResponse.json(
        { message: `AI assistance failed (${response.status}). Your custom roadmap draft is still saved.` },
        { status: 502 },
      );
    }

    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      console.error('Gemini returned no custom roadmap content.');
      return NextResponse.json({ message: 'AI returned an empty suggestion. Your draft is unchanged.' }, { status: 502 });
    }

    const output = extractJson(content);
    if (action === 'review') {
      return NextResponse.json(reviewSchema.parse(output));
    }
    if (!output || typeof output !== 'object' || Array.isArray(output)) {
      return NextResponse.json({ message: 'AI returned suggestions in an unexpected format.' }, { status: 502 });
    }
    return NextResponse.json(output);
  } catch (error) {
    console.error('Error in POST /api/roadmap/custom:', error);
    return NextResponse.json(
      { message: 'Could not complete AI assistance. Your custom roadmap draft is still saved.' },
      { status: 500 },
    );
  }
}
