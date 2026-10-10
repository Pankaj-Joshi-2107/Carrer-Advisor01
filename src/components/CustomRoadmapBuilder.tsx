'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  MiniMap,
  Node,
  OnConnect,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';
type BuilderAction = 'review' | 'topic' | 'project';

interface CustomTopic {
  id: string;
  name: string;
  description: string;
  objective: string;
  difficulty: Difficulty;
  estimatedHours: number;
  subtopics: string[];
  projectPlan: string;
}

interface RoadmapProperties {
  title: string;
  description: string;
  target: string;
  currentLevel: Difficulty;
  targetLevel: string;
  availability: string;
  preferences: string;
}

interface TopicNodeData extends Record<string, unknown> {
  label: string;
  topic: CustomTopic;
}

interface ReviewResult {
  overallAssessment: string;
  learningSequence: string;
  missingTopics: Array<{ title: string; description: string; afterTopic: string | null }>;
  duplicateTopics: string[];
  prerequisiteIssues: string[];
  connectionSuggestions: string[];
  topicImprovements: string[];
  projectRecommendations: string[];
  estimatedDurationFeedback: string;
  finalRecommendation: string;
}

const STORAGE_KEY = 'career-advisor:custom-roadmap-draft:v1';
const emptyProperties: RoadmapProperties = {
  title: 'My custom roadmap',
  description: '',
  target: '',
  currentLevel: 'Beginner',
  targetLevel: '',
  availability: '',
  preferences: '',
};

const emptyReview: ReviewResult = {
  overallAssessment: '',
  learningSequence: '',
  missingTopics: [],
  duplicateTopics: [],
  prerequisiteIssues: [],
  connectionSuggestions: [],
  topicImprovements: [],
  projectRecommendations: [],
  estimatedDurationFeedback: '',
  finalRecommendation: '',
};

function createTopic(name = 'New topic'): CustomTopic {
  return {
    id: crypto.randomUUID(),
    name,
    description: '',
    objective: '',
    difficulty: 'Beginner',
    estimatedHours: 1,
    subtopics: [],
    projectPlan: '',
  };
}

function createsCycle(edges: Edge[], source: string, target: string): boolean {
  if (source === target) return true;
  const pending = [target];
  const visited = new Set<string>();
  while (pending.length) {
    const current = pending.pop()!;
    if (current === source) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    edges.filter((edge) => edge.source === current).forEach((edge) => pending.push(edge.target));
  }
  return false;
}

function isReviewResult(value: unknown): value is ReviewResult {
  return Boolean(value && typeof value === 'object' && 'missingTopics' in value &&
    Array.isArray((value as ReviewResult).missingTopics));
}

