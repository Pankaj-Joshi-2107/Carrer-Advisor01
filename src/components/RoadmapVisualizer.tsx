'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  ConnectionMode,
  Connection,
  useReactFlow,
  ReactFlowProvider,
  Panel,
  getNodesBounds,
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import GroupItem from './GroupItem';
import GroupHeaderNode from './GroupHeaderNode';
import { toPng } from 'html-to-image';
import { generateFlowData } from '../utils/roadmapData';
import { RoadmapData, RoadmapNode } from '../types/roadmap';
import { LearningActivity, TopicLearningContent, TopicProgress } from '../types/learning';
import TopicLearningPanel from './TopicLearningPanel';
import {
  getRoadmapStorageId,
  loadLearningState,
  RoadmapLearningState,
  saveLearningState,
} from '../utils/learningStore';
import PublishRoadmapDialog from './PublishRoadmapDialog';

interface RoadmapVisualizerProps {
  data: RoadmapData;
  careerTitle?: string;
}

const nodeTypes = {
  custom: GroupItem,
  groupHeader: GroupHeaderNode
} as const;

const emptyLearningState: RoadmapLearningState = {
  topics: {},
  content: {},
  started: false,
  completed: false,
};

function RoadmapVisualizerContent({ data, careerTitle = 'Career roadmap' }: RoadmapVisualizerProps) {
  const { getNodes, fitView: fitViewFunc, setViewport, getViewport, zoomTo } = useReactFlow();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [groups, setGroups] = useState<string[]>([]);
  const roadmapStorageId = getRoadmapStorageId(careerTitle, data);
  const [learningState, setLearningState] = useState<RoadmapLearningState>(emptyLearningState);
  const [loadedRoadmapId, setLoadedRoadmapId] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<RoadmapNode | null>(null);
  const [isTopicLoading, setIsTopicLoading] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);
  const [learningStorageError, setLearningStorageError] = useState<string | null>(null);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const loadingTopicIds = useRef(new Set<string>());
  
  const { nodes: initialNodes, edges: initialEdges } = generateFlowData(data);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    const savedState = loadLearningState(roadmapStorageId);
    setLearningState(savedState);
    setLoadedRoadmapId(roadmapStorageId);
  }, [roadmapStorageId]);

  useEffect(() => {
    if (loadedRoadmapId === roadmapStorageId) {
      try {
        saveLearningState(roadmapStorageId, learningState);
        setLearningStorageError(null);
      } catch (error) {
        console.error('Could not persist roadmap progress:', error);
        setLearningStorageError(error instanceof Error ? error.message : 'Could not save learning progress in this browser.');
      }
    }
  }, [learningState, loadedRoadmapId, roadmapStorageId]);

  useEffect(() => {
    setNodes((currentNodes) => currentNodes.map((node) => {
      if (node.type !== 'custom' || typeof node.data.topicId !== 'string') return node;
      const progress = learningState.topics[node.data.topicId];
      const topicStatus = progress?.completed ? 'Completed' : progress?.started ? 'In progress' : 'Not started';
      return node.data.topicStatus === topicStatus ? node : { ...node, data: { ...node.data, topicStatus } };
    }));
  }, [learningState.topics, setNodes]);

  useEffect(() => {
    const extractedGroups = nodes
      .filter(node => node.id.startsWith('group-'))
      .map(node => node.id.replace('group-', ''));
    setGroups(extractedGroups);
  }, [nodes]);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      const allNodes = getNodes();
      if (allNodes.length === 0) return;

      const topGroupNode = allNodes
        .filter(node => node.id.startsWith('group-'))
        .sort((a, b) => a.position.y - b.position.y)[0];

      if (topGroupNode) {
        setViewport(
          {
            x: -topGroupNode.position.x + 200,
            y: -topGroupNode.position.y + 50,
            zoom: 1
          },
          { duration: 800 }
        );
      } else {
        const topNode = [...allNodes].sort((a, b) => a.position.y - b.position.y)[0];
        if (topNode) {
          setViewport(
            {
              x: -topNode.position.x + 100,
              y: -topNode.position.y + 50,
              zoom: 1
            },
            { duration: 800 }
          );
        }
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [getNodes, setViewport]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const updateTopicProgress = useCallback((topicId: string, update: (current: TopicProgress) => TopicProgress) => {
    setLearningState((current) => {
      const currentTopic = current.topics[topicId] ?? {
        started: false,
        completed: false,
        completedActivityIds: [],
      };
      const nextTopic = update(currentTopic);
      const topics = { ...current.topics, [topicId]: nextTopic };
      const completedTopics = data.nodes.filter((topic) => topics[topic.id]?.completed).length;
      return {
        ...current,
        topics,
        started: current.started || nextTopic.started,
        completed: completedTopics === data.nodes.length && data.nodes.length > 0,
      };
    });
  }, [data.nodes]);

  const loadTopicLesson = useCallback(async (topic: RoadmapNode) => {
    setTopicError(null);
    const cachedContent = learningState.content[topic.id];
    if (cachedContent) return;
    if (loadingTopicIds.current.has(topic.id)) return;
    loadingTopicIds.current.add(topic.id);
    setIsTopicLoading(true);
    try {
      const relatedTopics = data.links
        .filter((link) => link.source === topic.id || link.target === topic.id)
        .map((link) => data.nodes.find((node) => node.id === (link.source === topic.id ? link.target : link.source))?.name)
        .filter((name): name is string => Boolean(name));
      const response = await fetch('/api/roadmap/topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: careerTitle,
          name: topic.name,
          description: topic.description,
          group: topic.group,
          relatedTopics,
        }),
      });
      const responseText = await response.text();
      let result: unknown;
      try {
        result = JSON.parse(responseText);
      } catch {
        const detail = responseText.trim();
        throw new Error(
          detail
            ? `The lesson service returned an unexpected response (${response.status}): ${detail.slice(0, 200)}`
            : `The lesson service returned an empty response (${response.status}). Please retry.`,
        );
      }
      if (!result || typeof result !== 'object' || Array.isArray(result)) {
        throw new Error('The lesson service returned an invalid response. Please retry.');
      }
      if (!response.ok) {
        const message = 'message' in result && typeof result.message === 'string'
          ? result.message
          : 'Could not load this lesson.';
        throw new Error(message);
      }
      const content = result as TopicLearningContent;
      setLearningState((current) => ({
        ...current,
        content: { ...current.content, [topic.id]: content },
      }));
    } catch (error) {
      setTopicError(error instanceof Error ? error.message : 'Could not load this lesson.');
    } finally {
      loadingTopicIds.current.delete(topic.id);
      setIsTopicLoading(false);
    }
  }, [careerTitle, data.links, data.nodes, learningState.content]);

  const handleTopicOpen = useCallback((topic: RoadmapNode) => {
    setSelectedTopic(topic);
    setTopicError(null);
    updateTopicProgress(topic.id, (progress) => ({ ...progress, started: true }));
    void loadTopicLesson(topic);
  }, [loadTopicLesson, updateTopicProgress]);

  const toggleActivityComplete = useCallback((topicId: string, activityId: string) => {
    updateTopicProgress(topicId, (progress) => {
      const completedActivityIds = progress.completedActivityIds.includes(activityId)
        ? progress.completedActivityIds.filter((id) => id !== activityId)
        : [...progress.completedActivityIds, activityId];
      const activities = learningState.content[topicId]?.activities ?? [];
      const activitiesComplete = activities.length > 0 && activities.every((activity: LearningActivity) => completedActivityIds.includes(activity.id));
      return {
        ...progress,
        started: true,
        completedActivityIds,
        completed: Boolean(progress.manuallyCompleted) || activitiesComplete,
      };
    });
  }, [learningState.content, updateTopicProgress]);

  const downloadImage = useCallback(() => {
    const flowElement = document.querySelector('.react-flow') as HTMLElement;
    if (!flowElement) return;

    const nodes = getNodes();
    if (nodes.length === 0) return;

    const padding = 40;
    const nodesBounds = getNodesBounds(nodes);
    
    const imageWidth = Math.round(nodesBounds.width) + padding * 2;
    const imageHeight = Math.round(nodesBounds.height) + padding * 2;

    const minimapElement = document.querySelector('.react-flow__minimap');
    const controlsElement = document.querySelector('.react-flow__controls');
    const panelElement = document.querySelectorAll('.react-flow__panel');
    const backgroundElement = document.querySelector('.react-flow__background');

    if (minimapElement) (minimapElement as HTMLElement).style.display = 'none';
    if (controlsElement) (controlsElement as HTMLElement).style.display = 'none';
    panelElement && Array.from(panelElement).forEach(element => 
      (element as HTMLElement).style.display = 'none'
    );
    if (backgroundElement) (backgroundElement as HTMLElement).style.opacity = '0'; 
    flowElement.style.backgroundColor = '#ffffff';

    const originalStyles = {
      width: flowElement.style.width,
      height: flowElement.style.height,
      minHeight: flowElement.style.minHeight,
      transform: flowElement.style.transform,
      backgroundColor: flowElement.style.backgroundColor,
    };

    flowElement.style.width = `${imageWidth}px`;
    flowElement.style.height = `${imageHeight}px`;
    flowElement.style.minHeight = `${imageHeight}px`; 

    const targetX = -nodesBounds.x + padding;
    const targetY = -nodesBounds.y + padding;
    const targetZoom = 1;

    const originalViewport = getViewport();

    setViewport({ x: targetX, y: targetY, zoom: targetZoom }, { duration: 0 });

    setTimeout(() => {
      toPng(flowElement, {
        backgroundColor: '#ffffff',
        width: imageWidth,
        height: imageHeight,
        pixelRatio: 2,
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${targetX/2}px, ${targetY/2}px) scale(${targetZoom})`, 
        }
      })
      .then((dataUrl) => {
        const a = document.createElement('a');
        a.setAttribute('download', 'roadmap.png');
        a.setAttribute('href', dataUrl);
        a.click();
      })
      .catch((error) => {
        console.error('Failed to download image:', error);
        alert('An error occurred while generating the image.');
      })
      .finally(() => {
        if (minimapElement) (minimapElement as HTMLElement).style.display = '';
        if (controlsElement) (controlsElement as HTMLElement).style.display = '';
        if (panelElement) Array.from(panelElement).forEach(element => 
          (element as HTMLElement).style.display = ''
        );
        if (backgroundElement) (backgroundElement as HTMLElement).style.opacity = '';

        flowElement.style.width = originalStyles.width;
        flowElement.style.height = originalStyles.height;
        flowElement.style.minHeight = originalStyles.minHeight;
        flowElement.style.transform = originalStyles.transform;
        flowElement.style.backgroundColor = originalStyles.backgroundColor;

        setViewport(originalViewport, { duration: 0 });
      });
    }, 150);
  }, [getNodes, setViewport, getViewport]);

  const filteredNodes = selectedGroup
    ? nodes.filter(node => 
        node.id.startsWith('group-') 
          ? node.id === `group-${selectedGroup}`
          : (node.data?.group === selectedGroup)
      )
    : nodes;

  const filteredEdges = selectedGroup
    ? edges.filter(edge => {
        const sourceNode = nodes.find(node => node.id === edge.source);
        const targetNode = nodes.find(node => node.id === edge.target);
        return (sourceNode?.data?.group === selectedGroup) && (targetNode?.data?.group === selectedGroup);
      })
    : edges;
  const completedTopicCount = data.nodes.filter((topic) => learningState.topics[topic.id]?.completed).length;
  const completedActivityCount = Object.values(learningState.topics)
    .reduce((total, progress) => total + progress.completedActivityIds.length, 0);
  const totalActivityCount = Object.values(learningState.content)
    .reduce((total, content) => total + content.activities.length, 0);
  const nextTopic = data.nodes.find((topic) => !learningState.topics[topic.id]?.completed);
  const selectedTopicProgress = selectedTopic
    ? learningState.topics[selectedTopic.id] ?? { started: false, completed: false, completedActivityIds: [] }
    : null;
  const selectedRelatedTopics = selectedTopic
    ? data.links
        .filter((link) => link.source === selectedTopic.id || link.target === selectedTopic.id)
        .map((link) => data.nodes.find((node) => node.id === (link.source === selectedTopic.id ? link.target : link.source))?.name)
        .filter((name): name is string => Boolean(name))
    : [];

  const handleGroupSelect = (group: string) => {
    if (selectedGroup === group) {
      setSelectedGroup(null);
    } else {
      setSelectedGroup(group);
      
      const groupNode = nodes.find(node => node.id === `group-${group}`);
      if (groupNode) {
        setTimeout(() => {
          setViewport({ 
            x: -groupNode.position.x + 200, 
            y: -groupNode.position.y + 100, 
            zoom: 1 
          }, { duration: 800 });
        }, 50);
      }
    }
  };

  const handleResetView = () => {
    setSelectedGroup(null);
    
    setTimeout(() => {
      const allNodes = getNodes();
      if (allNodes.length === 0) return;

      const topGroupNode = allNodes
        .filter(node => node.id.startsWith('group-'))
        .sort((a, b) => a.position.y - b.position.y)[0];

      if (topGroupNode) {
        setViewport(
          {
            x: -topGroupNode.position.x + 200,
            y: -topGroupNode.position.y + 50,
            zoom: 1
          },
          { duration: 800 }
        );
      }
    }, 50);
  };

  return (
    <div
      className="w-full h-full min-h-[800px] relative z-9"
      onClickCapture={(event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const nodeElement = target.closest<HTMLElement>('.react-flow__node-custom');
        const flowNode = nodeElement ? nodes.find((node) => node.id === nodeElement.dataset.id) : undefined;
        if (flowNode?.type !== 'custom' || typeof flowNode.data.topicId !== 'string') return;
        const topic = data.nodes.find((item) => item.id === flowNode.data.topicId);
        if (topic) handleTopicOpen(topic);
      }}
    >
      <div className="absolute right-20 top-4 z-50 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={downloadImage}
          className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-blue-800"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Roadmap
        </button>
        <button
          type="button"
          onClick={() => setShowPublishDialog(true)}
          className="rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-800 shadow-lg hover:bg-indigo-50"
        >
          Publish Roadmap
        </button>
      </div>
      <ReactFlow
        nodes={filteredNodes}
        edges={filteredEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_event, node) => {
          if (node.type !== 'custom' || typeof node.data.topicId !== 'string') return;
          const topic = data.nodes.find((item) => item.id === node.data.topicId);
          if (topic) handleTopicOpen(topic);
        }}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView={false}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        attributionPosition="bottom-left"
        nodesDraggable={false}
        nodesConnectable={false}
        zoomOnScroll={true}
        zoomOnPinch={true}
        panOnScroll={true}
        panOnDrag={true}
        selectionOnDrag={false}
        selectNodesOnDrag={false}
        elementsSelectable={false}
        style={{ background: '#ffffff' }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.2}
        maxZoom={2}
      >
        <Controls />
        <MiniMap 
          nodeStrokeColor={(n) => {
            if (n.type === 'custom') {
              return n.data.type === 'primary' 
                ? '#1D4ED8' 
                : n.data.type === 'secondary' 
                  ? '#D97706' 
                  : '#EA580C';
            }
            return '#000';
          }}
          nodeColor={(n) => {
            if (n.type === 'custom') {
              return n.data.type === 'primary' 
                ? '#DBEAFE' 
                : n.data.type === 'secondary' 
                  ? '#FEF08A' 
                  : '#FFEDD5';
            }
            return '#fff';
          }}
        />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        
        <Panel position="center-right" className="bg-white p-3 rounded-lg shadow-md border border-gray-200 hidden lg:block">
          <div className="flex flex-col gap-2 items-start">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Filter by Group</h3>
            <div className="flex flex-wrap gap-2 max-w-xs">
              {groups.map((group) => (
                <button
                  key={group}
                  onClick={() => handleGroupSelect(group)}
                  className={`text-xs px-2 py-1 rounded-full font-medium transition-all ${
                    selectedGroup === group
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {group.replaceAll('_', ' ')}
                </button>
              ))}
              {selectedGroup && (
                <button
                  onClick={handleResetView}
                  className="text-xs px-2 py-1 rounded-full font-medium bg-gray-700 text-white hover:bg-gray-800 transition-all"
                >
                  Reset View
                </button>
              )}
            </div>
          </div>
        </Panel>

        </ReactFlow>

      <div className="absolute left-4 top-[150px] z-10 hidden max-w-[220px] rounded-lg border border-slate-200 bg-white/95 p-3 shadow-md lg:block">
        <h3 className="text-sm font-semibold text-slate-800">Learning progress</h3>
        <p className="mt-1 text-xs text-slate-600">Topics: {completedTopicCount}/{data.nodes.length} complete</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${data.nodes.length ? completedTopicCount / data.nodes.length * 100 : 0}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-600">
          {totalActivityCount ? `Activities in loaded lessons: ${completedActivityCount}/${totalActivityCount} complete` : 'Open a topic to load activities.'}
        </p>
        {nextTopic && <p className="mt-2 text-xs text-blue-800"><strong>Next:</strong> {nextTopic.name}</p>}
      </div>

      {selectedTopic && selectedTopicProgress && (
        <TopicLearningPanel
          topic={selectedTopic}
          careerTitle={careerTitle}
          relatedTopics={selectedRelatedTopics}
          progress={selectedTopicProgress}
          storageError={learningStorageError}
          content={learningState.content[selectedTopic.id] ?? null}
          loading={isTopicLoading}
          error={topicError}
          onClose={() => setSelectedTopic(null)}
          onRetry={() => void loadTopicLesson(selectedTopic)}
          onMarkTopicComplete={() => updateTopicProgress(selectedTopic.id, (progress) => ({
            ...progress,
            started: true,
            manuallyCompleted: !progress.manuallyCompleted,
            completed: !progress.manuallyCompleted || (
              (learningState.content[selectedTopic.id]?.activities ?? []).length > 0 &&
              (learningState.content[selectedTopic.id]?.activities ?? []).every((activity) =>
                progress.completedActivityIds.includes(activity.id),
              )
            ),
          }))}
          onToggleActivityComplete={(activityId) => toggleActivityComplete(selectedTopic.id, activityId)}
          onOpenActivity={() => updateTopicProgress(selectedTopic.id, (progress) => ({ ...progress, started: true }))}
        />
      )}
      {showPublishDialog && (
        <PublishRoadmapDialog
          roadmapId={roadmapStorageId}
          title={careerTitle}
          data={data}
          onClose={() => setShowPublishDialog(false)}
        />
      )}

      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-md border border-gray-200 hidden lg:block">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Priority Level</h3>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-200 border border-blue-300" />
            <span className="text-xs text-gray-600">Very Important</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-200 border border-yellow-300" />
            <span className="text-xs text-gray-600">Important</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-100 border border-orange-200" />
            <span className="text-xs text-gray-600">Normal</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RoadmapVisualizer(props: RoadmapVisualizerProps) {
  return (
    <ReactFlowProvider>
      <RoadmapVisualizerContent {...props} />
    </ReactFlowProvider>
  );
} 