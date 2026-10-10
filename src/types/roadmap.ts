export interface RoadmapNode {
  id: string;
  name: string;
  description: string;
  type?: 'primary' | 'secondary' | 'tertiary';
  group?: string;
}

export interface RoadmapLink {
  source: string;
  target: string;
  type: string;
}

export interface RoadmapData {
  nodes: Array<{
    id: string;
    name: string;
    description: string;
    type?: 'primary' | 'secondary' | 'tertiary';
    group?: string;
  }>;
  links: Array<{
    source: string;
    target: string;
    type: string;
  }>;
} 