// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { layoutTree } from '../../../lib/treeLayout';
import { money } from '../../../lib/pipeline';

const MIN_SCALE = 0.3, MAX_SCALE = 2.5;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Cubic connector from bottom-center of parent to top-center of child (root→owner only).
function edgePath(a, b) {
  const x1 = a.x + a.w / 2, y1 = a.y + a.h;
  const x2 = b.x + b.w / 2, y2 = b.y;
  const my = (y1 + y2) / 2;
  return `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`;
}

const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

export default function OrgChartTree({ groups, onOpen }) {
  const [collapsed, setCollapsed] = useState(() => new Set());
  const { nodes, edges, width, height } = useMemo(
    () => layoutTree(groups, { collapsed }), [groups, collapsed]);
  const byId = useMemo(() => Object.fromEntries(nodes.map(n => [n.id, n])), [nodes]);
  const owners = useMemo(() => nodes.filter(n => n.kind === 'owner'), [nodes]);

  const wrapRef = useRef(null);
  const [view, setView] = useState({ scale: 1, tx: 0, ty: 0 });
  const drag = useRef(null);

  const fit = useCallback(() => {
    const el = wrapRef.current;
    if (!el || !width) return;
    const scale = clamp((el.clientWidth - 16) / width, MIN_SCALE, 1);
    setView({ scale, tx: (el.clientWidth - width * scale) / 2, ty: 8 });
  }, [width]);

  useEffect(() => { fit(); }, [fit]);

  const onPointerDown = (e) => {
    drag.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) d.moved = true;
    setView(v => ({ ...v, tx: d.tx + dx, ty: d.ty + dy }));
  };
  const onPointerUp = () => { drag.current = null; };
  const onWheel = (e) => {
    e.preventDefault();
    const f = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setView(v => ({ ...v, scale: clamp(v.scale * f, MIN_SCALE, MAX_SCALE) }));
  };

  const tap = (node) => {
    if (drag.current?.moved) return;
    if (node.kind === 'lead') onOpen(node.leadId);
    else if (node.kind === 'owner') {
      setCollapsed(prev => {
        const n = new Set(prev);
        n.has(node.ownerId) ? n.delete(node.ownerId) : n.add(node.ownerId);
        return n;
      });
    }
  };

  if (!groups.length) return <div className="dim text-sm text-center py-10">No deals to chart yet — add one with +.</div>;

  return (
    <div className="relative pt-1">
      <button onClick={fit}
        className="absolute right-1 top-1 z-10 text-[11px] font-bold px-2.5 py-1 rounded-full surface dim">
        Fit
      </button>
      <div ref={wrapRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerLeave={onPointerUp} onWheel={onWheel}
        className="surface rounded-2xl overflow-hidden touch-none select-none"
        style={{ height: 'min(70vh, 560px)', cursor: drag.current ? 'grabbing' : 'grab' }}>
        <svg width="100%" height="100%">
          <g transform={`translate(${view.tx},${view.ty}) scale(${view.scale})`}>
            {/* root→owner connectors */}
            {edges.map((e, i) => {
              const a = byId[e.from], b = byId[e.to];
              if (!a || !b) return null;
              return <path key={i} d={edgePath(a, b)} fill="none" stroke="#D5DEEC" strokeWidth="1.5" />;
            })}

            {/* grouping containers behind each owner's grid */}
            {owners.filter(o => !o.collapsed && o.blockH > 0).map(o => (
              <rect key={`box:${o.id}`} x={o.blockX - 6} y={o.blockY - 6}
                width={o.blockW + 12} height={o.blockH + 12} rx="12"
                fill="#F4F7FC" stroke="#E4EAF3" strokeWidth="1" />
            ))}

            {/* nodes */}
            {nodes.map(n => {
              if (n.kind === 'root') return (
                <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                  <rect width={n.w} height={n.h} rx="10" fill="#0C1626" />
                  <text x={n.w / 2} y={n.h / 2 + 4} textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#fff">{n.label}</text>
                </g>
              );
              if (n.kind === 'owner') return (
                <g key={n.id} transform={`translate(${n.x},${n.y})`} onPointerUp={() => tap(n)} style={{ cursor: 'pointer' }}>
                  <rect width={n.w} height={n.h} rx="10" fill="#fff"
                    stroke={n.isYou ? '#2F6BF0' : '#E4EAF3'} strokeWidth={n.isYou ? 2 : 1.25} />
                  <text x={n.w / 2} y={20} textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#0C1626">{trunc(n.label, 16)}</text>
                  <text x={n.w / 2} y={37} textAnchor="middle" fontSize="10.5" fill="#7C8AA6">{n.collapsed ? '▸ ' : ''}{n.sublabel}</text>
                </g>
              );
              // lead tile
              return (
                <g key={n.id} transform={`translate(${n.x},${n.y})`} onPointerUp={() => tap(n)} style={{ cursor: 'pointer' }}>
                  <rect width={n.w} height={n.h} rx="8" fill="#fff" stroke="#E4EAF3" strokeWidth="1" opacity={n.closed ? 0.55 : 1} />
                  <rect width="4" height={n.h} rx="2" fill={n.color} opacity={n.closed ? 0.55 : 1} />
                  <text x="10" y="15" fontSize="10" fontWeight="700" fill="#0C1626">{trunc(n.label, 11)}</text>
                  <text x="10" y="29" fontSize="10" fontWeight="700" fill="#3F5170">{money(n.value)}</text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      <div className="dim text-[11px] text-center mt-2">Drag to pan · pinch / scroll to zoom · tap a name to fold</div>
    </div>
  );
}
