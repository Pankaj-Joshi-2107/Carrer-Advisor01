'use client';

import { useEffect, useMemo, useState } from 'react';
import { PublishedRoadmap, cacheSharedRoadmaps, loadFollowedRoadmapIds, loadLearningState, recordLocalRoadmapStart, subscribeToLocalRoadmaps, toggleFollowRoadmap } from '@/utils/learningStore';

interface CommunityRoadmapsProps {
  onOpenRoadmap: (roadmap: PublishedRoadmap) => void;
}

type SortMode = 'recent' | 'title';
type DurationFilter = 'any' | 'under-five' | 'five-to-twenty' | 'over-twenty';

function estimateMinutes(roadmap: PublishedRoadmap): number {
  const cachedContent = loadLearningState(roadmap.id).content;
  const content = Object.keys(cachedContent).length ? cachedContent : roadmap.learningContent ?? {};
  return Object.values(content)
    .flatMap((topic) => topic.activities)
    .reduce((total, activity) => total + activity.estimatedMinutes, 0);
}

function formatDuration(minutes: number): string {
  if (minutes === 0) return 'Not estimated yet';
  if (minutes < 60) return `About ${minutes} min`;
  return `About ${Math.round(minutes / 60)} hours`;
}

export default function CommunityRoadmaps({ onOpenRoadmap }: CommunityRoadmapsProps) {
  const [roadmaps, setRoadmaps] = useState<PublishedRoadmap[]>([]);
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  const [view, setView] = useState<'explore' | 'following'>('explore');
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState('all');
  const [duration, setDuration] = useState<DurationFilter>('any');
  const [sort, setSort] = useState<SortMode>('recent');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      setFollowedIds(loadFollowedRoadmapIds());
      setLoading(true);
      try {
        const response = await fetch('/api/community/roadmaps');
        const result: unknown = await response.json();
        if (!response.ok) {
          const message = result && typeof result === 'object' && 'message' in result
            ? String(result.message)
            : 'Could not load the shared roadmap library.';
          throw new Error(message);
        }
        if (!result || typeof result !== 'object' || !('roadmaps' in result) || !Array.isArray(result.roadmaps)) {
          throw new Error('The shared roadmap service returned an invalid response.');
        }
        const sharedRoadmaps = result.roadmaps as PublishedRoadmap[];
        if (!active) return;
        setRoadmaps(sharedRoadmaps);
        setLoadError(null);
        cacheSharedRoadmaps(sharedRoadmaps);
      } catch (error) {
        if (!active) return;
        console.error('Could not load the shared roadmap library:', error);
        setLoadError(error instanceof Error ? error.message : 'Could not load the shared roadmap library.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void refresh();
    const unsubscribe = subscribeToLocalRoadmaps(() => { void refresh(); });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [refreshKey]);

  const visibleRoadmaps = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = roadmaps.filter((roadmap) => {
      if (view === 'following' && !followedIds.includes(roadmap.id)) return false;
      if (view === 'explore' && roadmap.visibility !== 'public') return false;
      if (difficulty !== 'all' && roadmap.difficulty !== difficulty) return false;
      const searchText = [
        roadmap.title,
        roadmap.description,
        roadmap.category,
        roadmap.targetCareer,
        roadmap.targetAudience,
        ...roadmap.data.nodes.map((node) => `${node.name} ${node.group ?? ''}`),
      ].join(' ').toLowerCase();
      if (normalizedQuery && !searchText.includes(normalizedQuery)) return false;

      const minutes = estimateMinutes(roadmap);
      if (duration === 'under-five' && (!minutes || minutes >= 300)) return false;
      if (duration === 'five-to-twenty' && (minutes < 300 || minutes >= 1200)) return false;
      if (duration === 'over-twenty' && minutes < 1200) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      if (sort === 'title') return a.targetCareer.localeCompare(b.targetCareer);
      return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
    });
  }, [difficulty, duration, followedIds, query, roadmaps, sort, view]);

  const handleFollow = (roadmapId: string) => {
    try {
      setFollowedIds(toggleFollowRoadmap(roadmapId));
    } catch (error) {
      console.error('Could not update followed roadmaps:', error);
    }
  };

  const handleOpen = (roadmap: PublishedRoadmap) => {
    recordLocalRoadmapStart(roadmap.id);
    onOpenRoadmap(roadmap);
  };

  return (
    <section className="my-16 rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm sm:p-8" aria-labelledby="explore-roadmaps-title">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">Learning library</p>
          <h2 id="explore-roadmaps-title" className="mt-2 text-3xl font-bold text-slate-900">Explore Roadmaps</h2>
          <p className="mt-2 max-w-2xl text-slate-600">Browse public roadmaps shared by learners or return to the roadmaps you follow in this browser.</p>
        </div>
        <div className="flex gap-2" role="tablist" aria-label="Roadmap library view">
          <button type="button" role="tab" aria-selected={view === 'explore'} onClick={() => setView('explore')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${view === 'explore' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'}`}>Explore</button>
          <button type="button" role="tab" aria-selected={view === 'following'} onClick={() => setView('following')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${view === 'following' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'}`}>Following ({followedIds.length})</button>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
        Public roadmap listings are shared online. Follows and learning progress remain private to this browser. No career placement statistics are shown because verified, consented outcome data is not configured.
      </div>
      {loadError && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{loadError}</p>}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">
          Search careers, skills, topics
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. data analysis, communication" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Difficulty
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
            <option value="all">All levels</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Known activity time
          <select value={duration} onChange={(event) => setDuration(event.target.value as DurationFilter)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
            <option value="any">Any duration</option><option value="under-five">Under 5 hours</option><option value="five-to-twenty">5–20 hours</option><option value="over-twenty">Over 20 hours</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-1">
          Sort by
          <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
            <option value="recent">Recently published</option><option value="title">Career A–Z</option>
          </select>
        </label>
      </div>

      {visibleRoadmaps.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
          <h3 className="text-lg font-semibold text-slate-800">{loading ? 'Loading shared roadmaps…' : loadError ? 'Roadmap library unavailable' : view === 'following' ? 'No followed roadmaps yet' : 'No public roadmaps yet'}</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
            {loading
              ? 'Fetching public listings from the shared roadmap library.'
              : loadError
                ? 'Check the shared database configuration and try again.'
                : view === 'following'
              ? 'Save a roadmap with the Publish Roadmap control, then follow it here.'
              : 'Generate a roadmap and publish it publicly to share it with other learners.'}
          </p>
          {loadError && <button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Try again</button>}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {visibleRoadmaps.map((roadmap) => {
            const followed = followedIds.includes(roadmap.id);
            const minutes = estimateMinutes(roadmap);
            return (
              <article key={roadmap.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{roadmap.category}</p>
                    <h3 className="mt-1 text-xl font-bold text-slate-900">{roadmap.title}</h3>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{roadmap.difficulty}</span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-slate-600">{roadmap.description}</p>
                <dl className="mt-4 grid grid-cols-2 gap-y-3 text-sm">
                  <div><dt className="text-xs text-slate-500">Target career</dt><dd className="font-medium text-slate-800">{roadmap.targetCareer}</dd></div>
                  <div><dt className="text-xs text-slate-500">Audience</dt><dd className="font-medium text-slate-800">{roadmap.targetAudience}</dd></div>
                  <div><dt className="text-xs text-slate-500">Topics</dt><dd className="font-medium text-slate-800">{roadmap.data.nodes.length}</dd></div>
                  <div><dt className="text-xs text-slate-500">Known activity time</dt><dd className="font-medium text-slate-800">{formatDuration(minutes)}</dd></div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
                  <span>{followed ? 'Followed in this browser' : 'Not followed here'}</span>
                  <span>Published {new Date(roadmap.publishedAt).toLocaleDateString()}</span>
                </div>
                <div className="mt-4 flex gap-3">
                  <button type="button" onClick={() => handleOpen(roadmap)} className="flex-1 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">View roadmap</button>
                  <button type="button" onClick={() => handleFollow(roadmap.id)} className="rounded-lg border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-50">{followed ? 'Following · Unfollow' : 'Follow'}</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
