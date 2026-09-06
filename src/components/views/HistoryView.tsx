import React, { useState, useEffect } from 'react';
import { Snapshot, Device } from '../../types';
import { History, Camera, GitCompare, Plus, Check, ArrowRight, Clock, Trash2 } from 'lucide-react';

interface HistoryViewProps {
  devices: Device[];
}

export const HistoryView: React.FC<HistoryViewProps> = ({ devices }) => {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);

  // Diff comparison state
  const [oldSnapId, setOldSnapId] = useState<string>('');
  const [newSnapId, setNewSnapId] = useState<string>('');
  const [diffResult, setDiffResult] = useState<any>(null);
  const [isDiffing, setIsDiffing] = useState(false);

  const fetchSnapshots = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/history/snapshots');
      const data = await res.json();
      setSnapshots(data.snapshots || []);
      if (data.snapshots && data.snapshots.length >= 2) {
        setOldSnapId(data.snapshots[1].id);
        setNewSnapId(data.snapshots[0].id);
      } else if (data.snapshots && data.snapshots.length === 1) {
        setOldSnapId(data.snapshots[0].id);
        setNewSnapId(data.snapshots[0].id);
      }
    } catch (err) {
      console.error('Error fetching snapshots:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshots();
  }, []);

  const handleCaptureSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCapturing(true);
    try {
      const res = await fetch('/api/history/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel.trim() || undefined }),
      });
      if (res.ok) {
        setNewLabel('');
        await fetchSnapshots();
      }
    } catch (err) {
      console.error('Error creating snapshot:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRunDiff = async () => {
    if (!oldSnapId || !newSnapId) return;
    setIsDiffing(true);
    setDiffResult(null);
    try {
      const res = await fetch('/api/history/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_id: oldSnapId, new_id: newSnapId }),
      });
      const data = await res.json();
      setDiffResult(data);
    } catch (err) {
      console.error('Error comparing snapshots:', err);
    } finally {
      setIsDiffing(false);
    }
  };

  return (
    <div id="history-view-container" className="space-y-6">
      {/* Header & Snapshot Creation */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-slate-100">Network Time Machine & Snapshots</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Capture immutable point-in-time states of your network inventory to track device churn, IP reassignments, and MAC changes.
          </p>
        </div>

        <form onSubmit={handleCaptureSnapshot} className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Snapshot label (e.g. Pre-Patching)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-56 font-sans"
          />
          <button
            type="submit"
            disabled={isCapturing}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{isCapturing ? 'Saving...' : 'Capture Snapshot'}</span>
          </button>
        </form>
      </div>

      {/* Snapshot Comparison Panel */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-100">Differential State Comparison</h3>
          </div>
          <span className="text-xs text-slate-500">Detect added, removed, or mutated network endpoints</span>
        </div>

        {snapshots.length < 2 ? (
          <div className="p-8 text-center text-slate-500 text-xs italic">
            Capture at least 2 network snapshots to calculate differential state comparisons.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Baseline Snapshot (Earlier)</label>
                <select
                  value={oldSnapId}
                  onChange={(e) => setOldSnapId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  {snapshots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} ({new Date(s.timestamp).toLocaleTimeString()}) - {s.device_count} devices
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-center pt-5 text-slate-500">
                <ArrowRight className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Target Snapshot (Later)</label>
                <select
                  value={newSnapId}
                  onChange={(e) => setNewSnapId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  {snapshots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} ({new Date(s.timestamp).toLocaleTimeString()}) - {s.device_count} devices
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-5">
                <button
                  onClick={handleRunDiff}
                  disabled={isDiffing || oldSnapId === newSnapId}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
                >
                  {isDiffing ? 'Comparing...' : 'Compare Snapshots'}
                </button>
              </div>
            </div>

            {diffResult && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* Added Devices */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400">Newly Added Hosts</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400">
                      +{diffResult.added_count}
                    </span>
                  </div>
                  {diffResult.added.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No new devices added.</p>
                  ) : (
                    diffResult.added.map((d: any) => (
                      <div key={d.ip} className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-xs">
                        <span className="text-slate-200">{d.ip}</span>
                        <span className="text-slate-500 block text-[11px]">{d.vendor || 'Unknown'}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Removed Devices */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-400">Removed / Offline Hosts</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-400">
                      -{diffResult.removed_count}
                    </span>
                  </div>
                  {diffResult.removed.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No devices departed.</p>
                  ) : (
                    diffResult.removed.map((d: any) => (
                      <div key={d.ip} className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-xs">
                        <span className="text-slate-200">{d.ip}</span>
                        <span className="text-slate-500 block text-[11px]">{d.vendor || 'Unknown'}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Modified Devices */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-400">Mutated Hosts</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-400">
                      {diffResult.modified_count}
                    </span>
                  </div>
                  {diffResult.modified.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No parameter changes.</p>
                  ) : (
                    diffResult.modified.map((m: any) => (
                      <div key={m.ip} className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-xs">
                        <span className="text-slate-200">{m.ip}</span>
                        {Object.entries(m.changes).map(([k, val]: any) => (
                          <div key={k} className="text-[10px] text-amber-400/80">
                            {k}: {val.old} → {val.new}
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Snapshots History Feed */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-200">Stored Snapshots ({snapshots.length})</span>
        </div>

        {snapshots.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs italic">
            No snapshots recorded yet. Click "Capture Snapshot" above to establish a baseline.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {snapshots.map((s) => (
              <div key={s.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-800 text-cyan-400 border border-slate-700">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">{s.label}</h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(s.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                    {s.device_count} devices recorded
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
