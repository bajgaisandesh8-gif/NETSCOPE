import React, { useState } from 'react';
import { HealthMetrics, NetworkBaseline } from '../../types';
import { 
  Activity, 
  Zap, 
  TrendingDown, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  Send
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface HealthViewProps {
  metrics: HealthMetrics | null;
  baseline: NetworkBaseline | null;
  onRunProbe: () => Promise<void>;
  isLoading: boolean;
}

export const HealthView: React.FC<HealthViewProps> = ({
  metrics,
  baseline,
  onRunProbe,
  isLoading,
}) => {
  const [customTarget, setCustomTarget] = useState(baseline?.gateway.ip || '127.0.0.1');

  const historyData = metrics?.history && metrics.history.length > 0
    ? metrics.history.map((s, idx) => ({
        index: idx + 1,
        time: new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        rtt: s.rtt_ms !== null ? s.rtt_ms : 0,
        loss: s.packet_loss_pct,
      }))
    : [
        { index: 1, time: '0s', rtt: metrics?.avg_rtt_ms || 0.4, loss: 0 },
        { index: 2, time: '5s', rtt: (metrics?.avg_rtt_ms || 0.4) * 1.1, loss: 0 },
      ];

  const currentRtt = metrics?.current_rtt_ms ?? metrics?.avg_rtt_ms ?? 0;
  const avgRtt = metrics?.avg_rtt_ms ?? 0;
  const jitter = metrics?.jitter_ms ?? 0;
  const packetLoss = metrics?.avg_packet_loss_pct ?? 0;

  const getHealthStatus = () => {
    if (packetLoss > 10) return { label: 'Degraded (Packet Loss)', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
    if (avgRtt > 80 || jitter > 25) return { label: 'Unstable Latency', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    return { label: 'Optimal & Stable', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
  };

  const status = getHealthStatus();

  return (
    <div id="health-view-container" className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">Network Health & Telemetry</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${status.color}`}>
                  {status.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Continuous non-destructive latency tracking, jitter variance, and packet loss monitoring.
              </p>
            </div>
          </div>

          <button
            onClick={onRunProbe}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Send Telemetry Probe</span>
          </button>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-4 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] uppercase tracking-wider font-semibold">Current RTT</span>
              <Clock className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-slate-100">{currentRtt}</span>
              <span className="text-xs text-slate-400 font-mono">ms</span>
            </div>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] uppercase tracking-wider font-semibold">Average RTT</span>
              <TrendingDown className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-slate-100">{avgRtt}</span>
              <span className="text-xs text-slate-400 font-mono">ms</span>
            </div>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] uppercase tracking-wider font-semibold">Network Jitter</span>
              <Zap className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-slate-100">{jitter}</span>
              <span className="text-xs text-slate-400 font-mono">ms</span>
            </div>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] uppercase tracking-wider font-semibold">Packet Loss</span>
              <AlertCircle className={`w-4 h-4 ${packetLoss > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className={`text-2xl font-bold font-mono ${packetLoss > 0 ? 'text-rose-400' : 'text-slate-100'}`}>
                {packetLoss}
              </span>
              <span className="text-xs text-slate-400 font-mono">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Latency History Chart */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Rolling Latency Trend</h3>
            <p className="text-xs text-slate-400">Response time variation sampled across consecutive ping cycles</p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Target: {baseline?.gateway.ip || 'Local Gateway'}
          </span>
        </div>

        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} unit="ms" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#f8fafc',
                }}
              />
              <Line
                type="monotone"
                dataKey="rtt"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={{ r: 3, fill: '#06b6d4' }}
                activeDot={{ r: 5 }}
                name="Latency (ms)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
