// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useState } from 'react';
import { STAGES, OPEN_STAGES, money } from '../../lib/pipeline';
import LeadCard from '../LeadCard';

export default function PipelineTab({ leads, tags, updateLead, onOpen }){
  const [moving, setMoving] = useState(null); // lead being moved on mobile

  const onDrop=(id,stage)=>{ const l=leads.find(x=>x.id===id); if(l&&l.stage!==stage) updateLead(id,{stage}); };
  const active=leads.filter(l=>OPEN_STAGES.includes(l.stage));
  const openVal=active.reduce((s,l)=>s+ +l.value,0);

  return (
    <div className="px-4 pt-5">
      <div className="text-[11px] uppercase tracking-widest font-semibold" style={{color:'#2FB6C8'}}>Sales Pipeline</div>
      <h1 className="text-3xl font-bold text-white mt-0.5 mb-1">Pipeline</h1>
      <div className="soft text-sm mb-4">{active.length} active · {money(openVal)} in play</div>

      <div className="flex gap-3 overflow-x-auto pb-4 items-start">
        {STAGES.map(st=>{
          const items=leads.filter(l=>l.stage===st.id);
          return (
            <div key={st.id}
              onDragOver={e=>e.preventDefault()}
              onDrop={e=>{e.preventDefault();onDrop(e.dataTransfer.getData('text/plain'),st.id);}}
              className="panel rounded-2xl p-2.5 flex-none w-[260px] min-h-[120px]">
              <div className="flex items-center gap-2 px-1 pb-2.5 pt-1">
                <span className="w-2 h-2 rounded-full" style={{background:st.color}}/>
                <span className="font-semibold text-sm text-white">{st.name}</span>
                <span className="ml-auto text-xs dim font-semibold">{items.length}</span>
              </div>
              {items.length===0
                ? <div className="text-xs dim text-center py-4 rounded-lg" style={{border:'1px dashed #26314B'}}>—</div>
                : items.map(l=>(
                  <LeadCard key={l.id} lead={l} tags={tags} draggable
                    onOpen={onOpen}
                    onLongPress={()=>setMoving(l)}
                  />
                ))}
            </div>
          );
        })}
      </div>

      {/* Mobile move sheet — appears when a card is long-pressed */}
      {moving && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{background:'rgba(4,7,15,.7)'}} onClick={()=>setMoving(null)}>
          <div className="panel w-full max-w-lg rounded-t-3xl p-5 pb-8" onClick={e=>e.stopPropagation()}>
            <div className="text-[11px] uppercase tracking-widest font-semibold mb-1" style={{color:'#2FB6C8'}}>Move stage</div>
            <div className="font-bold text-white text-lg mb-4">{moving.company}</div>
            <div className="flex flex-col gap-2">
              {STAGES.map(s=>(
                <button key={s.id} onClick={()=>{ updateLead(moving.id,{stage:s.id}); setMoving(null); }}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-left"
                  style={{
                    background: moving.stage===s.id ? s.color+'22' : 'transparent',
                    border: `1px solid ${moving.stage===s.id ? s.color : '#26314B'}`,
                  }}>
                  <span className="w-2.5 h-2.5 rounded-full flex-none" style={{background:s.color}}/>
                  <span className="font-semibold text-sm" style={{color: moving.stage===s.id ? '#fff' : '#9AA6C0'}}>{s.name}</span>
                  {moving.stage===s.id && <span className="ml-auto text-xs" style={{color:s.color}}>current</span>}
                </button>
              ))}
            </div>
            <button onClick={()=>setMoving(null)} className="mt-4 w-full text-sm font-semibold py-2.5 rounded-xl dim" style={{border:'1px solid #26314B'}}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
