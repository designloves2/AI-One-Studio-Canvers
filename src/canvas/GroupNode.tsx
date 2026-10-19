import { memo, useState } from 'react';
import { NodeResizer, type NodeProps } from '@xyflow/react';
import { useGraph } from '../store/graph';

export const GroupNode = memo(function GroupNode({ id, selected }: NodeProps) {
  const node = useGraph((s) => s.nodes.find((n) => n.id === id));
  const setTitle = useGraph((s) => s.setTitle);
  const [edit, setEdit] = useState(false);
  if (!node) return null;
  return (
    <div className={`gnode ${selected ? 'sel' : ''}`}>
      <NodeResizer minWidth={160} minHeight={100} isVisible={selected} />
      {edit
        ? <input className="g-title nodrag" autoFocus defaultValue={node.title} onBlur={(e) => { setTitle(id, e.target.value); setEdit(false); }} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
        : <div className="g-title" onDoubleClick={() => setEdit(true)}>{node.title}</div>}
    </div>
  );
});
