import React from 'react';
import { NavigationTab } from '../../types';
import { ShieldCheck, Cpu, ArrowRight } from 'lucide-react';

interface Props {
  tab: NavigationTab;
  onGoToOverview: () => void;
}

const TAB_META: Record<NavigationTab, { title: string; phase: string; desc: string; goals: string[] }> = {
  overview: {
    title: 'Overview',
    phase: 'Phase 1 & 2',
    desc: 'Local network topology, hardware interfaces, and gateway baseline.',
    goals: ['Hardware detection', 'Live latency', 'DNS reachability']
  },
  devices: {
    title: 'Device Inventory',
    phase: 'Phase 3 — Device Discovery',
    desc: 'Professional inventory of connected devices discovered through local ARP and controlled Nmap probes.',
    goals: ['MAC/Vendor identification', 'Confidence indicators', 'Device classification', 'Historical tracking']
  },
  '3d-network': {
    title: '3D Network Visualization',
    phase: 'Phase 6 — 3D Network',
    desc: 'Interactive Three.js & React Three Fiber topology map illustrating real observed relationships and inferred node topologies.',
    goals: ['Interactive 3D graph', 'Pan/Zoom/Rotate', 'Node detail drawers', 'Latency visualizers']
  },
  health: {
    title: 'Network Health Telemetry',
    phase: 'Phase 4 — Monitoring & Health',
    desc: 'Continuous non-intrusive latency, packet loss, and interface state monitoring.',
    goals: ['Time-series RTT charts', 'Gateway packet loss trends', 'Jitter metrics']
  },
  events: {
    title: 'Network Event Engine',
    phase: 'Phase 4 — Event Engine',
    desc: 'Real-time detection and deduplication of network state changes.',
    goals: ['NEW_DEVICE signals', 'IP/MAC alterations', 'Service state changes', 'Gateway shifts']
  },
  history: {
    title: 'Network Time Machine',
    phase: 'Phase 5 — History',
    desc: 'Compare network snapshots between current state, yesterday, previous week, or custom intervals.',
    goals: ['Differential diffing', 'New/Missing device alerts', 'Topology shifts']
  },
  diagnostics: {
    title: 'Defensive Network Diagnostics',
    phase: 'Phase 7 — Diagnostics',
    desc: 'Suite of safe network testing tools including ICMP ping, DNS lookup, gateway traceroute, and CIDR subnet calculation.',
    goals: ['Safe subprocess execution', 'Root cause explanations', 'Actionable remediation']
  },
  security: {
    title: 'Security Center',
    phase: 'Phase 8 — Security Center',
    desc: 'Defensive visibility for unknown MACs, unexpected port exposures, and anomalous topology shifts without ungrounded alarms.',
    goals: ['Evidence-based observations', 'Unknown device classification', 'Service exposure matrix']
  },
  analytics: {
    title: 'Network Analytics',
    phase: 'Phase 10 — Analytics',
    desc: 'Visual distribution of hardware vendors, online ratios, subnet density, and latency percentiles.',
    goals: ['Recharts metric distributions', 'Peak utilization hours', 'Device churn rates']
  },
  ai: {
    title: 'NetScope AI Network Analyst',
    phase: 'Phase 9 — NetScope AI',
    desc: 'Grounded network investigation assistant separating FACT, INFERENCE, and POSSIBILITY based strictly on observed NetScope telemetry.',
    goals: ['Direct network state context', 'Root cause reasoning', 'Zero hallucinated IPs']
  },
  reports: {
    title: 'Auditing & Reports',
    phase: 'Phase 10 — Reporting',
    desc: 'Generate downloadable JSON, CSV, and PDF compliance and diagnostic reports containing real timestamps.',
    goals: ['Cryptographic timestamping', 'Raw JSON export', 'Executive summary']
  },
  settings: {
    title: 'Platform Settings & Privacy',
    phase: 'Phase 1 & Settings',
    desc: 'Supabase PostgreSQL synchronization, scan throttling, RFC1918 authorized subnet filters, and local retention limits.',
    goals: ['Data purge controls', 'Scan frequency limiter', 'Cloud toggle']
  }
};

export const ModulePlaceholder: React.FC<Props> = ({ tab, onGoToOverview }) => {
  const meta = TAB_META[tab] || TAB_META.overview;

  return (
    <div id={`module-view-${tab}`} className="p-8 rounded-lg bg-zinc-900/40 border border-zinc-800 space-y-6 max-w-4xl mx-auto my-8">
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
        <div className="w-10 h-10 rounded bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <Cpu className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-mono font-bold text-zinc-100">{meta.title}</h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              {meta.phase}
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">{meta.desc}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs font-mono font-semibold uppercase text-zinc-400 tracking-wider">
          Planned Architectural Milestones
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {meta.goals.map((goal, idx) => (
            <div key={idx} className="p-3 rounded bg-zinc-950/80 border border-zinc-800 text-xs font-mono text-zinc-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{goal}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2 flex items-center justify-between text-xs font-mono text-zinc-400">
        <span>Foundation and Network Baseline (Phase 1) is active and running live.</span>
        <button
          onClick={onGoToOverview}
          className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1.5 transition-colors"
        >
          <span>Return to Overview</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
