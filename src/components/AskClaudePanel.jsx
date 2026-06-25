// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
// The "Ask Claude" panel (Today tab, when Settings → Today panel = Ask Claude).
// Grounds answers in the rep's real pipeline; degrades gracefully if the
// ask-claude Edge Function isn't deployed.
import { useRef, useState } from 'react';
import { askClaude } from '../lib/askClaude';
import VoiceWave from './VoiceWave';

export default function AskClaudePanel({ leads }){
  const [q,setQ]=useState('');
  const [busy,setBusy]=useState(false);
  const [answer,setAnswer]=useState('');
  const [listening,setListening]=useState(false);
  const [voiceHint,setVoiceHint]=useState('');
  const recRef=useRef(null);

  const runAsk=async(opts)=>{
    const query=q.trim();
    if(!query||busy) return;
    setBusy(true); setAnswer('');
    const text=await askClaude(query, leads);
    setBusy(false); setAnswer(text);
    if(opts?.speak && window.speechSynthesis){
      try{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); u.rate=1.02; speechSynthesis.speak(u); }catch{/* ignore */}
    }
  };

  const startVoice=()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){ setVoiceHint('Voice input isn’t supported in this browser — type your question above.'); return; }
    let finalT='';
    const rec=new SR();
    rec.lang='en-US'; rec.interimResults=true; rec.continuous=false;
    rec.onresult=(e)=>{ let t=''; for(let i=0;i<e.results.length;i++) t+=e.results[i][0].transcript; finalT=t; setVoiceHint('“'+t+'”'); };
    rec.onerror=(e)=>{ setListening(false); setVoiceHint(e.error==='not-allowed'?'Mic permission blocked — type your question instead.':'Didn’t catch that — tap to try again.'); };
    rec.onend=()=>{ setListening(false); const query=(finalT||'').trim(); if(query){ setQ(query); setTimeout(()=>runAsk({speak:true}),0); } };
    recRef.current=rec;
    try{ rec.start(); setListening(true); setVoiceHint('Listening… speak now'); }catch{/* ignore */}
  };
  const toggleVoice=()=>{ if(listening) recRef.current?.stop(); else startVoice(); };

  const showSuggest=!answer && !busy;

  return (
    <div className="rounded-2xl px-4 pt-4 pb-4 text-white" style={{background:'linear-gradient(150deg,var(--navy),var(--navy2))',border:'1px solid var(--navy)'}}>
      <div className="flex items-center gap-2">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5FE0EA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/></svg>
        <div className="text-[10.5px] tracking-[0.18em] uppercase font-bold" style={{color:'#5FE0EA'}}>Ask Claude</div>
      </div>
      <div className="flex items-center gap-2 mt-3 pl-3 pr-1.5 py-1.5 rounded-xl" style={{background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.18)'}}>
        <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')runAsk();}}
          placeholder="Which deals should I chase today?"
          className="flex-1 min-w-0 bg-transparent outline-none text-[13.5px] text-white placeholder:text-[#92A0B8]" />
        <button onClick={()=>runAsk()} aria-label="Ask" className="w-8 h-8 rounded-lg flex items-center justify-center flex-none" style={{background:'#2F6BF0'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg>
        </button>
      </div>

      {busy && <div className="text-[12.5px] mt-3" style={{color:'rgba(255,255,255,.6)'}}>Thinking…</div>}
      {!!answer && !busy && <div className="text-[13px] leading-relaxed mt-3 whitespace-pre-wrap" style={{color:'rgba(255,255,255,.92)'}}>{answer}</div>}

      {showSuggest && (
        <>
          <div className="mt-3 -mx-4"><VoiceWave listening={listening}/></div>
          <div className="flex justify-center mt-0.5">
            <button onClick={toggleVoice} className="flex items-center gap-2 font-bold text-[12.5px] text-white px-4 py-2 rounded-full"
              style={{border:`1px solid ${listening?'rgba(255,120,112,.6)':'rgba(255,255,255,.18)'}`,background:listening?'rgba(220,75,67,.22)':'rgba(255,255,255,.08)'}}>
              <span className="w-[9px] h-[9px] rounded-full" style={{background:listening?'#FF6B61':'#5FE0EA'}}/>
              {listening?'Listening… tap to stop':'Talk to Claude live'}
            </button>
          </div>
          {!!voiceHint && <div className="text-[12px] text-center mt-2 leading-snug" style={{color:'rgba(255,255,255,.62)'}}>{voiceHint}</div>}
        </>
      )}
    </div>
  );
}
