# Career Advisor - AI-Powered Career Roadmap Generator

![Career Advisor - AI-Powered Career Roadmap Generator](public/homepage-hero.png)

<br />

A web application that creates personalized career development paths powered by AI. Users simply enter their target job titles to receive comprehensive visual learning roadmaps highlighting:

- Essential skills and competencies
- Relevant technologies and tools
- Key knowledge areas and concepts

Built with Next.js and ReactFlow, the application displays intuitive, color-coded skill hierarchies based on importance and proficiency levels required for career progression.

> **⚠️ Warning:** This application is currently in prototype stage. Users assume full responsibility when implementing in production environments. Before deployment, we recommend implementing security enhancements, performance optimization, and thorough testing. Roadmap accuracy can be further improved by refining AI prompts and selecting specialized models aligned with your specific industry requirements.

<br />

## 📑 Table of Contents

- [Features](#-features)
- [Built With](#️-built-with)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#-usage)
- [Configuration](#️-configuration)
  - [Gemini Models](#gemini-models)
  - [Rate Limiting](#rate-limiting)
- [Project Structure](#️-project-structure)
- [Troubleshooting](#-troubleshooting)
- [Deployment](#-deployment)

## ✨ Features

- AI-powered career roadmap generation for any job title
- Clear and easy-to-understand visualization
- Step-by-step skill hierarchy
- Color-coding based on skill importance
- Responsive design
- API rate limiting

## 🛠️ Built With

- [Next.js](https://nextjs.org/)
- [TailwindCSS](https://tailwindcss.com/)
- [ReactFlow](https://reactflow.dev/)
- [Google Gemini API](https://ai.google.dev/gemini-api/docs)
- [Upstash Redis](https://upstash.com/)
- [Zod](https://zod.dev/)

## 🚦 Getting Started

### Prerequisites
- Node.js (22.14.0, earlier versions were not included in the testing)
- npm or yarn
- [Google AI Studio](https://aistudio.google.com/) API key for Gemini access
- [Upstash](https://upstash.com/) account for rate limiting functionality

### Installation

1. First, clone the repository and install dependencies:

```bash
git clone <repository-url>
cd <project-directory>
npm install
```

2. Create your environment configuration by copying the example file:

```bash
cp .env.example .env.local
```

3. Update the environment variables in the `.env.local` file:

```bash
# Application URL (Used for metadata generation in the application)
NEXT_PUBLIC_URL=http://localhost:3000

# Gemini Configuration
# Get an API key from https://aistudio.google.com/app/apikey
GEMINI_API_KEY=<your-gemini-api-key>
# Use a Gemini model available to your Google AI Studio project
GEMINI_MODEL=gemini-3.8-flash

# Upstash Redis Configuration for shared public roadmaps and API rate limiting
# Create a Redis database at https://upstash.com/ and use the provided REST credentials
UPSTASH_REDIS_REST_URL=<your-upstash-redis-rest-url>
UPSTASH_REDIS_REST_TOKEN=<your-upstash-redis-rest-token>

# Rate Limiting Configuration
# Number of requests allowed per minute per IP
RATE_LIMIT_REQUESTS_PER_MINUTE=5
# For local development only; rate limiting remains enabled in production
DISABLE_RATE_LIMIT=true
```

4. Run the development server:

```bash
npm run dev
```

5. Navigate to `http://localhost:3000` to view the application.

## 📋 Usage

1. Open the application in your browser
2. Enter your target job or position title in the input field (e.g., "Software Developer", "Data Scientist")
3. Click "Plan My Career"
4. Wait briefly while the AI generates your personalized career roadmap
5. Examine your career roadmap in the visualization panel:
   - Blue boxes: Core skills and competencies (high priority)
   - Yellow boxes: Important skills (medium priority)
   - Orange boxes: Complementary skills (low priority)
6. Explore the details by zooming in and out of your roadmap
7. Optionally download your roadmap as an image for your career planning
8. Click a roadmap node to open its generated lesson, practice activities, and knowledge check
9. Mark topics and activities complete to track local learning progress
10. Choose **Create Custom Roadmap** to build an independent draft, connect prerequisites, and request AI review or topic/project suggestions. Custom drafts autosave in this browser and can be exported as JSON backups.

## ⚙️ Configuration

### Gemini Models
This application uses the Google Gemini API through Google AI Studio for both roadmap and lesson generation. Job titles and lesson inputs are validated before requests are sent.

#### Model Environment Variables
- `GEMINI_API_KEY`: A server-side API key created in Google AI Studio. Never expose it in client-side code.
- `GEMINI_MODEL`: A Gemini model ID enabled for your AI Studio project. The same model is used for roadmaps and topic lessons.
- `GEMINI_FALLBACK_MODELS` (optional): Up to five comma-separated Gemini model IDs tried in order if the primary model is rate-limited, unavailable, or returns a temporary server error. Use text-generation models enabled for your AI Studio project.

The recommended starting configuration is:

```
GEMINI_MODEL=gemini-3.8-flash
GEMINI_FALLBACK_MODELS=gemini-3.1-pro-preview,gemini-2.5-flash,gemini-2.5-flash-lite,gemini-2.5-pro,gemini-3.1-pro-preview-customtools
```

### Rate Limiting
The application includes rate limiting to prevent abuse. By default, it allows 5 requests per minute per IP address. You can adjust this by changing the `RATE_LIMIT_REQUESTS_PER_MINUTE` value in your `.env.local` file. For local development without Upstash Redis, set `DISABLE_RATE_LIMIT=true`; this setting is ignored in production.
Gemini API quotas and rate limits are managed by Google AI Studio. Requests try the primary model and then up to five configured fallback models for rate limits, unavailable models, and temporary provider errors. Check the project quota and model access if all configured models fail.

### Interactive Learning and Roadmap Library
- Selecting a roadmap node requests an AI-generated lesson with prerequisites, objectives, examples, resources, activities, and a knowledge check. Verify generated facts and links before relying on them.
- The custom roadmap builder is an independent local draft: add, edit, move, and connect nodes; self-links and circular prerequisites are blocked. AI review and topic/project suggestions are shown for approval and do not silently replace draft content. Drafts remain in this browser unless exported; this prototype does not sync drafts across devices.
- Topic/activity completion and the most recent generated roadmap are saved in browser local storage. Progress is kept separately for each generated roadmap in that browser.
- **Publish Roadmap** stores listings in the shared Upstash Redis database. Public listings appear in **Explore Roadmaps** for every visitor; unlisted and private listings are stored online but hidden from public browsing.
- A private owner token is stored in the publishing browser so its publisher can update or remove a listing without an account. Clearing that browser's site data loses owner access; do not share the token. Owner tokens are hashed before being stored in Redis.
- Follows and learning progress stay in the current browser and are not community analytics. Career-outcome statistics are not displayed because verified, consented records are not configured.
- To enable shared publishing on the deployed website, set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in the deployment's server-side environment settings. The same Upstash database can be used for rate limiting and shared listings. The API returns a configuration error rather than silently falling back to browser-only storage.

## 🏗️ Project Structure

```
career-advisor/
├── src/
│   ├── app/               # Next.js app router
│   │   ├── api/           # API routes for backend services
│   │   ├── page.tsx       # Main application page
│   │   └── layout.tsx     # Main application layout
│   ├── components/        # Reusable React components
│   ├── utils/             # Utility functions
│   ├── schemas/           # Zod validation schemas
│   └── types/             # TypeScript type definitions
├── public/                # Static assets
└── ...                    # Configuration files
```

## 🔧 Troubleshooting

### API Key Issues
- If you see "Failed to generate roadmap" errors, verify `GEMINI_API_KEY` and `GEMINI_MODEL` are correct
- Check your Google AI Studio project quota and model availability

### Rate Limiting
- "Too many requests" error indicates you've exceeded the rate limit
- Wait for the specified time or adjust the rate limit in your `.env.local` file
- If a lesson error says Gemini is rate-limiting requests, wait before retrying and check your Google AI Studio project quota and model limits.

### Model Errors
- If roadmaps are incomplete or poorly formatted, try using a more capable model
- Some models may produce better results for specific job titles
- For technical roles, models like `anthropic/claude-3-opus` tend to give more detailed technical roadmaps

### Loading Issues
- If the application gets stuck loading, check your network connection
- Gemini API response times can vary depending on service load and network latency
