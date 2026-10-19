import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow, Background, BackgroundVariant, Controls as RFControls, MiniMap, SelectionMode, useReactFlow,
  type Connection, type Edge, type EdgeChange, type Node, type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useGraph } from '../store/graph';
import { byId, compatible } from '../registry';
import { CanvasNode } from './CanvasNode';
import { GroupNode } from './GroupNode';
import { PORT_COLORS } from '../types';
import { addImports } from '../engine/actions';

const nodeTypes = { card: CanvasNode, group: GroupNode };

export function Flow({ tool, onMenu }: { tool: 'select' | 'hand'; onMenu(at: { x: number; y: number; flow: { x: number; y: number } }): void }) {
  const nodes = useGraph((s) => s.nodes);
  const edges = useGraph((s) => s.edges);
  const selected = useGraph((s) => s.selected);
  const fitTick = useGraph((s) => s.fitTick);
  const rf = useReactFlow();
  const wrap = useRef<HTMLDivElement>(null);

  const rfNodes = useMemo<Node[]>(() => nodes.map((n) => {
    const isGroup = !!n.members;
    const resizable = isGroup || n.defId === 'note';
    return {
      id: n.id, type: isGroup ? 'group' : 'card', position: { x: n.x, y: n.y }, data: {},
      selected: selected.includes(n.id), draggable: !n.locked, deletable: !n.locked,
      zIndex: isGroup ? -1 : 0,
      ...(resizable ? { style: { width: n.w ?? 240, height: n.h ?? 160 } } : {}),
    };
  }), [nodes, selected]);

  const rfEdges = useMemo<Edge[]>(() => edges.map((e) => {
    const src = nodes.find((n) => n.id === e.source);
    const port = src ? byId.get(src.defId)?.outputs.find((o) => o.id === e.sourceHandle) : undefined;
    return { id: e.id, source: e.source, sourceHandle: e.sourceHandle, target: e.target, targetHandle: e.targetHandle, style: { stroke: port ? PORT_COLORS[port.type] : '#777', strokeWidth: 2 } };
  }), [edges, nodes]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const g = useGraph.getState();
    const moves: { id: string; x: number; y: number }[] = [];
    const picked: string[] = []; let selTouched = false;
    for (const c of changes) {
      if (c.type === 'position' && c.position) {
        const cur = g.nodes.find((n) => n.id === c.id); if (!cur) continue;
        moves.push({ id: c.id, x: c.position.x, y: c.position.y });
        if (cur.members) { // a group carries its members along
          const dx = c.position.x - cur.x, dy = c.position.y - cur.y;
          for (const m of cur.members) { const mn = g.nodes.find((n) => n.id === m); if (mn && !changes.some((x) => x.type === 'position' && x.id === m)) moves.push({ id: m, x: mn.x + dx, y: mn.y + dy }); }
        }
      } else if (c.type === 'dimensions' && c.dimensions && (c as any).resizing !== undefined) {
        g.setSize(c.id, Math.round(c.dimensions.width), Math.round(c.dimensions.height));
      } else if (c.type === 'select') {
        selTouched = true; if (c.selected) picked.push(c.id);
      } else if (c.type === 'remove') {
        picked.length; g.removeNodes([c.id]);
      }
    }
    if (moves.length) g.moveMany(moves);
    if (selTouched) {
      const keep = g.selected.filter((id) => !changes.some((c) => c.type === 'select' && c.id === id));
      g.select([...keep, ...picked]);
    }
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    const rm = changes.filter((c) => c.type === 'remove').map((c) => (c as any).id as string);
    if (rm.length) useGraph.getState().removeEdges(rm);
  }, []);

  const onConnect = useCallback((c: Connection) => {
    if (!c.source || !c.target || !c.sourceHandle || !c.targetHandle) return;
    useGraph.getState().connect({ source: c.source, sourceHandle: c.sourceHandle, target: c.target, targetHandle: c.targetHandle });
  }, []);

  const isValid = useCallback((c: Connection | Edge) => {
    const g = useGraph.getState();
    const s = g.nodes.find((n) => n.id === c.source), t = g.nodes.find((n) => n.id === c.target);
    if (!s || !t || s.id === t.id) return false;
    const sp = byId.get(s.defId)?.outputs.find((o) => o.id === c.sourceHandle);
    const tp = byId.get(t.defId)?.inputs.find((i) => i.id === c.targetHandle);
    return !!sp && !!tp && compatible(sp.type, tp.type);
  }, []);

  useEffect(() => { if (fitTick) setTimeout(() => rf.fitView({ padding: 0.2, duration: 250 }), 30); }, [fitTick]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const at = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const defId = e.dataTransfer.getData('application/x-canvers-node');
    if (defId) { useGraph.getState().addNode(defId, at.x, at.y); return; }
    if (e.dataTransfer.files.length) void addImports([...e.dataTransfer.files], at);
  }, [rf]);

  return (
    <div className="flow" ref={wrap} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <ReactFlow
        nodes={rfNodes} edges={rfEdges} nodeTypes={nodeTypes}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} isValidConnection={isValid}
        onNodeDragStart={() => useGraph.getState().snapshot()}
        onPaneClick={() => useGraph.getState().select([])}
        onDoubleClick={(e) => { if ((e.target as HTMLElement).classList.contains('react-flow__pane')) onMenu({ x: e.clientX, y: e.clientY, flow: rf.screenToFlowPosition({ x: e.clientX, y: e.clientY }) }); }}
        panOnDrag={tool === 'hand' ? true : [1, 2]} selectionOnDrag={tool === 'select'} selectionMode={SelectionMode.Partial}
        zoomOnDoubleClick={false} minZoom={0.1} maxZoom={2.5} fitView={false} deleteKeyCode={['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }} colorMode="dark" snapToGrid snapGrid={[10, 10]}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#2a2e38" />
        <RFControls showInteractive={false} position="bottom-right" />
        <MiniMap pannable zoomable nodeColor="#3a4150" maskColor="rgba(10,12,16,.7)" position="bottom-left" />
      </ReactFlow>
      {nodes.length === 0 && (
        <div className="hint">
          <h2>AI ONE Studio Canvers</h2>
          <p>더블클릭 또는 <kbd>Tab</kbd> 으로 노드를 추가하세요 · 파일을 끌어다 놓으면 가져오기 노드가 생깁니다.</p>
        </div>
      )}
    </div>
  );
}
