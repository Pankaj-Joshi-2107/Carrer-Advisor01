# Product Requirements Document (PRD): Career Advisor - AI-Powered Career Roadmap Generator

## 1. Overview

The Career Advisor is an AI-powered web application that generates detailed career roadmaps for various job titles. Using OpenRouter API to leverage AI models, the application creates visualizations of skills, technologies, and knowledge areas required for specific career paths.

## 2. Target Audience

- Job seekers looking to understand career requirements
- Professionals planning career transitions
- Students exploring potential career paths
- Career counselors and mentors
- Learning and development professionals

## 3. Technology Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| Frontend Framework | Next.js | React framework for building the UI |
| Styling | TailwindCSS | Utility-first CSS framework |
| AI Integration | OpenRouter API | Powers the roadmap generation engine |
| Visualization | ReactFlow | Career path diagrams |
| Validation | Zod | Schema validation and type safety |

## 4. Features

### 4.1 Core Features

1. **AI-Powered Roadmap Generation**
   - Generate detailed technical learning roadmaps for any job title
   - Structure data in hierarchical format with primary, secondary, tertiary importance levels
   - Color-code nodes based on importance level

2. **Roadmap Visualization**
   - Display career paths with connected nodes
   - Allow zooming, panning, and download as image
   - Show detailed descriptions below the title of the node

3. **Responsive Design**
   - Fully responsive interface for all devices
   - Adaptive visualization layout based on screen size

### 4.2 Additional Features

1. **Error Handling & Validation**
   - Form validation for user inputs
   - API error handling with user-friendly messages
   - Fallback mechanisms for unexpected AI responses

2. **Loading Animation**
   - Multi-stage loading animation during roadmap generation
   - Progress indicators with informative messages

## 5. User Stories

1. **As a user, I want to generate a career roadmap by entering a job title**
   - Enter job title in the search input
   - Click "Plan My Career" button
   - See loading animation while roadmap is being generated
   - View completed roadmap visualization

2. **As a user, I want to download the generated roadmap as an image**
   - Click on the "Download Roadmap" button
   - Download the roadmap as an image

3. **As a user, I want to use the application on any device**
   - Access the application on desktop, tablet, or mobile
   - Experience appropriate layouts for each device

## 6. UI Design

### 6.1 Home Page Layout

1. **Header**
   - Logo/Brand name ("Career Advisor")
   - Navigation links (GitHub, LinkedIn, About)

2. **Hero Section**
   - Headline: "Discover your career, plan your future"
   - Subheadline: "Create the roadmap you need to reach your professional goals with our AI-powered career planning tool."
   - Search input with "Plan My Career" button
   - Error message display area

3. **Features Section**
   - Three feature cards highlighting key capabilities:
     - Learning Paths
     - AI-Powered Skills Mapping
     - Industry-Specific Guidance

4. **Roadmap Visualization Section**
   - Diagram showing career roadmap (appears after generation)
   - Map of the roadmap
   - Download button
   - Zoom in and out buttons

5. **Footer**
   - Copyright information
   - Links to GitHub and LinkedIn

### 6.2 Visual Design Elements

