import React from 'react';
import { SystemStatus, NetworkBaseline } from '../../types';
import { Settings, Shield, Database, Cpu, HardDrive, Terminal, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';

interface SettingsViewProps {
  status: SystemStatus | null;
  baseline: NetworkBaseline | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ status, baseline }) => {
  return (
    <div id="settings-view-container" className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Platform Settings & Architecture</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              NetScope operational modes, defensive boundaries, and persistence configuration.
            </p>
          </div>
        </div>
      </div>

      {/* Triad Subsystem Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Local Network Engine */}
        <div className="p-5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-slate-200">Local Network Engine</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              OPERATIONAL
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Native Python kernel engine with passive ARP cache reading, ICMP ping probes, and controlled Nmap sweeps.
          </p>
          <div className="text-[11px] font-mono text-slate-500 space-y-1 pt-2 border-t border-slate-800">
            <div>Nmap: {baseline?.nmap.available ? 'Installed & Ready' : 'Unavailable'}</div>
            <div>Interfaces: {status?.local_network_engine.active_interfaces ?? 1} active</div>
          </div>
        </div>

        {/* Database Persistence */}
        <div className="p-5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold text-slate-200">Persistence Store</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              {status?.supabase.mode === 'cloud' ? 'SUPABASE CLOUD' : 'LOCAL OFFLINE'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {status?.supabase.mode === 'cloud'
              ? 'Synchronized with Supabase PostgreSQL cloud tables.'
              : 'Local JSON storage active. All data remains strictly on your local machine.'}
          </p>
          <div className="text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800">
            Mode: {status?.supabase.mode ?? 'offline_local'}
          </div>
        </div>

        {/* AI Service */}
        <div className="p-5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-200">AI Intelligence</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {status?.ai_service.configured ? 'GEMINI 3.6 FLASH' : 'LOCAL RULES'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Server-side AI analyst strictly grounded on real network telemetry with fact vs inference taxonomy.
          </p>
          <div className="text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800">
            Provider: {status?.ai_service.provider ?? 'Google Gemini'}
          </div>
        </div>
      </div>

      {/* Defensive Operational Scope & Ethics */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-semibold text-slate-100">Defensive Scope & Transparency Disclosure</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
            <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Authorized Defensive Operations
            </span>
            <ul className="space-y-1.5 text-slate-400 list-disc list-inside">
              <li>RFC 1918 Private Subnet Scans (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)</li>
              <li>Kernel routing table and interface inspection</li>
              <li>Local ARP neighbor table lookup</li>
              <li>Controlled ICMP Echo latency probes</li>
              <li>Defensive service identification (standard port banners)</li>
            </ul>
          </div>

          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
            <span className="font-semibold text-rose-400 flex items-center gap-1.5">
              <Lock className="w-4 h-4" />
              Strictly Forbidden Actions
            </span>
            <ul className="space-y-1.5 text-slate-400 list-disc list-inside">
              <li>No scanning of public WAN or internet-wide IPs</li>
              <li>No credential brute-forcing or default password guessing</li>
              <li>No exploitation or intrusive payloads</li>
              <li>No silent background scans without user approval</li>
              <li>No fabrication of unconfirmed network entities</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