export default function CustomRoadmapBuilder({ onClose }: { onClose: () => void }) {
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [properties, setProperties] = useState<RoadmapProperties>(emptyProperties);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<TopicNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const draft = JSON.parse(saved) as {
          properties: RoadmapProperties;
          nodes: Node<TopicNodeData>[];
          edges: Edge[];
        };
        setProperties({ ...emptyProperties, ...draft.properties });
        if (Array.isArray(draft.nodes)) setNodes(draft.nodes);
        if (Array.isArray(draft.edges)) setEdges(draft.edges);
      }
    } catch (error) {
      console.error('Could not load custom roadmap draft:', error);
      setDraftError('The saved custom roadmap draft could not be read.');
    } finally {
      setDraftLoaded(true);
    }
  }, [setEdges, setNodes]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<BuilderAction | null>(null);
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<number[]>([]);
  const [topicSuggestion, setTopicSuggestion] = useState<Record<string, unknown> | null>(null);
  const [projectSuggestion, setProjectSuggestion] = useState<Record<string, unknown> | null>(null);
  const [showReview, setShowReview] = useState(false);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const selectedTopic = selectedNode?.data.topic;

  useEffect(() => {
    if (!draftLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ properties, nodes, edges }));
      setDraftError(null);
    } catch (error) {
      console.error('Could not save custom roadmap draft:', error);
      setDraftError('Draft could not be saved in this browser. Export a backup or free storage space.');
    }
  }, [draftLoaded, edges, nodes, properties]);

  const addNode = useCallback((topic = createTopic(), position?: { x: number; y: number }) => {
    const node: Node<TopicNodeData> = {
      id: topic.id,
      type: 'default',
      position: position ?? { x: 100 + nodes.length * 30, y: 100 + nodes.length * 40 },
      data: { label: topic.name, topic },
    };
    setNodes((current) => [...current, node]);
    setSelectedNodeId(node.id);
  }, [nodes.length, setNodes]);

  const onConnect: OnConnect = useCallback((connection) => {
    if (!connection.source || !connection.target) return;
    if (createsCycle(edges, connection.source, connection.target)) {
      setActionError('That connection would create a circular prerequisite. Choose a different direction.');
      return;
    }
    setActionError(null);
    setEdges((current) => addEdge({
      ...connection,
      type: 'smoothstep',
      animated: true,
      label: 'prerequisite',
    }, current));
  }, [edges, setEdges]);

  const updateSelectedTopic = (patch: Partial<CustomTopic>) => {
    if (!selectedNodeId) return;
    setNodes((current) => current.map((node) => {
      if (node.id !== selectedNodeId) return node;
      const topic = { ...node.data.topic, ...patch };
      return { ...node, data: { label: topic.name, topic } };
    }));
  };

  const runAi = async (action: BuilderAction) => {
    if (action === 'review' && nodes.length === 0) {
      setActionError('Add at least one topic before asking AI to review the roadmap.');
      return;
    }
    if (action !== 'review' && !selectedNodeId) {
      setActionError('Select a topic first.');
      return;
    }
    setBusyAction(action);
    setActionError(null);
    try {
      const response = await fetch('/api/roadmap/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          roadmap: properties,
          nodes: nodes.map((node) => node.data.topic),
          edges: edges.map(({ source, target }) => ({ source, target })),
          selectedNodeId,
        }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = result && typeof result === 'object' && 'message' in result
          ? String(result.message)
          : 'AI request failed. Your draft has been preserved.';
        throw new Error(message);
      }
      if (action === 'review') {
        if (!isReviewResult(result)) throw new Error('AI returned an invalid review. Your draft has been preserved.');
        setReview(result);
        setSelectedSuggestions([]);
        setShowReview(true);
      } else if (result && typeof result === 'object' && !Array.isArray(result)) {
        if (action === 'topic') setTopicSuggestion(result as Record<string, unknown>);
        else setProjectSuggestion(result as Record<string, unknown>);
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'AI request failed. Your draft has been preserved.');
    } finally {
      setBusyAction(null);
    }
  };

  const applyTopicSuggestion = () => {
    if (!topicSuggestion) return;
    updateSelectedTopic({
      description: typeof topicSuggestion.description === 'string' ? topicSuggestion.description : selectedTopic?.description ?? '',
      objective: typeof topicSuggestion.objective === 'string' ? topicSuggestion.objective : selectedTopic?.objective ?? '',
      difficulty: ['Beginner', 'Intermediate', 'Advanced'].includes(String(topicSuggestion.difficulty))
        ? topicSuggestion.difficulty as Difficulty : selectedTopic?.difficulty ?? 'Beginner',
      estimatedHours: typeof topicSuggestion.estimatedHours === 'number'
        ? topicSuggestion.estimatedHours : selectedTopic?.estimatedHours ?? 1,
      subtopics: Array.isArray(topicSuggestion.subtopics)
        ? topicSuggestion.subtopics.filter((item): item is string => typeof item === 'string')
        : selectedTopic?.subtopics ?? [],
    });
    setTopicSuggestion(null);
  };

  const addSelectedSuggestions = () => {
    const suggestions = review?.missingTopics ?? [];
    const additions = selectedSuggestions.map((index) => suggestions[index]).filter(Boolean);
    const addedNodes = additions.map((suggestion, index) => {
      const topic = createTopic(suggestion.title);
      topic.description = suggestion.description;
      return {
        id: topic.id,
        type: 'default' as const,
        position: { x: 160 + index * 60, y: 120 + (nodes.length + index) * 45 },
        data: { label: topic.name, topic },
      };
    });
    const allNodes = [...nodes, ...addedNodes];
    const addedEdges: Edge[] = [];
    additions.forEach((suggestion, index) => {
      if (!suggestion.afterTopic) return;
      const prerequisite = allNodes.find((node) =>
        node.data.topic.name.toLocaleLowerCase() === suggestion.afterTopic?.toLocaleLowerCase());
      const dependent = addedNodes[index];
      if (!prerequisite || !dependent || createsCycle([...edges, ...addedEdges], prerequisite.id, dependent.id)) return;
      addedEdges.push({
        id: `${prerequisite.id}-${dependent.id}`,
        source: prerequisite.id,
        target: dependent.id,
        type: 'smoothstep',
        label: 'prerequisite',
      });
    });
    if (addedNodes.length) {
      setNodes((current) => [...current, ...addedNodes]);
      setEdges((current) => [...current, ...addedEdges]);
      setSelectedNodeId(addedNodes[addedNodes.length - 1].id);
    }
    if (addedEdges.length < additions.filter((suggestion) => suggestion.afterTopic).length) {
      setActionError('Some suggested prerequisite connections could not be matched or would create a cycle. You can connect those topics manually.');
    }
    setSelectedSuggestions([]);
    setShowReview(false);
  };

  const exportDraft = () => {
    const blob = new Blob([JSON.stringify({ properties, nodes, edges }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${properties.title.trim().replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'custom-roadmap'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importDraft = async (file?: File) => {
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== 'object' || !('properties' in parsed) || !('nodes' in parsed) || !('edges' in parsed)) {
        throw new Error('That file is not a custom roadmap backup.');
      }
      const draft = parsed as { properties: RoadmapProperties; nodes: Node<TopicNodeData>[]; edges: Edge[] };
      if (!Array.isArray(draft.nodes) || !Array.isArray(draft.edges)) throw new Error('The roadmap backup has invalid nodes or connections.');
      setProperties({ ...emptyProperties, ...draft.properties });
      setNodes(draft.nodes);
      setEdges(draft.edges);
      setSelectedNodeId(null);
      setActionError(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not import this roadmap backup.');
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-slate-50" role="dialog" aria-modal="true" aria-labelledby="custom-roadmap-title">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6">
        <div>
          <h2 id="custom-roadmap-title" className="text-xl font-bold text-slate-900">Custom roadmap builder</h2>
          <p className="text-xs text-slate-600">A directed connection means the source topic is a prerequisite.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => addNode()} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800">Add Node</button>
          <button type="button" onClick={() => void runAi('review')} disabled={busyAction !== null} className="rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-50">
            {busyAction === 'review' ? 'Reviewing…' : 'Review with AI'}
          </button>
          <button type="button" onClick={exportDraft} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Export</button>
          <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Import
            <input type="file" accept="application/json,.json" className="sr-only" onChange={(event) => { void importDraft(event.target.files?.[0]); event.target.value = ''; }} />
          </label>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" aria-label="Close custom roadmap builder">Close</button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_320px]">
        <aside className="max-h-60 overflow-y-auto border-b border-slate-200 bg-white p-4 lg:max-h-none lg:border-b-0 lg:border-r">
          <h3 className="font-semibold text-slate-900">Roadmap properties</h3>
          <div className="mt-3 space-y-3">
            <label className="block text-xs font-medium text-slate-700">Title<input value={properties.title} onChange={(event) => setProperties({ ...properties, title: event.target.value })} maxLength={120} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
            <label className="block text-xs font-medium text-slate-700">Description<textarea value={properties.description} onChange={(event) => setProperties({ ...properties, description: event.target.value })} maxLength={500} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
            <label className="block text-xs font-medium text-slate-700">Target skill or career<input value={properties.target} onChange={(event) => setProperties({ ...properties, target: event.target.value })} maxLength={120} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
            <label className="block text-xs font-medium text-slate-700">Current level<select value={properties.currentLevel} onChange={(event) => setProperties({ ...properties, currentLevel: event.target.value as Difficulty })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>
            <label className="block text-xs font-medium text-slate-700">Target outcome<input value={properties.targetLevel} onChange={(event) => setProperties({ ...properties, targetLevel: event.target.value })} maxLength={120} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
            <label className="block text-xs font-medium text-slate-700">Time available<input value={properties.availability} onChange={(event) => setProperties({ ...properties, availability: event.target.value })} placeholder="e.g. 5 hours/week" maxLength={120} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
            <label className="block text-xs font-medium text-slate-700">Learning preferences<input value={properties.preferences} onChange={(event) => setProperties({ ...properties, preferences: event.target.value })} placeholder="e.g. projects and practice" maxLength={300} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
          </div>
          <p className="mt-4 text-xs text-slate-500">{nodes.length} topics · {edges.length} prerequisites · Draft autosaves in this browser.</p>
          {draftError && <p className="mt-2 text-xs text-red-700" role="alert">{draftError}</p>}
          {actionError && <p className="mt-2 text-xs text-red-700" role="alert">{actionError}</p>}
        </aside>

        <section className="min-h-64 bg-slate-100 lg:min-h-0" aria-label="Custom roadmap canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_event, node) => { setSelectedNodeId(node.id); setTopicSuggestion(null); setProjectSuggestion(null); }}
            onPaneClick={() => setSelectedNodeId(null)}
            deleteKeyCode={['Backspace', 'Delete']}
            fitView
          >
            <Controls />
            <MiniMap pannable zoomable />
            <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
          </ReactFlow>
        </section>

        <aside className="max-h-72 overflow-y-auto border-t border-slate-200 bg-white p-4 lg:max-h-none lg:border-l lg:border-t-0">
          {selectedTopic ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-900">Topic details</h3>
                <button type="button" onClick={() => { if (window.confirm('Delete this topic and its connections?')) { setNodes((current) => current.filter((node) => node.id !== selectedNodeId)); setEdges((current) => current.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId)); setSelectedNodeId(null); } }} className="text-xs font-semibold text-red-700 hover:underline">Delete node</button>
              </div>
              <div className="mt-3 space-y-3">
                <label className="block text-xs font-medium text-slate-700">Topic title<input value={selectedTopic.name} onChange={(event) => updateSelectedTopic({ name: event.target.value.slice(0, 120) })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                <label className="block text-xs font-medium text-slate-700">Description<textarea value={selectedTopic.description} onChange={(event) => updateSelectedTopic({ description: event.target.value.slice(0, 500) })} rows={3} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                <label className="block text-xs font-medium text-slate-700">Learning objective<textarea value={selectedTopic.objective} onChange={(event) => updateSelectedTopic({ objective: event.target.value.slice(0, 500) })} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs font-medium text-slate-700">Difficulty<select value={selectedTopic.difficulty} onChange={(event) => updateSelectedTopic({ difficulty: event.target.value as Difficulty })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>
                  <label className="block text-xs font-medium text-slate-700">Hours<input type="number" min="0" max="1000" step="0.5" value={selectedTopic.estimatedHours} onChange={(event) => updateSelectedTopic({ estimatedHours: Number(event.target.value) || 0 })} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" /></label>
                </div>
                <p className="text-xs text-slate-500">Prerequisites: {edges.filter((edge) => edge.target === selectedNodeId).map((edge) => nodes.find((node) => node.id === edge.source)?.data.topic.name).filter(Boolean).join(', ') || 'none connected'}</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void runAi('topic')} disabled={busyAction !== null} className="rounded-lg border border-indigo-300 px-3 py-2 text-xs font-semibold text-indigo-800 hover:bg-indigo-50 disabled:opacity-50">{busyAction === 'topic' ? 'Generating…' : 'Generate Topic Details'}</button>
                  <button type="button" onClick={() => void runAi('project')} disabled={busyAction !== null} className="rounded-lg border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">{busyAction === 'project' ? 'Generating…' : 'Generate Project'}</button>
                </div>
                {topicSuggestion && (
                  <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-xs text-slate-800">
                    <p className="font-semibold">AI topic suggestions (review before applying)</p>
                    <p className="mt-2">{String(topicSuggestion.description ?? '')}</p>
                    <p className="mt-1"><strong>Objective:</strong> {String(topicSuggestion.objective ?? '')}</p>
                    <p className="mt-1"><strong>Subtopics:</strong> {Array.isArray(topicSuggestion.subtopics) ? topicSuggestion.subtopics.join(', ') : ''}</p>
                    <button type="button" onClick={applyTopicSuggestion} className="mt-3 rounded-md bg-indigo-700 px-3 py-2 font-semibold text-white">Apply selected topic details</button>
                  </div>
                )}
                {projectSuggestion && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-slate-800">
                    <p className="font-semibold">{String(projectSuggestion.title ?? 'AI project plan')}</p>
                    <p className="mt-1">{String(projectSuggestion.shortDescription ?? projectSuggestion.problemStatement ?? '')}</p>
                    <ol className="mt-2 list-decimal space-y-1 pl-4">{(Array.isArray(projectSuggestion.implementationPlan) ? projectSuggestion.implementationPlan : []).map((step, index) => <li key={index}>{String(step)}</li>)}</ol>
                    <button type="button" onClick={() => { updateSelectedTopic({ projectPlan: JSON.stringify(projectSuggestion, null, 2) }); setProjectSuggestion(null); }} className="mt-3 rounded-md bg-emerald-700 px-3 py-2 font-semibold text-white">Save project plan to topic</button>
                  </div>
                )}
                {selectedTopic.projectPlan && <details className="rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer text-sm font-semibold text-slate-800">Saved project plan</summary><label className="mt-2 block text-xs font-medium text-slate-700">Edit saved plan<textarea value={selectedTopic.projectPlan} onChange={(event) => updateSelectedTopic({ projectPlan: event.target.value })} rows={10} className="mt-1 w-full rounded-lg border border-slate-300 p-2 font-mono text-xs" /></label></details>}
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-600">
              <h3 className="font-semibold text-slate-900">Build your learning path</h3>
              <p className="mt-2">Add topics, drag them into position, then drag from one node’s handle to another to define prerequisites. Branches are supported; circular prerequisite loops are blocked.</p>
              <p className="mt-2">Select any topic to edit details or ask Gemini for suggestions. AI suggestions are shown for approval and never overwrite the draft automatically.</p>
            </div>
          )}
        </aside>
      </div>

      {showReview && review && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowReview(false); }}>
          <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7" role="dialog" aria-modal="true" aria-labelledby="custom-review-title">
            <h3 id="custom-review-title" className="text-xl font-bold text-slate-900">AI roadmap review</h3>
            <p className="mt-3 text-sm text-slate-700">{review.overallAssessment}</p>
            <p className="mt-2 text-sm text-slate-700"><strong>Learning sequence:</strong> {review.learningSequence}</p>
            <p className="mt-2 text-sm text-slate-700"><strong>Duration:</strong> {review.estimatedDurationFeedback}</p>
            <p className="mt-2 text-sm text-slate-700"><strong>Recommendation:</strong> {review.finalRecommendation}</p>
            {[
              ['Prerequisite issues', review.prerequisiteIssues],
              ['Connection suggestions', review.connectionSuggestions],
              ['Possible duplicates', review.duplicateTopics],
              ['Topic improvements', review.topicImprovements],
              ['Project ideas', review.projectRecommendations],
            ].map(([title, items]) => (
              <section key={String(title)} className="mt-4">
                <h4 className="text-sm font-semibold text-slate-900">{String(title)}</h4>
                {Array.isArray(items) && items.length ? <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">{items.map((item, index) => <li key={index}>{String(item)}</li>)}</ul> : <p className="mt-1 text-sm text-slate-500">None identified.</p>}
              </section>
            ))}
            <section className="mt-4">
              <h4 className="text-sm font-semibold text-slate-900">Suggested missing topics (optional)</h4>
              <div className="mt-2 space-y-2">
                {review.missingTopics.map((topic, index) => (
                  <label key={`${topic.title}-${index}`} className="flex gap-2 rounded-lg border border-slate-200 p-3 text-sm">
                    <input type="checkbox" checked={selectedSuggestions.includes(index)} onChange={(event) => setSelectedSuggestions((current) => event.target.checked ? [...current, index] : current.filter((item) => item !== index))} />
                    <span><strong>{topic.title}</strong><br />{topic.description}{topic.afterTopic && <span className="block text-xs text-slate-500">Suggested after: {topic.afterTopic}</span>}</span>
                  </label>
                ))}
                {!review.missingTopics.length && <p className="text-sm text-slate-500">No missing topics suggested.</p>}
              </div>
            </section>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setShowReview(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Close and edit manually</button>
              <button type="button" onClick={addSelectedSuggestions} disabled={!selectedSuggestions.length} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Add selected topic suggestions</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
