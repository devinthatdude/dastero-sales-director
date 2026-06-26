// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useMemo, useState } from 'react';
import { STAGES, OPEN_STAGES, money, forecast, groupByOwner } from '../../lib/pipeline';
import { useSettings } from '../../lib/settings';
import OwnerGroups from './pipeline/OwnerGroups';
import OrgChartTree from './pipeline/OrgChartTree';

const VIEWS = [
  { id: 'stage', label: 'By Stage' },
  { id: 'owner', label: 'By Owner' },
  { id: 'tree',  label: 'Tree' },
];

function StageView({ leads }) {
  const settings = useSettings();
  const fc = forecast(leads, settings.stageProbability);
  const stages = STAGES.filter(s => OPEN_STAGES.includes(s.id)).map(s => {
    const items = leads.filter(l => l.stage === s.id);
    return { ...s, count: items.length, value: items.reduce((a, l) => a + +l.value, 0) };
  });
  const maxVal = Math.max(1, ...stages.map(s => s.value));

  return (
    <div className="flex flex-col gap-3 pt-1">
      <div className="surface rounded-2xl px-[18px] py-4 flex justify-between items-center">
        <div>
          <div className="text-[10.5px] tracking-[0.18em] uppercase font-bold dim">Weighted forecast</div>
          <div className="mono text-[30px] font-bold mt-1.5 leading-none" style={{ letterSpacing: '-0.02em' }}>
            <span style={{ color: '#2F6BF0' }}>$</span>{fc.weighted.toLocaleString('en-US')}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] soft">of {money(fc.openVal)} open</div>
          <div className="text-[11.5px] font-bold mt-1" style={{ color: '#1B9E6E' }}>{fc.pct}% likely</div>
        </div>
      </div>
      <div className="flex items-center gap-2.5 mt-0.5 px-0.5">
        <div className="text-[15px] font-extrabold" style={{ letterSpacing: '-0.01em' }}>By stage</div>
        <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
        <div className="text-[11px] dim font-bold">{fc.count} deal{fc.count !== 1 ? 's' : ''}</div>
      </div>
      {stages.map(s => (
        <div key={s.id} className="panel rounded-xl px-3.5 py-3">
          <div className="flex justify-between items-baseline">
            <div className="text-[13.5px] font-bold">{s.name}</div>
            <div className="mono text-[13.5px] font-bold">{money(s.value)}</div>
          </div>
          <div className="flex items-center gap-2.5 mt-2.5">
            <div className="flex-1 h-1.5 rounded-md overflow-hidden" style={{ background: '#EEF2F9' }}>
              <div className="h-full rounded-md" style={{ width: Math.round(s.value / maxVal * 100) + '%', background: 'linear-gradient(90deg,#2F6BF0,#7AA0F4)' }} />
            </div>
            <div className="text-[11px] soft font-bold whitespace-nowrap">{s.count} deal{s.count !== 1 ? 's' : ''}</div>
          </div>
        </div>
      ))}
      {fc.count === 0 && <div className="dim text-sm text-center py-10">No open deals yet — add one with +.</div>}
    </div>
  );
}

export default function PipelineTab({ leads, profiles = [], userId = null, onOpen }) {
  const [view, setView] = useState('stage');
  const [showClosed, setShowClosed] = useState(false);
  const groups = useMemo(
    () => groupByOwner(leads, profiles, { includeClosed: showClosed, currentUserId: userId }),
    [leads, profiles, showClosed, userId]);

  return (
    <div className="flex flex-col gap-3 pt-1">
      <div className="flex items-center gap-2">
        <div className="flex-1 grid grid-cols-3 p-1 rounded-xl" style={{ background: '#EEF2F9' }}>
          {VIEWS.map(v => (
            <button key={v.id} onClick={() => setView(v.id)}
              className="text-[12px] font-bold py-1.5 rounded-lg transition-colors"
              style={view === v.id
                ? { background: '#fff', color: '#0C1626', boxShadow: '0 1px 3px rgba(12,22,38,.12)' }
                : { color: '#7C8AA6' }}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {view !== 'stage' && (
        <label className="flex items-center gap-2 text-[12px] font-semibold soft px-0.5 self-start cursor-pointer">
          <input type="checkbox" checked={showClosed} onChange={e => setShowClosed(e.target.checked)} />
          Show closed
        </label>
      )}

      {view === 'stage' && <StageView leads={leads} />}
      {view === 'owner' && <OwnerGroups groups={groups} onOpen={onOpen} />}
      {view === 'tree'  && <OrgChartTree groups={groups} onOpen={onOpen} />}
    </div>
  );
}
