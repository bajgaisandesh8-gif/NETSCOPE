import React, { useState } from 'react';
import {
  NetworkBaseline,
  SystemStatus,
  PingProbeResult
} from '../../types';
import { ConfidenceBadge } from '../ConfidenceBadge';
import {
  Activity,
  Globe,
  Radio,
  Server,
  Zap,
  Terminal,
  Clock,
  Play,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Props {
  baseline: NetworkBaseline | null;
  status: SystemStatus | null;
  onRefresh: () => void;
}

export const OverviewView: React.FC<Props> = ({ baseline, status }) => {
  const primary = baseline?.primary_interface;
  const gateway = baseline?.gateway;
  const gwProbe = baseline?.gateway_probe;
  const dnsProbe = baseline?.dns_probe;

  const [customPingTarget, setCustomPingTarget] = useState(gateway?.ip || '127.0.0.1');
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<PingProbeResult | null>(null);
  const [pingError, setPingError] = useState<string | null>(null);

  const handleRunPing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPingTarget) return;
    setIsPinging(true);
    setPingError(null);
    try {
      const res = await fetch('/api/diagnostics/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: customPingTarget, count: 2 }),
      });
      const data = await res.json();
      if (data.success) {
        setPingResult(data.result);
      } else {
        setPingError(data.error || 'Ping execution failed');
      }
    } catch (err) {
      setPingError(String(err));
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <div id="overview-view" className="space-y-6">
      {/* Top Banner: Real Interface Status & Health */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-zinc-900/70 border border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h1 className="text-base font-mono font-bold text-zinc-100">
              Live Network Topology Baseline
            </h1>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Real hardware metrics observed directly from Linux networking stack.
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
            Interfaces: <span className="text-cyan-300 font-bold">{baseline?.all_interfaces.length || 0}</span>
          </div>
          <div className="px-3 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
            Connectivity: <span className="text-emerald-400 font-bold">Online</span>
          </div>
        </div>
      </div>

      {/* Network Core KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Local IP */}
        <div id="card-local-ip" className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              Local IP Address
            </span>
            {primary?.ipv4_confidence && <ConfidenceBadge level={primary.ipv4_confidence} />}
          </div>
          <div className="text-lg font-mono font-bold text-zinc-100 tracking-tight">
            {primary?.ipv4 || 'Unknown'}
          </div>
          <div className="text-[11px] font-mono text-zinc-400 truncate">
            Device link: {primary?.name || 'lo'} (MTU: {primary?.mtu || 1500})
          </div>
        </div>

        {/* Subnet CIDR */}
        <div id="card-subnet" className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              Calculated Subnet
            </span>
            <ConfidenceBadge level="Detected" />
          </div>
          <div className="text-lg font-mono font-bold text-cyan-300 tracking-tight">
            {primary?.cidr || 'Detecting...'}
          </div>
          <div className="text-[11px] font-mono text-zinc-400">
            Netmask: {primary?.netmask || '255.255.255.0'}
          </div>
        </div>

        {/* Gateway & Latency */}
        <div id="card-gateway" className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              Default Gateway
            </span>
            {gateway?.confidence && <ConfidenceBadge level={gateway.confidence} />}
          </div>
          <div className="text-lg font-mono font-bold text-zinc-100 tracking-tight">
            {gateway?.ip || 'Direct Link'}
          </div>
          <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
            <span>Latency:</span>
            <span className="text-emerald-400 font-bold">
              {gwProbe?.avg_rtt_ms != null ? `${gwProbe.avg_rtt_ms.toFixed(2)} ms` : 'Unprobed'}
            </span>
          </div>
        </div>

        {/* DNS Server & Reachability */}
        <div id="card-dns" className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              DNS Server
            </span>
            {baseline?.dns_servers[0]?.confidence && (
              <ConfidenceBadge level={baseline.dns_servers[0].confidence} />
            )}
          </div>
          <div className="text-lg font-mono font-bold text-zinc-100 tracking-tight">
            {baseline?.dns_servers[0]?.ip || 'Unknown'}
          </div>
          <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
            <span>DNS Latency:</span>
            <span className="text-emerald-400 font-bold">
              {dnsProbe?.avg_rtt_ms != null ? `${dnsProbe.avg_rtt_ms.toFixed(2)} ms` : 'Unprobed'}
            </span>
          </div>
        </div>
      </div>

      {/* Interfaces Table & Live Diagnostic Probe Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hardware Interfaces Table (2 Cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-semibold uppercase text-zinc-400 tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Hardware Network Interfaces
            </h2>
            <span className="text-xs font-mono text-zinc-400">
              Verified by Linux Network Engine
            </span>
          </div>

          <div className="rounded-lg bg-zinc-900/60 border border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5">Interface</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">IPv4 Address</th>
                    <th className="px-4 py-2.5">MAC Address</th>
                    <th className="px-4 py-2.5">MTU</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  {baseline?.all_interfaces.map((iface) => (
                    <tr key={iface.name} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="px-4 py-3 font-bold text-zinc-200 flex items-center gap-2">
                        <span>{iface.name}</span>
                        {iface.is_loopback && (
                          <span className="text-[10px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400">
                            Loopback
                          </span>
                        )}
                        {iface.name === primary?.name && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                            Primary
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {iface.is_up ? 'UP' : 'DOWN'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span>{iface.ipv4 || '—'}</span>
                          {iface.ipv4_confidence && iface.ipv4 && (
                            <ConfidenceBadge level={iface.ipv4_confidence} />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        <div className="flex items-center gap-2">
                          <span>{iface.mac_address || 'Virtual link'}</span>
                          {iface.mac_confidence && iface.mac_address && (
                            <ConfidenceBadge level={iface.mac_confidence} />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{iface.mtu || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Live Safe ICMP Probe Console (1 Col) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-semibold uppercase text-zinc-400 tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              Controlled ICMP Ping Probe
            </h2>
            <span className="text-[10px] font-mono text-zinc-400">RFC1918 Safe</span>
          </div>

          <div className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-4">
            <form onSubmit={handleRunPing} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                  Target IP (Gateway or Subnet Host)
                </label>
                <div className="flex gap-2">
                  <input
                    id="input-ping-target"
                    type="text"
                    value={customPingTarget}
                    onChange={(e) => setCustomPingTarget(e.target.value)}
                    placeholder="e.g. 192.168.1.1 or gateway"
                    className="flex-1 px-3 py-1.5 rounded bg-zinc-950 border border-zinc-700 text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    id="btn-run-ping"
                    type="submit"
                    disabled={isPinging || !customPingTarget}
                    className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-mono font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Play className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
                    <span>{isPinging ? 'Probing...' : 'Probe'}</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Ping Error */}
            {pingError && (
              <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/60 text-xs font-mono text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{pingError}</span>
              </div>
            )}

            {/* Ping Result Display */}
            {pingResult && (
              <div className="p-3 rounded bg-zinc-950 border border-zinc-800 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    Probe Completed
                  </span>
                  <ConfidenceBadge level={pingResult.confidence} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                    <span className="text-zinc-400 block">Avg Latency</span>
                    <span className="text-zinc-100 font-bold text-sm">
                      {pingResult.avg_rtt_ms != null ? `${pingResult.avg_rtt_ms.toFixed(2)} ms` : 'N/A'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                    <span className="text-zinc-400 block">Packet Loss</span>
                    <span className={`font-bold text-sm ${pingResult.packet_loss_pct === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {pingResult.packet_loss_pct}%
                    </span>
                  </div>
                </div>
                {pingResult.raw_output && (
                  <pre className="p-2 rounded bg-black/70 text-[10px] text-zinc-400 overflow-x-auto whitespace-pre-wrap font-mono">
                    {pingResult.raw_output}
                  </pre>
                )}
              </div>
            )}

            {/* Nmap Status Card */}
            <div className="p-3 rounded bg-zinc-950/60 border border-zinc-800/80 space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-zinc-300">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  Nmap Engine Status
                </span>
                {baseline?.nmap.confidence && <ConfidenceBadge level={baseline.nmap.confidence} />}
              </div>
              <p className="text-[11px] text-zinc-400">
                {baseline?.nmap.version || 'Version probe pending'}
              </p>
              <div className="text-[10px] text-zinc-400">
                Path: <code className="text-zinc-300">{baseline?.nmap.path || 'N/A'}</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
