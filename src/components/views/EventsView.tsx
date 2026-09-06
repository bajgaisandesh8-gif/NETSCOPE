import React, { useState, useEffect } from 'react';
import { NetworkEvent } from '../../types';
import { Bell, AlertTriangle, AlertCircle, Info, RefreshCw, Filter, Clock } from 'lucide-react';

export const EventsView: React.FC = () => {
  const [events, setEvents] = useState<NetworkEvent[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const filteredEvents = events.filter((e) => {
    if (severityFilter === 'all') return true;
    return e.severity.toLowerCase() === severityFilter.toLowerCase();
  });

  const getSeverityIcon = (sev: string) => {
    switch (sev.toLowerCase()) {
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      default:
        return <Info className="w-4 h-4 text-cyan-400" />;
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev.toLowerCase()) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">CRITICAL</span>;
      case 'warning':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">WARNING</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">INFO</span>;
    }
  };

  return (
    <div id="events-view-container" className="space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Network Event & Audit Stream</h2>
            <p className="text-xs text-slate-400 mt-0.5">Chronological log of network state transitions, new devices, and telemetry anomalies.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="all">All Severities</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <button
            onClick={fetchEvents}
            disabled={isLoading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            title="Refresh events"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Observed Events ({filteredEvents.length})</span>
          <span>Automatic in-memory and durable database persistence</span>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs italic">
            No events logged matching current severity filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {filteredEvents.map((evt) => (
              <div
                key={evt.id}
                className="p-4 hover:bg-slate-800/40 transition-colors flex items-start gap-3.5 font-sans"
              >
                <div className="mt-0.5">{getSeverityIcon(evt.severity)}</div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-200">{evt.event_type}</span>
                      {getSeverityBadge(evt.severity)}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded border border-slate-800/80 font-mono text-xs text-slate-300">
                    <pre className="text-[11px] whitespace-pre-wrap">{JSON.stringify(evt.details, null, 2)}</pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