- **Color Scheme**
  - Primary: Blue gradient (#3b82f6 to #4f46e5)
  - Node colors: Light blue (primary), Yellow (secondary), Light orange (tertiary)
  - Background: Light blue/indigo gradient
  - Text: Slate gray

- **Typography**
  - Headings: Bold, larger font sizes
  - Body text: Regular weight, readable size

- **UI Components**
  - Cards with subtle shadows and hover effects
  - Rounded corners on interface elements
  - Gradient text for emphasis

## 7. API Design

### 7.1 Roadmap Generation Endpoint

**Endpoint:** `/api/roadmap`  
**Method:** POST  
**Request Body:**
```json
{
  "jobTitle": "string"
}
```

**Response:**
```json
{
  "nodes": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "type": "primary | secondary | tertiary",
      "group": "string"
    }
  ],
  "links": [
    {
      "source": "string",
      "target": "string",
      "type": "string"
    }
  ]
}
```

### 7.2 OpenRouter AI Prompt

The key to the application is the prompt used with OpenRouter API:

Generate a detailed learning roadmap for a {jobTitle}. The response MUST be a valid JSON object with the following structure:

```
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
  ]
}
```

Requirements for the roadmap structure:
1. Create a hierarchical structure with main categories and their sub-components
2. Use appropriate node types to indicate importance:
   - primary: Very Important (light blue background)
   - secondary: Important (yellow background)
   - tertiary: Normal (light orange background)
3. Group related technologies and concepts together
4. Create meaningful connections between nodes

For example, for a DevOps role, the structure would include:
1. Learn programming languages:
   - Python (primary)
   - Golang (secondary)
   - JavaScript (tertiary)

2. Operating Systems:
   - Linux (primary)
   - Unix (secondary)
   - Windows (tertiary)

3. Networking:
   - TCP/IP (primary)
   - HTTP/HTTPS (primary)
   - DNS (primary)
   - Load Balancing (secondary)
   - Firewalls (secondary)
   - VPN (tertiary)

4. Version Control:
   - Git (primary)
   - GitHub/GitLab/Bitbucket (secondary)

5. Containerization and Orchestration:
   - Docker (primary)
   - Kubernetes (primary)
   - Container Registry (secondary)
   - Helm (secondary)
   - Mesos (tertiary)
   - NoMad (tertiary)
   - Docker Swarm (tertiary)

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
   - Prerequisites if any

## 8. Component Specifications

### 8.1 SearchInput Component

- Input field for job title
- Submit button labeled "Plan My Career"
- Error message display
- Loading state handling

### 8.2 LoadingAnimation Component

- Multi-stage animation showing progress
- Sequential loading messages:
  - "Analyzing your job title..."
  - "Identifying career paths for your role..."
  - "Creating roadmap structure..."
  - "Researching industry requirements..."
  - "Mapping essential skills and technologies..."
  - "Analyzing technology trends in your field..."
  - "Prioritizing learning objectives..."
  - "Finding optimal career progression..."
  - "Organizing your professional development plan..."
  - "Finalizing your personalized roadmap..."
- Progress bar visualization

### 8.3 RoadmapVisualizer Component

- Graph using ReactFlow
- Node styling based on importance level
- Pan and zoom controls
- Download button
- Map of the roadmap

## 9. Environment Setup

Create a `.env.local` file with the following variables:

```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_CHECK_MODEL=google/gemini-flash-1.5-8b
OPENROUTER_ROADMAP_MODEL=openai/o3-mini-high
```

## 10. Development Steps

1. **Project Setup**
   - Initialize Next.js project with TypeScript
   - Install dependencies (TailwindCSS, ReactFlow, Zod, Axios)
   - Configure environment variables

2. **Core Components**
   - Implement Header, SearchInput, and Features components
   - Create LoadingAnimation component
   - Build RoadmapVisualizer component

3. **API Integration**
   - Set up API route for roadmap generation
   - Implement OpenRouter API integration
   - Add response validation and error handling

4. **UI Refinement**
   - Add responsive styling
   - Implement animations
   - Add error states and loading indicators

5. **Testing**
   - Test across different devices
   - Verify API integration
   - Test with various job titles

## 11. Acceptance Criteria

### 11.1 Core Functionality Acceptance Criteria

1. **Roadmap Generation**
   - System MUST accept any job title input
   - System MUST generate a valid JSON response with nodes and links
   - System MUST handle API failures gracefully with user-friendly error messages
   - System MUST indicate loading state during roadmap generation
   - System MUST complete roadmap generation within 45 seconds

2. **Visualization**
   - System MUST display all nodes and connections from the API response
   - System MUST color-code nodes based on importance type (primary, secondary, tertiary)
   - System MUST support zooming and panning of the visualization
   - System MUST enable downloading the roadmap as an image
   - System MUST display descriptive text for each node
   - System MUST maintain node relationships in the visual representation

3. **Responsive Design**
   - System MUST function correctly on devices with screen widths from 320px to 1920px
   - System MUST adapt layout based on device screen size
   - System MUST support touch interactions on mobile devices
   - System MUST maintain readability of text at all screen sizes

### 11.2 Performance Acceptance Criteria

1. **Speed and Responsiveness**
   - Page initial load time MUST be under 3 seconds on broadband connections
   - UI interactions MUST respond within 100ms
   - Visualization rendering MUST complete within 2 seconds after data is received

2. **Browser Compatibility**
   - Application MUST function correctly on the latest versions of Chrome, Firefox, Safari, and Edge

### 11.3 User Experience Acceptance Criteria

1. **Usability**
   - Users MUST be able to complete roadmap generation without prior training
   - Error messages MUST be clear and suggest corrective actions
   - Loading states MUST provide feedback on progress
   - Interactive elements MUST have hover/focus states for accessibility

2. **Accessibility**
   - Application MUST achieve WCAG 2.1 AA compliance
   - All interactive elements MUST be keyboard accessible
   - Application MUST maintain proper contrast ratios for text readability
   - Application MUST work with screen readers

