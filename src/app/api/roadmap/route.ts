import { NextResponse } from 'next/server';
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { RoadmapData } from '@/types/roadmap';
import { JobTitleSchema } from '@/schemas/jobTitleSchema';
import { hasGeminiCredentials, requestGeminiCompletion } from '@/utils/gemini';
import { z } from 'zod';

const RequestSchema = z.object({
  jobTitle: JobTitleSchema,
  level: z.enum(['Beginner', 'Intermediate', 'Expert']).default('Beginner'),
});

const rateLimitRequestsPerMinute = parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || "10", 10);
const rateLimitEnabled = process.env.NODE_ENV === "production" || process.env.DISABLE_RATE_LIMIT !== "true";
const ratelimit = rateLimitEnabled
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(rateLimitRequestsPerMinute, "60 s"),
      analytics: true,
      prefix: "@upstash/ratelimit/roadmap",
    })
  : null;

export async function POST(request: Request) {
  try {
    if (ratelimit) {
      const identifier = "api/roadmap";
      const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

      if (!success) {
        const retryAfterSeconds = Math.ceil((reset - Date.now()) / 1000);
        return NextResponse.json(
          { message: `Too many requests. Please try again in ${retryAfterSeconds} seconds.` },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': reset.toString(),
            },
          },
        );
      }
    }

    const validationResult = RequestSchema.safeParse(await request.json());
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map((issue) => issue.message).join(', ');
      return NextResponse.json(
        { message: errorMessage },
        { status: 400 }
      );
    }

    const { jobTitle, level } = validationResult.data;

    if (!hasGeminiCredentials()) {
      return NextResponse.json(
        { message: 'Roadmap generation needs at least one Gemini API key and GEMINI_MODEL configured.' },
        { status: 503 },
      );
    }

    
    const { response } = await requestGeminiCompletion({
      method: 'POST',
      headers: {
                Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        'model': process.env.GEMINI_MODEL,
        'messages': [
          {
            'role': 'system',
            'content': `The user has identified as a ${level} learner. Adjust the difficulty and depth of the generated roadmap accordingly.
If Beginner: Include foundational steps, explain basic concepts, and recommend introductory resources.
If Intermediate: Skip basics, focus on advanced applications, complex projects, and niche specialization.
If Expert: Focus on leadership, architecture, teaching others, and cutting-edge research.
Ensure the roadmap sequence, node descriptions, and recommendations match the learner's selected level.

Analyze the requested job title for susceptibility to AI automation and economic instability.
If the risk is high, set 'riskLevel' to 'high' and provide a concise, helpful warning message in the 'warning' field suggesting alternative career pivots or hybrid skills.
If the risk is low or medium, set 'riskLevel' to 'low' or 'medium' and leave the warning field empty or null.
Base the risk assessment on the role requested, avoid overstating certainty, and ensure the generated roadmap's difficulty and depth match the identified risk and learner level.`,
          },
          {
            'role': 'user',
            'content': `Generate a detailed learning roadmap for a ${jobTitle}. The response MUST be a valid JSON object with the following structure:
            {
              "nodes": [
                {
                  "id": "string",
                  "name": "string (short title)",
                  "description": "string (concise explanation, max 300 chars)",
                  "type": "primary | secondary | tertiary",
                  "group": "string (group name)"
                }
              ],
              "links": [
                {
                  "source": "string (parent node id)",
                  "target": "string (child node id)",
                  "type": "string"
                }
              ],
              "riskLevel": "low | medium | high",
              "warning": "string or null"
            }

            Requirements for the roadmap structure:
            1. Create a hierarchical structure with main categories and their sub-components
            2. Use appropriate node types to indicate importance:
              - primary: Very Important (light blue background)
              - secondary: Important (yellow background)
              - tertiary: Normal (light orange background)
            3. Group related technologies and concepts together
            4. Create meaningful connections between nodes WITHIN each group.

            IMPORTANT: Consider both technical skills AND soft skills that are relevant to the ${jobTitle} role. Depending on the role, include appropriate soft skills such as:
            
            - Professional Communication Skills (if relevant to the role)
            - Professional Networking (for roles that require industry connections)
            - Interpersonal Skills (teamwork, leadership, etc. as appropriate)
            - Career Development aspects (if important for career progression in this field)

            Tools:
            Research and include ONLY the tools that are relevant and necessary for the ${jobTitle} role:
            - Commonly used in the ${jobTitle} industry
            - Essential for the specific role's daily tasks
            - Industry-standard tools for the position
            - Tools mentioned in job descriptions for ${jobTitle}
            - Technologies that give competitive advantage in the field

            The goal is to create a well-balanced roadmap that reflects ALL important aspects of the ${jobTitle} role, not just technical requirements. And include ONLY the tools that are truly essential for success in the ${jobTitle} position.

            IMPORTANT GUIDELINES FOR CLEAN VISUALIZATION:
            1. Organize nodes into clear, logical groups with distinct boundaries
            2. Keep connections simple - primarily connect nodes within the same group
            3. Avoid creating too many connections between nodes in different groups
            4. Structure the groups in a logical progression order (basics first, advanced topics later)
            5. Limit the number of nodes per group to 9 or fewer if possible
            6. Ensure each group has a clear, descriptive name
            7. Make sure node names are short and descriptive

            For example, for a DevOps role, the structure would include:
            1. Learn programming languages:
              - Python (primary)
              - Golang (secondary)
              - JavaScript (tertiary)
              - Ruby (tertiary)

            2. Server Administration:
              - Linux (primary)
              - Unix (secondary)
              - Windows (secondary)

            3. Network and Security:
              - TCP/IP Fundamentals (primary)
              - Protocols: DNS, HTTP/S, FTP, SSL (secondary)

            4. Servers:
              Web servers:
                - Apache (primary)
                - Nginx (primary)
                - Tomcat (secondary)
                - IIS (tertiary)
                - Jetty (tertiary)
              Caching:
                - Redis (primary)
                - Memcache (secondary)
              Database:
                NoSQL:
                  - MongoDB (primary)
                  - Cassandra (primary)
                  - AWS DynamoDB (primary)
                  - Google Datastore (secondary)
                SQL:
                  - Oracle DB (tertiary)
                  - MySQL/MariaDB (primary)
                  - PostgreSQL (primary)
                  - MS-SQL (secondary)

            5. Infrastructure as code:
              Configuration Management:
                - Ansible (primary)
                - Puppet (secondary)
                - Chef (secondary)
                - Salt Stack (secondary)
              Container:
                - Docker (primary)
                - rkt (secondary)
                - LXC (tertiary)
              Container Orchestrators:
                - Kubernetes (primary)
                - OpenShift (secondary)
                - NoMad (tertiary)
                - Docker Swarm (tertiary)
              Infrastructure Provisioning:
                - Terraform (primary)
                - AWS CloudFormation (secondary)
                - Azure template (tertiary)
                - Google Deployment Manager (tertiary)

            6. CI/CD:
              - Jenkins (primary)
              - TeamCity (secondary)
              - Circle CI (secondary)
              - Travis CI (secondary)
              - AWS Code Pipeline (secondary)
              - Google Cloudbuild (secondary)
              - GitLab CI (tertiary)
              - Bitbucket Pipeline (tertiary)
              - Github Action (tertiary)

            7. Monitoring and Logging:
              Monitoring:
                - Zabbix (primary)
                - Prometheus (primary)
                - Grafana (primary)
                - DataDog (secondary)
                - New Relic (secondary)
                - CheckMK (secondary)
              Logging:
                - ELK (primary)
                - Graylog (secondary)
                - Splunk (secondary)

            8. Clouds:
              - AWS (primary)
              - Azure (secondary)
              - GCP (secondary)
              - OpenStack (tertiary)
              - Alicloud (tertiary)
              - IBM Bluemix (tertiary)

            For the requested job title, create a similar structure with:
            1. Main categories relevant to the role
            2. Sub-categories where appropriate
            3. Technologies and concepts with proper importance levels
            4. Clear grouping and hierarchy
            5. Proper descriptions for each node that explain:
              - What it is
              - Why it's important
              - Key concepts to learn
              - Prerequisites if any`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      return NextResponse.json(
        { message: 'Failed to generate roadmap. Please try again later.' },
        { status: 500 }
      );
    }
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      return NextResponse.json(
        { message: 'Received invalid response format from AI service.' },
        { status: 500 }
      );
    }
    
    const content = data.choices[0].message.content;
    let roadmapData: RoadmapData;
    
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                        content.match(/```([\s\S]*?)```/) ||
                        content.match(/\{[\s\S]*\}/);
                        
      if (jsonMatch) {
        try {
          roadmapData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } catch (parseError) {
          console.error('Error parsing JSON from AI response:', parseError);
          return NextResponse.json(
            { message: 'Failed to parse roadmap data from AI response.' },
            { status: 500 }
          );
        }
      } else {
        roadmapData = {
          nodes: [{ id: '1', name: 'Start', description: 'Starting point' }],
          links: []
        };
        
        const paragraphs = content.split('\n\n');
        paragraphs.forEach((para: string, index: number) => {
          if (para.trim() && index > 0) {
            const nodeId = (index + 1).toString();
            roadmapData.nodes.push({
              id: nodeId,
              name: para.split('.')[0] || `Step ${index}`,
              description: para
            });
            
            roadmapData.links.push({
              source: index.toString(),
              target: nodeId,
              type: 'next-step'
            });
          }
        });
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
      roadmapData = {
        nodes: [
          { id: '1', name: 'Error', description: 'Failed to parse roadmap data' }
        ],
        links: []
      };
    }
    
    const riskLevel = ['low', 'medium', 'high'].includes(roadmapData.riskLevel ?? '')
      ? roadmapData.riskLevel
      : undefined;
    const warning = typeof roadmapData.warning === 'string'
      ? roadmapData.warning.trim().slice(0, 600) || null
      : null;

    return NextResponse.json({ ...roadmapData, riskLevel, warning });
  } catch (error) {
    console.error('Error in POST /api/roadmap:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
} 