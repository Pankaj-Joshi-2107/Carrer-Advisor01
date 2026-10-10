'use client';

import { useState, useCallback, useEffect } from 'react';
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
import { RoadmapData } from '../types/roadmap';

interface RoadmapVisualizerProps {
  data: RoadmapData;
}

const nodeTypes = {
  custom: GroupItem,
  groupHeader: GroupHeaderNode
} as const;

function RoadmapVisualizerContent({ data }: RoadmapVisualizerProps) {
  const { getNodes, fitView: fitViewFunc, setViewport, getViewport, zoomTo } = useReactFlow();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [groups, setGroups] = useState<string[]>([]);
  
  const { nodes: initialNodes, edges: initialEdges } = generateFlowData(data);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

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
    <div className="w-full h-[800px] relative z-9">
      <ReactFlow
        nodes={filteredNodes}
        edges={filteredEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
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

        <Panel position="bottom-right">
          <button 
            onClick={downloadImage}
            className="bg-gradient-to-r from-blue-600 to-blue-700 
              hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg 
              shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all 
              duration-200 font-semibold flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Roadmap
          </button>
        </Panel>
      </ReactFlow>

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