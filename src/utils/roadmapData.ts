import { Node, Edge, Position } from '@xyflow/react';
import { RoadmapData } from '../types/roadmap';

export function generateFlowData(data: RoadmapData): { nodes: Node[], edges: Edge[] } {
  const initialNodes: Node[] = [];
  const initialEdges: Edge[] = [];
  
  const nodeIds = new Set<string>();
  const nodeIdMap: Record<string, string> = {};
  
  data.nodes.forEach(node => {
    if (nodeIds.has(node.id)) {
      const uniqueId = `${node.id}_${Math.random().toString(36).substring(2, 7)}`;
      nodeIdMap[node.id] = uniqueId;
    } else {
      nodeIds.add(node.id);
      nodeIdMap[node.id] = node.id;
    }
  });
  
  const groups = new Set(data.nodes.map(node => node.group).filter(Boolean));
  let yOffset = 0;
  
  const connectionMap: Record<string, {hasIncoming: boolean, hasOutgoing: boolean}> = {};
  
  data.nodes.forEach(node => {
    const uniqueId = nodeIdMap[node.id] || node.id;
    connectionMap[uniqueId] = {
      hasIncoming: false,
      hasOutgoing: false
    };
  });
  
  if (Array.isArray(data.links) && data.links.length > 0) {
    data.links.forEach((link) => {
      const sourceId = nodeIdMap[link.source] || link.source;
      const targetId = nodeIdMap[link.target] || link.target;
      
      if (connectionMap[sourceId]) {
        connectionMap[sourceId].hasOutgoing = true;
      }
      
      if (connectionMap[targetId]) {
        connectionMap[targetId].hasIncoming = true;
      }
      
      initialEdges.push({
        id: `${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        type: 'smoothstep',
        animated: true,
        style: { 
          stroke: '#555',
          strokeWidth: 2,
          opacity: 0.8
        },
      });
    });
  }
  
  const NODE_WIDTH = 220;
  const NODE_HEIGHT = 120;
  const HORIZONTAL_GAP = 80;
  const VERTICAL_GAP = 50;
  const NODES_PER_ROW = 3;
  
  Array.from(groups).forEach((group) => {
    if (group) {
      initialNodes.push({
        id: `group-${group}`,
        type: 'groupHeader',
        data: { 
          label: group,
        },
        position: { x: 0, y: yOffset },
        connectable: false,
      });
      
      const groupNodes = data.nodes.filter(n => n.group === group);
      
      const sortedNodes = [...groupNodes].sort((a, b) => {
        const aId = nodeIdMap[a.id] || a.id;
        const bId = nodeIdMap[b.id] || b.id;
        
        const aConn = connectionMap[aId] || { hasIncoming: false, hasOutgoing: false };
        const bConn = connectionMap[bId] || { hasIncoming: false, hasOutgoing: false };
        
        if (aConn.hasIncoming && !bConn.hasIncoming) return -1;
        if (!aConn.hasIncoming && bConn.hasIncoming) return 1;
        
        if (aConn.hasOutgoing && !bConn.hasOutgoing) return -1;
        if (!aConn.hasOutgoing && bConn.hasOutgoing) return 1;
        
        return 0;
      });
      
      sortedNodes.forEach((node, index) => {
        const row = Math.floor(index / NODES_PER_ROW);
        const col = index % NODES_PER_ROW;
        
        const xOffset = col * (NODE_WIDTH + HORIZONTAL_GAP);
        const rowOffset = row * (NODE_HEIGHT + VERTICAL_GAP);
        
        const uniqueId = nodeIdMap[node.id] || node.id;
        const connections = connectionMap[uniqueId] || { hasIncoming: false, hasOutgoing: false };
        
        initialNodes.push({
          id: uniqueId,
          type: 'custom',
          position: { x: xOffset, y: yOffset + rowOffset + 80 },
          data: {
            name: node.name,
            description: node.description,
            type: node.type,
            group: node.group,
            hasIncoming: Boolean(connections.hasIncoming),
            hasOutgoing: Boolean(connections.hasOutgoing)
          },
          ...(connections.hasOutgoing ? { sourcePosition: Position.Right } : {}),
          ...(connections.hasIncoming ? { targetPosition: Position.Left } : {}),
        });
      });
      
      const rowsInGroup = Math.ceil(groupNodes.length / NODES_PER_ROW);
      yOffset += (rowsInGroup * (NODE_HEIGHT + VERTICAL_GAP)) + 150;
    }
  });

  return { nodes: initialNodes, edges: initialEdges };
} 