'use client';

import { FormEvent, useEffect, useState } from 'react';
import { RoadmapData } from '@/types/roadmap';
import { PublishedRoadmap, loadLearningState, loadPublishedRoadmaps, loadRoadmapOwnerCredentials, removeRoadmapOwnerCredentials, savePublishedRoadmap, saveRoadmapOwnerCredentials, unpublishRoadmap } from '@/utils/learningStore';

interface PublishRoadmapDialogProps {
  roadmapId: string;
  title: string;
  data: RoadmapData;
  onClose: () => void;
}

export default function PublishRoadmapDialog({ roadmapId, title: defaultTitle, data, onClose }: PublishRoadmapDialogProps) {
  const [title, setTitle] = useState(`${defaultTitle} Roadmap`);
  const [description, setDescription] = useState(`A learning roadmap for ${defaultTitle}.`);
  const [category, setCategory] = useState('Career development');
  const [targetCareer, setTargetCareer] = useState(defaultTitle);
  const [difficulty, setDifficulty] = useState<PublishedRoadmap['difficulty']>('Beginner');
  const [targetAudience, setTargetAudience] = useState('');
  const [visibility, setVisibility] = useState<PublishedRoadmap['visibility']>('public');
  const [showPreview, setShowPreview] = useState(false);
  const [hasPreviewed, setHasPreviewed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingRoadmap, setExistingRoadmap] = useState(() => {
    const credentials = loadRoadmapOwnerCredentials(roadmapId);
    return loadPublishedRoadmaps().find((roadmap) => roadmap.id === credentials?.id) ??
      loadPublishedRoadmaps().find((roadmap) => roadmap.id === roadmapId);
  });

  useEffect(() => {
    let active = true;
    const credentials = loadRoadmapOwnerCredentials(roadmapId);
    if (credentials && existingRoadmap?.id !== credentials.id) {
      void fetch(`/api/community/roadmaps?id=${encodeURIComponent(credentials.id)}`, {
        headers: { 'X-Roadmap-Owner-Token': credentials.token },
      })
        .then(async (response) => {
          const result: unknown = await response.json();
          if (!response.ok) {
            const message = result && typeof result === 'object' && 'message' in result
              ? String(result.message)
              : 'Could not load your shared roadmap listing.';
            throw new Error(message);
          }
          if (active && result && typeof result === 'object' && 'roadmap' in result) {
            const roadmap = result.roadmap as PublishedRoadmap;
            setExistingRoadmap(roadmap);
            savePublishedRoadmap(roadmap);
          }
        })
        .catch((loadError: unknown) => {
          if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load your shared roadmap listing.');
        });
    }
    return () => { active = false; };
  }, [existingRoadmap?.id, roadmapId]);

  useEffect(() => {
    if (!existingRoadmap) return;
    setTitle(existingRoadmap.title);
    setDescription(existingRoadmap.description);
    setCategory(existingRoadmap.category);
    setTargetCareer(existingRoadmap.targetCareer);
    setDifficulty(existingRoadmap.difficulty);
    setTargetAudience(existingRoadmap.targetAudience);
    setVisibility(existingRoadmap.visibility);
  }, [existingRoadmap]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!hasPreviewed) {
      setError('Preview the listing before saving it.');
      return;
    }
    setBusy(true);
    const existingCredentials = loadRoadmapOwnerCredentials(roadmapId);
    const credentials = existingCredentials ?? {
      id: crypto.randomUUID(),
      token: Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join(''),
    };
    try {
      if (!existingCredentials) saveRoadmapOwnerCredentials(roadmapId, credentials);
      const listing = {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        targetCareer: targetCareer.trim(),
        difficulty,
        targetAudience: targetAudience.trim(),
        visibility,
        data,
        learningContent: loadLearningState(roadmapId).content,
      };
      const response = await fetch('/api/community/roadmaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: credentials.id, ownerToken: credentials.token, listing }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = result && typeof result === 'object' && 'message' in result
          ? String(result.message)
          : 'Could not publish this roadmap.';
        throw new Error(message);
      }
      if (!result || typeof result !== 'object' || !('roadmap' in result)) {
        throw new Error('The publishing service returned an invalid response.');
      }
      const published = result.roadmap as PublishedRoadmap;
      savePublishedRoadmap(published);
      if (roadmapId !== published.id) unpublishRoadmap(roadmapId);
      setExistingRoadmap(published);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not publish this roadmap.');
      if (!existingCredentials) removeRoadmapOwnerCredentials(roadmapId);
    } finally {
      setBusy(false);
    }
  };

  const handleUnpublish = async () => {
    const credentials = loadRoadmapOwnerCredentials(roadmapId);
    if (!credentials) {
      unpublishRoadmap(roadmapId);
      setExistingRoadmap(undefined);
      setSaved(false);
      onClose();
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/community/roadmaps', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = result && typeof result === 'object' && 'message' in result
          ? String(result.message)
          : 'Could not remove this shared roadmap.';
        throw new Error(message);
      }
      unpublishRoadmap(credentials.id);
      unpublishRoadmap(roadmapId);
      removeRoadmapOwnerCredentials(roadmapId);
      setExistingRoadmap(undefined);
      setSaved(false);
      onClose();
    } catch (unpublishError) {
      setError(unpublishError instanceof Error ? unpublishError.message : 'Could not remove the shared listing.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="publish-roadmap-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="publish-roadmap-title" className="text-2xl font-bold text-slate-900">Publish roadmap</h2>
            <p className="mt-1 text-sm text-slate-600">Prepare the roadmap listing and preview the details.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close publishing form">✕</button>
        </div>

        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
          Public listings are stored in the shared online library. A private owner key saved in this browser lets you update or remove your listing; clearing browser storage means you lose that management access.
        </div>

        {saved && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{visibility === 'public' ? 'Published to the shared roadmap library.' : `Saved online as ${visibility}; it is not shown in public Explore.`}</p>}
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}

        {showPreview ? (
          <div className="mt-5 rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Listing preview</p>
            <h3 className="mt-2 text-xl font-bold text-slate-900">{title || 'Untitled roadmap'}</h3>
            <p className="mt-2 text-sm text-slate-600">{description || 'No description yet.'}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-slate-500">Category</dt><dd className="font-medium text-slate-800">{category}</dd></div>
              <div><dt className="text-slate-500">Target career</dt><dd className="font-medium text-slate-800">{targetCareer || 'Not specified'}</dd></div>
              <div><dt className="text-slate-500">Difficulty</dt><dd className="font-medium text-slate-800">{difficulty}</dd></div>
              <div><dt className="text-slate-500">Target audience</dt><dd className="font-medium text-slate-800">{targetAudience || 'Not specified'}</dd></div>
              <div><dt className="text-slate-500">Topics</dt><dd className="font-medium text-slate-800">{data.nodes.length}</dd></div>
              <div><dt className="text-slate-500">Visibility choice</dt><dd className="font-medium capitalize text-slate-800">{visibility}</dd></div>
            </dl>
            <p className="mt-4 text-xs text-slate-500">{visibility === 'public' ? 'This roadmap will appear in the public Explore library.' : `This roadmap will be stored online but hidden from public Explore while marked ${visibility}.`}</p>
            <div className="mt-5 flex flex-wrap justify-between gap-3">
              {existingRoadmap && <button type="button" disabled={busy} onClick={() => void handleUnpublish()} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Unpublish</button>}
              <div className="ml-auto flex gap-3">
                <button type="button" onClick={() => { setShowPreview(false); setHasPreviewed(false); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Edit details</button>
                <button type="button" onClick={() => setShowPreview(false)} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">Continue</button>
              </div>
            </div>
          </div>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={handleSave}>
            <label className="block text-sm font-medium text-slate-700">
              Roadmap title
              <input required maxLength={100} value={title} onChange={(event) => { setTitle(event.target.value); setSaved(false); setHasPreviewed(false); }} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Description
              <textarea required maxLength={500} rows={3} value={description} onChange={(event) => { setDescription(event.target.value); setSaved(false); setHasPreviewed(false); }} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Category
              <input required maxLength={60} value={category} onChange={(event) => { setCategory(event.target.value); setSaved(false); setHasPreviewed(false); }} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Target career
              <input required maxLength={80} value={targetCareer} onChange={(event) => { setTargetCareer(event.target.value); setSaved(false); setHasPreviewed(false); }} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Difficulty
                <select value={difficulty} onChange={(event) => { setDifficulty(event.target.value as PublishedRoadmap['difficulty']); setSaved(false); setHasPreviewed(false); }} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                  <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Target audience
                <input required maxLength={100} value={targetAudience} onChange={(event) => { setTargetAudience(event.target.value); setSaved(false); setHasPreviewed(false); }} placeholder="e.g. Career changers" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </label>
            </div>
            <fieldset>
              <legend className="text-sm font-medium text-slate-700">Visibility</legend>
              <div className="mt-2 flex flex-wrap gap-4">
                {(['public', 'unlisted', 'private'] as const).map((option) => (
                  <label key={option} className="flex items-center gap-2 text-sm capitalize text-slate-700">
                    <input type="radio" name="visibility" checked={visibility === option} onChange={() => { setVisibility(option); setSaved(false); setHasPreviewed(false); }} />{option}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
              {existingRoadmap && <button type="button" disabled={busy} onClick={() => void handleUnpublish()} className="mr-auto rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Unpublish</button>}
              <button type="button" onClick={() => { setError(null); setShowPreview(true); setHasPreviewed(true); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Preview</button>
              <button type="submit" disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{busy ? 'Publishing…' : existingRoadmap ? 'Update shared listing' : 'Publish online'}</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
