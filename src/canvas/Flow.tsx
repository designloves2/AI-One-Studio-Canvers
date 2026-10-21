import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow, Background, BackgroundVariant, Controls as RFControls, SelectionMode, useReactFlow,
  type Connection, type Edge, type EdgeChange, type Node, type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useGraph } from '../store/graph';
import { byId, compatible } from '../registry';
import { CanvasNode } from './CanvasNode';
import { GroupNode } from './GroupNode';
import { PORT_COLORS } from '../types';
import { addGalleryCard, addImports, runAll } from '../engine/actions';
import { runNode } from '../engine/actions';
import { ContextMenu, type CtxItem } from './ContextMenu';
import type { Pending } from './NodeMenu';
import { saveSelectionAsDeck } from '../decks';

const nodeTypes = { card: CanvasNode, group: GroupNode };

export function Flow({ tool, onMenu }: { tool: 'select' | 'hand'; onMenu(at: { x: number; y: number; flow: { x: number; y: number }; pending?: Pending }): void }) {
  const [ctx, setCtx] = useState<{ x: number; y: number; ids: string[]; edge?: string } | null>(null);
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
      zIndex: isGroup ? -10 : 0,
      ...(resizable ? { style: { width: n.w ?? 240, height: n.h ?? 160 } } : {}),
    };
  }), [nodes, selected]);

  const [selEdges, setSelEdges] = useState<string[]>([]);
  const rfEdges = useMemo<Edge[]>(() => edges.map((e) => {
    const src = nodes.find((n) => n.id === e.source);
    const port = src ? byId.get(src.defId)?.outputs.find((o) => o.id === e.sourceHandle) : undefined;
    return { id: e.id, selected: selEdges.includes(e.id), interactionWidth: 26, source: e.source, sourceHandle: e.sourceHandle, target: e.target, targetHandle: e.targetHandle, style: { stroke: port ? PORT_COLORS[port.type] : '#777', strokeWidth: 2 } };
  }), [edges, nodes, selEdges]);

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
    for (const c of changes) if (c.type === 'select') setSelEdges((cur) => (c.selected ? [...new Set([...cur, c.id])] : cur.filter((x) => x !== c.id)));
    const rm = changes.filter((c) => c.type === 'remove').map((c) => (c as any).id as string);
    if (rm.length) useGraph.getState().removeEdges(rm);
  }, []);

  const onConnect = useCallback((c: Connection) => {
    if (!c.source || !c.target || !c.sourceHandle || !c.targetHandle) return;
    useGraph.getState().connect({ source: c.source, sourceHandle: c.sourceHandle, target: c.target, targetHandle: c.targetHandle });
  }, []);

  // dragging a wire and letting go on empty canvas opens the card menu, filtered to cards that fit the wire
  const onConnectEnd = useCallback((ev: MouseEvent | TouchEvent, st: any) => {
    if (st.isValid || !st.fromNode || !st.fromHandle) return;
    const e = ev as MouseEvent; if (e.clientX === undefined) return;
    const g = useGraph.getState(); const node = g.nodes.find((n) => n.id === st.fromNode.id); if (!node) return;
    const def = byId.get(node.defId); const dir = st.fromHandle.type === 'source' ? 'out' : 'in';
    const port = (dir === 'out' ? def?.outputs : def?.inputs)?.find((p) => p.id === st.fromHandle.id); if (!port) return;
    onMenu({ x: e.clientX, y: e.clientY, flow: rf.screenToFlowPosition({ x: e.clientX, y: e.clientY }), pending: { node: node.id, handle: port.id, dir, type: port.type } });
  }, [rf, onMenu]);

  const COLORS = [{ value: undefined, title: 'default' }, { value: '#2a1d1f', title: 'red' }, { value: '#2a2418', title: 'amber' }, { value: '#1b2a1f', title: 'green' }, { value: '#182a2c', title: 'teal' }, { value: '#1b2233', title: 'blue' }, { value: '#251d33', title: 'purple' }, { value: '#2e1d2a', title: 'pink' }, { value: '#2b2b2b', title: 'grey' }];
  const ctxItems = (ids: string[]): CtxItem[] => {
    const g = useGraph.getState(); const has = ids.length > 0;
    const lockedAll = has && ids.every((id) => g.nodes.find((n) => n.id === id)?.locked);
    const grp = ids.length === 1 && g.nodes.find((n) => n.id === ids[0])?.members;
    return [
      { label: 'Run this card', disabled: ids.length !== 1, onClick: () => void runNode(ids[0]) },
      { label: 'Run everything', onClick: () => void runAll() },
      grp ? { label: 'Ungroup', shortcut: 'Ctrl G', divider: true, onClick: () => g.ungroup(ids[0]) } : { label: 'Group selection', shortcut: 'Ctrl G', disabled: !has, divider: true, onClick: () => g.group(ids) },
      { label: 'Duplicate', shortcut: 'Ctrl D', disabled: !has, onClick: () => g.duplicateNodes(ids) },
      { label: lockedAll ? 'Unlock' : 'Lock', disabled: !has, onClick: () => g.setLocked(ids, !lockedAll) },
      { label: 'Card colour', swatches: COLORS, custom: true, divider: true, onPick: (v) => g.setColor(ids, v), onCustom: (bg, text) => g.setCardColors(ids, bg, text), disabled: !has },
      { label: 'Save selection as deck', disabled: !has, onClick: () => { g.select(ids); saveSelectionAsDeck(`Deck ${new Date().toLocaleTimeString()}`); } },
      { label: 'Delete', shortcut: 'Del', danger: true, disabled: !has, divider: true, onClick: () => g.removeNodes(ids) },
    ];
  };

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
    const asset = e.dataTransfer.getData('application/x-canvers-asset');   // dragged out of the gallery
    if (asset) { try { addGalleryCard(JSON.parse(asset), at); } catch { /* not ours */ } return; }
    if (e.dataTransfer.files.length) void addImports([...e.dataTransfer.files], at);
  }, [rf]);

  return (
    <div className="flow" ref={wrap} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <ReactFlow
        nodes={rfNodes} edges={rfEdges} nodeTypes={nodeTypes}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onConnectEnd={onConnectEnd} isValidConnection={isValid}
        onEdgeContextMenu={(e, ed) => { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY, ids: [], edge: ed.id }); }}
        onEdgeDoubleClick={(_, ed) => useGraph.getState().removeEdges([ed.id])}
        edgesReconnectable onReconnect={(old, c) => { const g = useGraph.getState(); if (!c.source || !c.target || !c.sourceHandle || !c.targetHandle) return; g.removeEdges([old.id]); g.connect({ source: c.source, sourceHandle: c.sourceHandle, target: c.target, targetHandle: c.targetHandle }); }}
        onReconnectEnd={(_, ed, __, st) => { if (!st.isValid) useGraph.getState().removeEdges([ed.id]); }}
        onNodeContextMenu={(e, n) => { e.preventDefault(); const sel = useGraph.getState().selected; const ids = sel.includes(n.id) ? sel : [n.id]; if (!sel.includes(n.id)) useGraph.getState().select([n.id]); setCtx({ x: e.clientX, y: e.clientY, ids }); }}
        onSelectionContextMenu={(e, ns) => { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY, ids: ns.map((n) => n.id) }); }}
        onPaneContextMenu={(e) => { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY, ids: [] }); }}
        onNodeDragStart={() => useGraph.getState().snapshot()}
        onNodeDragStop={(_, __, dragged) => useGraph.getState().reassignMembership(dragged.map((n) => n.id))}
        onPaneClick={() => { useGraph.getState().select([]); setCtx(null); }}
        onDoubleClick={(e) => { if ((e.target as HTMLElement).classList.contains('react-flow__pane')) onMenu({ x: e.clientX, y: e.clientY, flow: rf.screenToFlowPosition({ x: e.clientX, y: e.clientY }) }); }}
        panOnDrag={[0, 1, 2]} selectionOnDrag={false} selectionKeyCode={['Control', 'Meta']} multiSelectionKeyCode={['Shift', 'Control', 'Meta']} selectionMode={SelectionMode.Partial}
        elevateNodesOnSelect={false} zoomOnDoubleClick={false} minZoom={0.1} maxZoom={2.5} fitView={false} deleteKeyCode={['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }} colorMode="dark" snapToGrid snapGrid={[10, 10]}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#2a2e38" />
        <RFControls showInteractive={false} position="bottom-right" />
      </ReactFlow>
      {ctx && <ContextMenu x={ctx.x} y={ctx.y} items={ctx.edge ? [{ label: 'Disconnect', shortcut: 'Del', danger: true, onClick: () => useGraph.getState().removeEdges([ctx.edge!]) }] : ctxItems(ctx.ids)} onClose={() => setCtx(null)} />}
      {nodes.length === 0 && (
        <div className="hint">
          <h2>AI ONE Studio Canvers</h2>
          <p>더블클릭 또는 <kbd>Tab</kbd> 으로 노드를 추가하세요 · 왼쪽 드래그 = 캔버스 이동 · <kbd>Ctrl</kbd>+드래그 = 영역 선택 · 파일을 끌어다 놓으면 가져오기 노드가 생깁니다.</p>
        </div>
      )}
    </div>
  );
}
