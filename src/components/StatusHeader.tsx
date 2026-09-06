import React from 'react';
import { Shield, RefreshCw, Cpu, Database, Sparkles, Activity } from 'lucide-react';
import { SystemStatus, NetworkBaseline } from '../types';

interface Props {
  status: SystemStatus | null;
  baseline: NetworkBaseline | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  onOpenFirstRun: () => void;
}

export const StatusHeader: React.FC<Props> = ({
  status,
  baseline,
  isRefreshing,
  onRefresh,
  onOpenFirstRun,
}) => {
  const primaryIface = baseline?.primary_interface;

  return (
    <header
      id="netscope-header"
      className="bg-zinc-950/80 backdrop-blur border-b border-zinc-800/80 px-5 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30"
    >
      {/* Brand & Subnet */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm tracking-wider font-bold text-zinc-100">
                NETSCOPE
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                SEC-OPS v1.0
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono flex items-center gap-1.5">
              <span>Subnet:</span>
              <span className="text-cyan-300 font-semibold">
                {primaryIface?.cidr || primaryIface?.ipv4 || 'Detecting...'}
              </span>
              {primaryIface && (
                <span className="text-zinc-400 text-[11px]">({primaryIface.name})</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Triad Subsystem Status Indicators (Offline-First Architecture) */}
      <div className="flex items-center gap-2.5 flex-wrap text-xs font-mono">
        {/* Local Network Engine */}
        <div
          id="status-engine-pill"
          className="flex items-center gap-2 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800"
          title="Python Network Engine: Local interface & probe telemetry"
        >
          <Cpu className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-400">Local Engine:</span>
          {status?.local_network_engine ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </span>
          ) : (
            <span className="text-zinc-400">Connecting...</span>
          )}
        </div>

        {/* Supabase Database Status */}
        <div
          id="status-db-pill"
          className={`flex items-center gap-2 px-2.5 py-1 rounded border ${
            status?.supabase?.mode === 'cloud'
              ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400'
          }`}
          title={status?.supabase?.message || 'Database status'}
        >
          <Database className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-400">Database:</span>
          <span className="flex items-center gap-1">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                status?.supabase?.mode === 'cloud' ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            {status?.supabase?.mode === 'cloud' ? 'Supabase Sync' : 'Local Offline'}
          </span>
        </div>

        {/* AI Service */}
        <div
          id="status-ai-pill"
          className={`flex items-center gap-2 px-2.5 py-1 rounded border ${
            status?.ai_service?.configured
              ? 'bg-indigo-950/30 border-indigo-800/40 text-indigo-300'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400'
          }`}
          title={status?.ai_service?.message || 'AI engine'}
        >
          <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-400">AI:</span>
          <span>{status?.ai_service?.configured ? 'Gemini Ready' : 'Offline'}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          id="btn-first-run-info"
          onClick={onOpenFirstRun}
          className="px-2.5 py-1.5 rounded text-xs font-mono text-zinc-300 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 hover:text-white transition-colors flex items-center gap-1.5"
          title="Review interface discovery & permission boundaries"
        >
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>Discovery Info</span>
        </button>

        <button
          id="btn-refresh-telemetry"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="px-3 py-1.5 rounded text-xs font-mono font-medium text-zinc-100 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>
    </header>
  );
};
