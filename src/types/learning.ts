export type ActivityType =
  | 'Tutorial'
  | 'Coding exercise'
  | 'Quiz'
  | 'Mini project'
  | 'Reading assignment'
  | 'Research task'
  | 'Real-world case study';

export interface LearningActivity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  objective: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedMinutes: number;
  steps: string[];
  expectedOutput: string;
  hint: string;
}

export interface TopicLearningContent {
  overview: string;
  explanation: string;
  whyItMatters: string;
  prerequisites: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedMinutes: number;
  learningObjectives: string[];
  concepts: string[];
  learningGuide: string[];
  examples: string[];
  commonMistakes: string[];
  subtopics: string[];
  resources: Array<{ title: string; url: string; description: string }>;
  activities: LearningActivity[];
  quiz: {
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string;
  };
}

export interface TopicProgress {
  started: boolean;
  completed: boolean;
  manuallyCompleted?: boolean;
  completedActivityIds: string[];
}
