import React, { useState } from 'react';
import { NetworkBaseline } from '../../types';
import { 
  Terminal, 
  Send, 
  Globe, 
  Network, 
  Server, 
  Calculator, 
  CheckCircle2, 
  XCircle, 
  HelpCircle,
  Clock,
  Radio
} from 'lucide-react';

interface DiagnosticsViewProps {
  baseline: NetworkBaseline | null;
}

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({ baseline }) => {
  const [activeTab, setActiveTab] = useState<'ping' | 'traceroute' | 'dns' | 'port' | 'subnet'>('ping');

  // Ping state
  const [pingTarget, setPingTarget] = useState(baseline?.gateway.ip || '127.0.0.1');
  const [pingCount, setPingCount] = useState(3);
  const [pingSize, setPingSize] = useState(56);
  const [pingLoading, setPingLoading] = useState(false);
  const [pingResult, setPingResult] = useState<any>(null);

  // Traceroute state
  const [traceTarget, setTraceTarget] = useState(baseline?.gateway.ip || '127.0.0.1');
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceResult, setTraceResult] = useState<any>(null);

  // DNS state
  const [dnsQuery, setDnsQuery] = useState(baseline?.gateway.ip || 'localhost');
  const [dnsLoading, setDnsLoading] = useState(false);
  const [dnsResult, setDnsResult] = useState<any>(null);

  // Port check state
  const [portTarget, setPortTarget] = useState('127.0.0.1');
  const [portNum, setPortNum] = useState(80);
  const [portLoading, setPortLoading] = useState(false);
  const [portResult, setPortResult] = useState<any>(null);

  // Subnet calculator state
  const [subnetCidr, setSubnetCidr] = useState(baseline?.primary_interface?.cidr || '192.168.1.0/24');
  const [subnetLoading, setSubnetLoading] = useState(false);
  const [subnetResult, setSubnetResult] = useState<any>(null);

  // Handlers
  const handlePing = async (e: React.FormEvent) => {
    e.preventDefault();
    setPingLoading(true);
    setPingResult(null);
    try {
      const res = await fetch('/api/diagnostics/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: pingTarget, count: pingCount, packet_size: pingSize }),
      });
      const data = await res.json();
      setPingResult(data);
    } catch (err: any) {
      setPingResult({ success: false, error: err.message });
    } finally {
      setPingLoading(false);
    }
  };

  const handleTraceroute = async (e: React.FormEvent) => {
    e.preventDefault();
    setTraceLoading(true);
    setTraceResult(null);
    try {
      const res = await fetch('/api/diagnostics/traceroute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: traceTarget }),
      });
      const data = await res.json();
      setTraceResult(data);
    } catch (err: any) {
      setTraceResult({ success: false, error: err.message });
    } finally {
      setTraceLoading(false);
    }
  };

  const handleDns = async (e: React.FormEvent) => {
    e.preventDefault();
    setDnsLoading(true);
    setDnsResult(null);
    try {
      const res = await fetch('/api/diagnostics/dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: dnsQuery }),
      });
      const data = await res.json();
      setDnsResult(data);
    } catch (err: any) {
      setDnsResult({ success: false, error: err.message });
    } finally {
      setDnsLoading(false);
    }
  };

  const handlePort = async (e: React.FormEvent) => {
    e.preventDefault();
    setPortLoading(true);
    setPortResult(null);
    try {
      const res = await fetch('/api/diagnostics/port', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: portTarget, port: portNum }),
      });
      const data = await res.json();
      setPortResult(data);
    } catch (err: any) {
      setPortResult({ success: false, error: err.message });
    } finally {
      setPortLoading(false);
    }
  };

  const handleSubnet = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubnetLoading(true);
    setSubnetResult(null);
    try {
      const res = await fetch('/api/diagnostics/subnet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cidr: subnetCidr }),
      });
      const data = await res.json();
      setSubnetResult(data);
    } catch (err: any) {
      setSubnetResult({ success: false, error: err.message });
    } finally {
      setSubnetLoading(false);
    }
  };

  return (
    <div id="diagnostics-view-container" className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('ping')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'ping'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Ping Probe</span>
        </button>

        <button
          onClick={() => setActiveTab('traceroute')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'traceroute'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>Hop Traceroute</span>
        </button>

        <button
          onClick={() => setActiveTab('dns')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'dns'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>DNS Resolver</span>
        </button>

        <button
          onClick={() => setActiveTab('port')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'port'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>TCP Port Check</span>
        </button>

        <button
          onClick={() => setActiveTab('subnet')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'subnet'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>CIDR Subnet Calculator</span>
        </button>
      </div>

      {/* Tab 1: Ping Probe */}
      {activeTab === 'ping' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">ICMP Ping Probe</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Transmit controlled ICMP Echo Request packets to verify local host reachability and round-trip time.
            </p>
          </div>

          <form onSubmit={handlePing} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1">Target IPv4 / Hostname</label>
              <input
                type="text"
                value={pingTarget}
                onChange={(e) => setPingTarget(e.target.value)}
                placeholder="e.g. 192.168.1.1 or 127.0.0.1"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Count (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={pingCount}
                onChange={(e) => setPingCount(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              type="submit"
              disabled={pingLoading}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Send className={`w-3.5 h-3.5 ${pingLoading ? 'animate-spin' : ''}`} />
              <span>{pingLoading ? 'Executing...' : 'Run Ping Probe'}</span>
            </button>
          </form>

          {pingResult && (
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
              {pingResult.success && pingResult.result ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-900 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-mono block">Packet Loss</span>
                      <span className="text-lg font-bold font-mono text-slate-100">
                        {pingResult.result.packet_loss_pct}%
                      </span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-mono block">Avg Latency</span>
                      <span className="text-lg font-bold font-mono text-cyan-400">
                        {pingResult.result.avg_rtt_ms !== null ? `${pingResult.result.avg_rtt_ms} ms` : 'N/A'}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-mono block">Min / Max</span>
                      <span className="text-xs font-mono text-slate-300 block mt-1">
                        {pingResult.result.min_rtt_ms} / {pingResult.result.max_rtt_ms} ms
                      </span>
                    </div>
                  </div>

                  {pingResult.result.raw_output && (
                    <pre className="p-3 bg-slate-900/80 rounded border border-slate-800/80 text-[11px] font-mono text-slate-300 overflow-x-auto">
                      {pingResult.result.raw_output}
                    </pre>
                  )}
                </div>
              ) : (
                <div className="text-xs text-rose-400 font-mono">
                  Error: {pingResult.error || 'Probe failed'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Traceroute */}
      {activeTab === 'traceroute' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Safe Route Traceroute</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspect intermediary network hops and forwarding nodes leading to the destination.
            </p>
          </div>

          <form onSubmit={handleTraceroute} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-400 mb-1">Target IPv4</label>
              <input
                type="text"
                value={traceTarget}
                onChange={(e) => setTraceTarget(e.target.value)}
                placeholder="192.168.1.1"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={traceLoading}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Send className={`w-3.5 h-3.5 ${traceLoading ? 'animate-spin' : ''}`} />
              <span>{traceLoading ? 'Tracing...' : 'Run Traceroute'}</span>
            </button>
          </form>

          {traceResult && (
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              {traceResult.success && traceResult.hops ? (
                <div className="space-y-1 font-mono text-xs">
                  {traceResult.hops.map((h: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-500">Hop {h.hop}</span>
                      <span className="text-cyan-400 font-medium">{h.ip}</span>
                      <span className="text-slate-300">{h.rtt || 'Direct link'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-rose-400 font-mono">
                  {traceResult.error || 'Traceroute failed'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: DNS Resolver */}
      {activeTab === 'dns' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">DNS Resolution Query</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Perform forward hostname lookup (A records) or reverse IP query (PTR records).
            </p>
          </div>

          <form onSubmit={handleDns} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-400 mb-1">Hostname or IP Address</label>
              <input
                type="text"
                value={dnsQuery}
                onChange={(e) => setDnsQuery(e.target.value)}
                placeholder="e.g. gateway.local or 192.168.1.1"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={dnsLoading}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Send className={`w-3.5 h-3.5 ${dnsLoading ? 'animate-spin' : ''}`} />
              <span>{dnsLoading ? 'Querying...' : 'Resolve Query'}</span>
            </button>
          </form>

          {dnsResult && (
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
              {dnsResult.success && dnsResult.records ? (
                <div className="space-y-2 font-mono text-xs">
                  {dnsResult.records.map((r: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded bg-slate-900 border border-slate-800">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-400 text-[10px] font-bold">
                        {r.type}
                      </span>
                      <span className="text-slate-300">{r.record}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-rose-400 font-mono">
                  {dnsResult.error || 'Resolution failed'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: TCP Port Check */}
      {activeTab === 'port' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Safe TCP Port Connection Test</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Direct TCP three-way handshake test on a specific RFC 1918 safe IP address.
            </p>
          </div>

          <form onSubmit={handlePort} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1">Target Host IP</label>
              <input
                type="text"
                value={portTarget}
                onChange={(e) => setPortTarget(e.target.value)}
                placeholder="127.0.0.1"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Port Number (1-65535)</label>
              <input
                type="number"
                min="1"
                max="65535"
                value={portNum}
                onChange={(e) => setPortNum(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              type="submit"
              disabled={portLoading}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Send className={`w-3.5 h-3.5 ${portLoading ? 'animate-spin' : ''}`} />
              <span>{portLoading ? 'Testing...' : 'Test Port'}</span>
            </button>
          </form>

          {portResult && (
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
              {portResult.success ? (
                <div className="flex items-center justify-between p-3 rounded bg-slate-900 border border-slate-800 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    {portResult.is_open ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="text-slate-200">
                      {portResult.target}:{portResult.port}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      portResult.is_open
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {portResult.status} {portResult.latency_ms ? `(${portResult.latency_ms} ms)` : ''}
                  </span>
                </div>
              ) : (
                <div className="text-xs text-rose-400 font-mono">
                  {portResult.error || 'Port check failed'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Subnet Calculator */}
      {activeTab === 'subnet' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">CIDR Subnet Calculator</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Calculate network bounds, broadcast, netmask, wildcard mask, and usable host count.
            </p>
          </div>

          <form onSubmit={handleSubnet} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-400 mb-1">Subnet in CIDR Notation</label>
              <input
                type="text"
                value={subnetCidr}
                onChange={(e) => setSubnetCidr(e.target.value)}
                placeholder="192.168.1.0/24"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={subnetLoading}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Calculator className={`w-3.5 h-3.5 ${subnetLoading ? 'animate-spin' : ''}`} />
              <span>Calculate</span>
            </button>
          </form>

          {subnetResult && subnetResult.success && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs">
              <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block font-sans">Network Address</span>
                <span className="text-slate-100 font-semibold">{subnetResult.network_address}</span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block font-sans">Broadcast Address</span>
                <span className="text-slate-100 font-semibold">{subnetResult.broadcast_address}</span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block font-sans">Subnet Mask</span>
                <span className="text-slate-100 font-semibold">{subnetResult.netmask}</span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block font-sans">Wildcard Mask</span>
                <span className="text-slate-100 font-semibold">{subnetResult.wildcard_mask}</span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block font-sans">First Usable IP</span>
                <span className="text-cyan-400 font-semibold">{subnetResult.first_usable_ip}</span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block font-sans">Last Usable IP</span>
                <span className="text-cyan-400 font-semibold">{subnetResult.last_usable_ip}</span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block font-sans">Total Usable Hosts</span>
                <span className="text-emerald-400 font-semibold">{subnetResult.usable_hosts}</span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block font-sans">RFC 1918 Private</span>
                <span className="text-slate-200">{subnetResult.is_private ? 'Yes (Safe)' : 'No (Public)'}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
