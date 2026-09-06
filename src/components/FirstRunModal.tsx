import React from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, ArrowRight, X } from 'lucide-react';
import { FirstRunInfo } from '../types';
import { ConfidenceBadge } from './ConfidenceBadge';

interface Props {
  info: FirstRunInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onStartDiscovery: () => void;
}

export const FirstRunModal: React.FC<Props> = ({
  info,
  isOpen,
  onClose,
  onStartDiscovery,
}) => {
  if (!isOpen) return null;

  const baseline = info?.network_baseline;
  const primaryIface = baseline?.primary_interface;
  const nmap = baseline?.nmap;

  return (
    <div
      id="first-run-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="first-run-modal-card"
        className="bg-zinc-950 border border-zinc-800 rounded-lg max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-mono font-bold text-zinc-100">
                NetScope System Discovery Baseline
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                Hardware inspection, boundary verification & safe authorization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Detected Hardware Environment */}
        <div className="space-y-2">
          <div className="text-xs font-mono font-semibold uppercase text-zinc-400 tracking-wider">
            Verified Network Baseline
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            {/* Local Interface & IP */}
            <div className="p-3 rounded bg-zinc-900/80 border border-zinc-800/80 space-y-1.5">
              <div className="text-zinc-400 flex items-center justify-between">
                <span>Active Interface:</span>
                <span className="text-zinc-200 font-bold">{primaryIface?.name || 'N/A'}</span>
              </div>
              <div className="text-zinc-400 flex items-center justify-between">
                <span>IPv4 Address:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-cyan-300 font-semibold">{primaryIface?.ipv4 || 'Unknown'}</span>
                  {primaryIface?.ipv4_confidence && (
                    <ConfidenceBadge level={primaryIface.ipv4_confidence} />
                  )}
                </div>
              </div>
              <div className="text-zinc-400 flex items-center justify-between">
                <span>Calculated Subnet:</span>
                <span className="text-zinc-300">{primaryIface?.cidr || 'N/A'}</span>
              </div>
              <div className="text-zinc-400 flex items-center justify-between">
                <span>MAC Address:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-300">{primaryIface?.mac_address || 'Virtual Link'}</span>
                  {primaryIface?.mac_confidence && (
                    <ConfidenceBadge level={primaryIface.mac_confidence} />
                  )}
                </div>
              </div>
            </div>

            {/* Gateway & DNS */}
            <div className="p-3 rounded bg-zinc-900/80 border border-zinc-800/80 space-y-1.5">
              <div className="text-zinc-400 flex items-center justify-between">
                <span>Default Gateway:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-200 font-semibold">{baseline?.gateway.ip || 'Point-to-point'}</span>
                  {baseline?.gateway.confidence && (
                    <ConfidenceBadge level={baseline.gateway.confidence} />
                  )}
                </div>
              </div>
              <div className="text-zinc-400 flex items-center justify-between">
                <span>DNS Server:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-300">{baseline?.dns_servers[0]?.ip || 'Unknown'}</span>
                  {baseline?.dns_servers[0]?.confidence && (
                    <ConfidenceBadge level={baseline.dns_servers[0].confidence} />
                  )}
                </div>
              </div>
              <div className="text-zinc-400 flex items-center justify-between">
                <span>Nmap Scanner:</span>
                <div className="flex items-center gap-1.5">
                  <span className={nmap?.available ? 'text-emerald-400' : 'text-amber-400'}>
                    {nmap?.available ? 'Ready' : 'Not installed'}
                  </span>
                  {nmap?.confidence && (
                    <ConfidenceBadge level={nmap.confidence} />
                  )}
                </div>
              </div>
              <div className="text-zinc-400 flex items-center justify-between">
                <span>Offline Capable:</span>
                <span className="text-emerald-400">Yes (Local engine)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Access Explanation */}
        <div className="p-3.5 rounded bg-zinc-900/90 border border-zinc-800 space-y-2 text-xs font-mono">
          <div className="text-zinc-300 font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Defensive Scanning Guidelines</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-400">
            <div className="space-y-1">
              <div className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Authorized Actions</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-zinc-300">
                <li>Local ARP cache query</li>
                <li>Controlled ICMP latency tests</li>
                <li>Local subnet service discovery</li>
                <li>Passive routing table inspection</li>
              </ul>
            </div>
            <div className="space-y-1">
              <div className="text-rose-400 font-semibold flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                <span>Prohibited Actions</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-zinc-300">
                <li>No internet-wide scanning</li>
                <li>No brute-force or exploitation</li>
                <li>No silent unannounced sweeps</li>
                <li>No arbitrary shell commands</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs font-mono text-zinc-400">
            Clicking Proceed acknowledges local-first telemetry access.
          </span>
          <button
            id="btn-confirm-first-run"
            onClick={() => {
              onStartDiscovery();
              onClose();
            }}
            className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-mono font-bold text-xs flex items-center gap-2 transition-colors shadow-md"
          >
            <span>Start Local Inspection</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
