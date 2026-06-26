// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { isAlreadyLead } from '../../lib/placesSearch';

export default function LeadSearchResults({ results, leads, importedIds, importingId, onImport, onSelect, onClose, onLoadMore, hasMore }) {
  return (
    <div className="absolute bottom-0 inset-x-0 bg-white z-20 flex flex-col" style={{ maxHeight: '72%', borderTop: '1px solid var(--line)', boxShadow: '0 -8px 20px -12px rgba(12,22,38,.35)' }}>
      <div className="flex items-center justify-between px-3.5 py-2.5 flex-none" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="text-[12.5px] font-bold">{results.length} result{results.length !== 1 ? 's' : ''}</div>
        <button onClick={onClose} className="dim text-lg leading-none px-1" aria-label="Close results">×</button>
      </div>
      <div className="overflow-auto px-2.5 py-2 flex flex-col gap-1.5">
        {results.map((r) => {
          const already = isAlreadyLead(r, leads);
          const added = importedIds[r.placeId];
          const importing = importingId === r.placeId;
          return (
            <div key={r.placeId} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg" style={{ border: '1px solid var(--line)' }}>
              <button onClick={() => onSelect(r)} className="min-w-0 flex-1 text-left">
                <div className="font-bold text-[13px] truncate">{r.name}</div>
                <div className="text-[11.5px] soft truncate">{[r.industry, r.address].filter(Boolean).join(' · ')}</div>
                {r.rating ? <div className="text-[11px] soft mt-0.5">★ {r.rating} ({r.reviews || 0})</div> : null}
              </button>
              {already ? (
                <span className="text-[10.5px] font-bold px-2 py-1 rounded-lg flex-none" style={{ background: 'rgba(124,138,166,.14)', color: '#5C6B85' }}>Already a lead</span>
              ) : added ? (
                <span className="text-[10.5px] font-bold px-2 py-1 rounded-lg flex-none" style={{ background: 'rgba(27,158,110,.12)', color: '#1B9E6E' }}>✓ Added</span>
              ) : (
                <button onClick={() => onImport(r)} disabled={importing}
                  className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex-none brandbtn text-white disabled:opacity-60">
                  {importing ? 'Adding…' : 'Import'}
                </button>
              )}
            </div>
          );
        })}
        {hasMore && <button onClick={onLoadMore} className="text-[12px] font-bold py-2 rounded-lg panel mt-1">Load more</button>}
      </div>
    </div>
  );
}
