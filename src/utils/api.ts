import axios from 'axios';

interface RoadmapResponse {
  nodes: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  links: Array<{
    source: string;
    target: string;
    type: string;
  }>;
}

export async function fetchRoadmap(jobTitle: string): Promise<RoadmapResponse> {
  try {
    const response = await axios.post<RoadmapResponse>('/api/roadmap', { jobTitle });
    return response.data;
  } catch (error) {
    console.error('Error fetching roadmap:', error);
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error('Failed to generate roadmap. Please try again later.');
  }
} 