import { RoadmapData } from '@/types/roadmap';
import { TopicProgress, TopicLearningContent } from '@/types/learning';

export interface PublishedRoadmap {
  id: string;
  title: string;
  description: string;
  category: string;
  targetCareer: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  targetAudience: string;
  visibility: 'public' | 'unlisted' | 'private';
  publishedAt: string;
  data: RoadmapData;
  learningContent?: Record<string, TopicLearningContent>;
  followCount: number;
  startedCount: number;
  completedCount: number;
}

export interface RoadmapLearningState {
  topics: Record<string, TopicProgress>;
  content: Record<string, TopicLearningContent>;
  started: boolean;
  completed: boolean;
}

const PUBLISHED_KEY = 'career-advisor:local-published-roadmaps';
const FOLLOWED_KEY = 'career-advisor:local-followed-roadmaps';
const OWNED_ROADMAPS_KEY = 'career-advisor:owned-community-roadmaps';
const CHANGE_EVENT = 'career-advisor:local-roadmaps-changed';
const LOCAL_ACTOR = 'this-browser';
const RECENT_ROADMAP_KEY = 'career-advisor:recent-roadmap';

export interface RecentRoadmap {
  jobTitle: string;
  data: RoadmapData;
}

export interface RoadmapOwnerCredentials {
  id: string;
  token: string;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch (error) {
    console.error(`Could not read local data for ${key}:`, error);
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch (error) {
    console.error(`Could not save local data for ${key}:`, error);
    throw new Error('This browser could not save the change. Check available storage.');
  }
}

export function getRoadmapStorageId(jobTitle: string, data: RoadmapData): string {
  const source = `${jobTitle.trim().toLowerCase()}|${data.nodes
    .map((node) => `${node.id}:${node.name}:${node.description}`)
    .join('|')}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function loadLearningState(roadmapId: string): RoadmapLearningState {
  return readJson(`career-advisor:learning:${roadmapId}`, {
    topics: {},
    content: {},
    started: false,
    completed: false,
  });
}

export function saveLearningState(roadmapId: string, state: RoadmapLearningState): void {
  writeJson(`career-advisor:learning:${roadmapId}`, state);
  const published = loadPublishedRoadmaps().find((item) => item.id === roadmapId);
  if (published && Object.keys(state.content).length > 0) {
    published.learningContent = state.content;
    savePublishedRoadmap(published);
  }
  if (state.started) recordLocalRoadmapStart(roadmapId);
  recordLocalRoadmapCompletion(roadmapId, state.completed);
}

export function loadRecentRoadmap(): RecentRoadmap | null {
  return readJson<RecentRoadmap | null>(RECENT_ROADMAP_KEY, null);
}

export function saveRecentRoadmap(roadmap: RecentRoadmap): void {
  writeJson(RECENT_ROADMAP_KEY, roadmap);
}

export function recordLocalRoadmapStart(roadmapId: string): void {
  const startedKey = `career-advisor:started:${roadmapId}:${LOCAL_ACTOR}`;
  if (window.localStorage.getItem(startedKey)) return;
  const published = loadPublishedRoadmaps().find((item) => item.id === roadmapId);
  if (!published) return;
  window.localStorage.setItem(startedKey, 'true');
  published.startedCount += 1;
  savePublishedRoadmap(published);
}

function recordLocalRoadmapCompletion(roadmapId: string, completed: boolean): void {
  const completedKey = `career-advisor:completed:${roadmapId}:${LOCAL_ACTOR}`;
  const hasCompleted = Boolean(window.localStorage.getItem(completedKey));
  if (completed === hasCompleted) return;
  const published = loadPublishedRoadmaps().find((item) => item.id === roadmapId);
  if (!published) return;
  if (completed) {
    window.localStorage.setItem(completedKey, 'true');
    published.completedCount += 1;
  } else {
    window.localStorage.removeItem(completedKey);
    published.completedCount = Math.max(0, published.completedCount - 1);
  }
  savePublishedRoadmap(published);
}

export function loadPublishedRoadmaps(): PublishedRoadmap[] {
  return readJson(PUBLISHED_KEY, []);
}

export function cacheSharedRoadmaps(roadmaps: PublishedRoadmap[]): void {
  try {
    const existing = loadPublishedRoadmaps();
    const sharedIds = new Set(roadmaps.map((roadmap) => roadmap.id));
    const localOnly = existing.filter((roadmap) => !sharedIds.has(roadmap.id));
    window.localStorage.setItem(PUBLISHED_KEY, JSON.stringify([...roadmaps, ...localOnly]));
  } catch (error) {
    console.error('Could not cache shared roadmaps locally:', error);
  }
}

export function loadRoadmapOwnerCredentials(sourceRoadmapId: string): RoadmapOwnerCredentials | null {
  const credentials = readJson<Record<string, RoadmapOwnerCredentials>>(OWNED_ROADMAPS_KEY, {});
  return credentials[sourceRoadmapId] ?? null;
}

export function saveRoadmapOwnerCredentials(sourceRoadmapId: string, credentials: RoadmapOwnerCredentials): void {
  const allCredentials = readJson<Record<string, RoadmapOwnerCredentials>>(OWNED_ROADMAPS_KEY, {});
  writeJson(OWNED_ROADMAPS_KEY, { ...allCredentials, [sourceRoadmapId]: credentials });
}

export function removeRoadmapOwnerCredentials(sourceRoadmapId: string): void {
  const allCredentials = readJson<Record<string, RoadmapOwnerCredentials>>(OWNED_ROADMAPS_KEY, {});
  delete allCredentials[sourceRoadmapId];
  writeJson(OWNED_ROADMAPS_KEY, allCredentials);
}

export function savePublishedRoadmap(roadmap: PublishedRoadmap): void {
  const roadmaps = loadPublishedRoadmaps();
  const existingIndex = roadmaps.findIndex((item) => item.id === roadmap.id);
  if (existingIndex === -1) {
    roadmaps.unshift(roadmap);
  } else {
    roadmaps[existingIndex] = roadmap;
  }
  writeJson(PUBLISHED_KEY, roadmaps);
}

export function unpublishRoadmap(roadmapId: string): void {
  writeJson(PUBLISHED_KEY, loadPublishedRoadmaps().filter((item) => item.id !== roadmapId));
}

export function loadFollowedRoadmapIds(): string[] {
  return readJson(FOLLOWED_KEY, []);
}

export function toggleFollowRoadmap(roadmapId: string): string[] {
  const followed = loadFollowedRoadmapIds();
  const nextFollowed = followed.includes(roadmapId)
    ? followed.filter((id) => id !== roadmapId)
    : [...followed, roadmapId];
  writeJson(FOLLOWED_KEY, nextFollowed);

  const roadmaps = loadPublishedRoadmaps();
  const roadmap = roadmaps.find((item) => item.id === roadmapId);
  if (roadmap) {
    roadmap.followCount = Math.max(0, roadmap.followCount + (nextFollowed.includes(roadmapId) ? 1 : -1));
    writeJson(PUBLISHED_KEY, roadmaps);
  }
  return nextFollowed;
}

export function subscribeToLocalRoadmaps(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}
