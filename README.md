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
  - [OpenRouter Models](#openrouter-models)
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
- [OpenRouter API](https://openrouter.ai/)
- [Upstash Redis](https://upstash.com/)
- [Zod](https://zod.dev/)

## 🚦 Getting Started

### Prerequisites
- Node.js (22.14.0, earlier versions were not included in the testing)
- npm or yarn
- [OpenRouter](https://openrouter.ai/) account for AI model access
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

# OpenRouter Configuration
# Get your API key from https://openrouter.ai/keys
OPENROUTER_API_KEY=<your-openrouter-api-key>
# Recommended model: google/gemini-2.0-flash-lite-001
# See https://openrouter.ai/models for available models
OPENROUTER_CHECK_MODEL=<your-openrouter-check-model>
OPENROUTER_ROADMAP_MODEL=<your-openrouter-roadmap-model>

# Upstash Redis Configuration for Rate Limiting
# Create a Redis database at https://upstash.com/ and use the provided REST credentials
UPSTASH_REDIS_REST_URL=<your-upstash-redis-rest-url>
UPSTASH_REDIS_REST_TOKEN=<your-upstash-redis-rest-token>

# Rate Limiting Configuration
# Number of requests allowed per minute per IP
RATE_LIMIT_REQUESTS_PER_MINUTE=5
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

## ⚙️ Configuration

### OpenRouter Models
This application uses OpenRouter to access various AI models. Different models will provide varying quality results:

- `google/gemini-2.0-flash-lite-001` - Recommended for cost-effectiveness and good quality roadmaps
- `openai/o3-mini-high` - Higher quality results with more nuanced roadmaps
- `anthropic/claude-3-opus` - Premium option for the most detailed and comprehensive roadmaps

You can change the model by updating the `OPENROUTER_CHECK_MODEL` and `OPENROUTER_ROADMAP_MODEL` environment variables in your `.env.local` file.

#### Model Environment Variables
- `OPENROUTER_CHECK_MODEL`: This model is used to validate job titles. It receives a simple prompt asking if the entered text is a valid job title and expects a yes/no response. Since this is a simple classification task, you can use faster and more cost-effective models here.

- `OPENROUTER_ROADMAP_MODEL`: This model generates the comprehensive career roadmap content. It receives a complex prompt requesting detailed skill hierarchies in a specific JSON format. This task benefits from more capable models with strong reasoning and structuring abilities.

For both variables, you can use the same model or different ones depending on your needs and budget. The recommended starting configuration is:

```
OPENROUTER_CHECK_MODEL=google/gemini-flash-1.5-8b
OPENROUTER_ROADMAP_MODEL=google/gemini-2.0-flash-lite-001
```

For higher quality results, especially for specialized or technical roles, consider:

```
OPENROUTER_CHECK_MODEL=google/gemini-2.0-flash-lite-001
OPENROUTER_ROADMAP_MODEL=anthropic/claude-3-opus
```

### Rate Limiting
The application includes rate limiting to prevent abuse. By default, it allows 5 requests per minute per IP address. You can adjust this by changing the `RATE_LIMIT_REQUESTS_PER_MINUTE` value in your `.env.local` file.

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
- If you see "Failed to generate roadmap" errors, verify your OpenRouter API key is valid
- Ensure you have sufficient credits in your OpenRouter account

### Rate Limiting
- "Too many requests" error indicates you've exceeded the rate limit
- Wait for the specified time or adjust the rate limit in your `.env.local` file

### Model Errors
- If roadmaps are incomplete or poorly formatted, try using a more capable model
- Some models may produce better results for specific job titles
- For technical roles, models like `anthropic/claude-3-opus` tend to give more detailed technical roadmaps

### Loading Issues
- If the application gets stuck loading, check your network connection
- OpenRouter API response times can vary significantly (from a few seconds to longer periods) depending on the latency of the AI provider selected
