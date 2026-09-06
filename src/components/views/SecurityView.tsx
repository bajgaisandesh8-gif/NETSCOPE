import React, { useState } from 'react';
import { SecurityPosture, Device } from '../../types';
import { ConfidenceBadge } from '../ConfidenceBadge';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  Lock, 
  Unlock, 
  RefreshCw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface SecurityViewProps {
  posture: SecurityPosture | null;
  devices: Device[];
  isLoading: boolean;
  onRefreshPosture: () => Promise<void>;
}

export const SecurityView: React.FC<SecurityViewProps> = ({
  posture,
  devices,
  isLoading,
  onRefreshPosture,
}) => {
  const [activeTab, setActiveTab] = useState<'findings' | 'recommendations' | 'ports'>('findings');

  const score = posture?.score ?? 100;
  const rating = posture?.rating ?? 'Excellent';

  const getScoreColor = (sc: number) => {
    if (sc >= 90) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (sc >= 75) return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';
    if (sc >= 60) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev.toLowerCase()) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">CRITICAL</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">HIGH</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">MEDIUM</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">LOW</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">INFO</span>;
    }
  };

  return (
    <div id="security-view-container" className="space-y-6">
      {/* Top Banner & Security Score Meter */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Score Ring */}
            <div className={`w-24 h-24 rounded-2xl flex flex-col items-center justify-center border-2 ${getScoreColor(score)} shadow-inner`}>
              <span className="text-3xl font-black font-mono tracking-tight">{score}</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">/ 100</span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">Defensive Security Posture</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${getScoreColor(score)}`}>
                  {rating}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Ground-truth assessment calculated purely from observed network telemetry, open service exposure, and IEEE hardware registrations.
              </p>
              {posture?.analyzed_at && (
                <div className="text-[11px] text-slate-500 mt-1 font-mono">
                  Last audit: {new Date(posture.analyzed_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onRefreshPosture}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Re-evaluate Posture</span>
          </button>
        </div>

        {/* Audit Metrics Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">Total Nodes Audited</span>
            <span className="text-xl font-bold font-mono text-slate-100 mt-0.5 block">
              {posture?.total_devices_audited ?? devices.length}
            </span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">Risky Open Ports</span>
            <span className={`text-xl font-bold font-mono mt-0.5 block ${(posture?.risky_services_count ?? 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {posture?.risky_services_count ?? 0}
            </span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">Unrecognized MACs</span>
            <span className={`text-xl font-bold font-mono mt-0.5 block ${(posture?.unknown_mac_count ?? 0) > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
              {posture?.unknown_mac_count ?? 0}
            </span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">Active Remediation Steps</span>
            <span className="text-xl font-bold font-mono text-cyan-400 mt-0.5 block">
              {posture?.recommendations?.length ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('findings')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'findings'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Audit Observations ({posture?.findings?.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'recommendations'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Actionable Recommendations ({posture?.recommendations?.length ?? 0})
        </button>
      </div>

      {/* Findings Tab */}
      {activeTab === 'findings' && (
        <div className="space-y-3">
          {(!posture?.findings || posture.findings.length === 0) ? (
            <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-sm font-medium text-slate-200">No Security Anomalies Detected</p>
              <p className="text-xs text-slate-500">All scanned hosts and interface configurations adhere to defensive baseline criteria.</p>
            </div>
          ) : (
            posture.findings.map((finding) => (
              <div
                key={finding.id}
                className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm space-y-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {getSeverityBadge(finding.severity)}
                    <h3 className="text-sm font-semibold text-slate-100">{finding.title}</h3>
                  </div>
                  <ConfidenceBadge level={finding.confidence} size="sm" />
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 font-mono text-xs text-slate-300">
                  <span className="text-slate-500 block text-[11px] uppercase tracking-wider mb-1 font-sans font-semibold">Evidence</span>
                  {finding.evidence}
                </div>

                <div className="text-xs text-slate-400">
                  <strong className="text-slate-300">Defensive Impact: </strong>
                  {finding.impact}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Recommendations Tab */}
      {activeTab === 'recommendations' && (
        <div className="space-y-3">
          {(!posture?.recommendations || posture.recommendations.length === 0) ? (
            <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-sm font-medium text-slate-200">No Action Required</p>
              <p className="text-xs text-slate-500">Network hygiene conforms to recommended defensive best practices.</p>
            </div>
          ) : (
            posture.recommendations.map((rec) => (
              <div
                key={rec.id}
                className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm flex items-start gap-4"
              >
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-100">{rec.title}</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                      Priority: {rec.priority}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{rec.action}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
