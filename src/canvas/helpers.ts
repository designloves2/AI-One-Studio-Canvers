import type { Asset, GraphNode } from '../types';
import { byId } from '../registry';
import { useGraph } from '../store/graph';

/** assets of `node` that belong to output port `port` */
export function portAssets(node: GraphNode, port?: string): Asset[] {
  const def = byId.get(node.defId);
  if (!def) return node.results;
  const p = port ?? def.outputs[0]?.id;
  return node.results.filter((a) => def.outputs.length === 1 || (a.port ?? def.outputs[0]?.id) === p);
}

export function activeAsset(node: GraphNode, port?: string): Asset | undefined {
  const list = portAssets(node, port);
  return list[Math.min(node.activeResult, list.length - 1)] ?? list[0];
}

/** the asset currently arriving at an input port (first connection) */
export function useUpstream(nodeId: string, handle: string): Asset | undefined {
  return useGraph((s) => {
    const e = s.edges.find((x) => x.target === nodeId && x.targetHandle === handle);
    if (!e) return undefined;
    const src = s.nodes.find((n) => n.id === e.source);
    return src ? activeAsset(src, e.sourceHandle) : undefined;
  });
}

export const isConnected = (nodeId: string, handle: string): boolean =>
  useGraph.getState().edges.some((e) => e.target === nodeId && e.targetHandle === handle);
