import React, { useState } from 'react';
import { Device, NetworkBaseline, SecurityPosture, HealthMetrics } from '../../types';
import { FileText, Download, ShieldCheck, CheckCircle2, Hash, Printer } from 'lucide-react';

interface ReportsViewProps {
  devices: Device[];
  baseline: NetworkBaseline | null;
  security: SecurityPosture | null;
  health: HealthMetrics | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  devices,
  baseline,
  security,
  health,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const downloadJson = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/reports/export?format=json');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `netscope_audit_report_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const downloadCsv = () => {
    window.location.href = '/api/reports/export?format=csv';
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="reports-view-container" className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-slate-100">Network Intelligence Reports & Audits</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Export verifiable, cryptographically hashed network inventory records and executive defense summaries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={downloadCsv}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={downloadJson}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Generating...' : 'Export Signed JSON'}</span>
          </button>
        </div>
      </div>

      {/* Printable Executive Audit Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-8 shadow-sm space-y-6 print:border-none print:p-0">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-100 font-mono tracking-tight">NETSCOPE EXECUTIVE AUDIT SUMMARY</h3>
            <span className="text-xs text-slate-500">Defensive Local Network Posture & Device Inventory Certification</span>
          </div>
          <button
            onClick={handlePrint}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors print:hidden"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print View</span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Security Score</span>
            <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
              {security?.score ?? 100}/100
            </span>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Audited Hosts</span>
            <span className="text-2xl font-bold font-mono text-slate-100 mt-1 block">
              {devices.length}
            </span>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Primary Gateway</span>
            <span className="text-sm font-bold font-mono text-cyan-400 mt-2 block truncate">
              {baseline?.gateway.ip || '127.0.0.1'}
            </span>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Avg Telemetry Latency</span>
            <span className="text-2xl font-bold font-mono text-slate-100 mt-1 block">
              {health?.avg_rtt_ms ?? 0.5} ms
            </span>
          </div>
        </div>

        {/* Security Findings Summary */}
        <div className="space-y-2">
          <h4 className="text-xs uppercase font-mono font-bold text-slate-400 tracking-wider">Defensive Findings & Observations</h4>
          {(!security?.findings || security.findings.length === 0) ? (
            <p className="text-xs text-slate-500 italic p-3 bg-slate-950 rounded border border-slate-800">
              No anomalies or insecure open services observed.
            </p>
          ) : (
            <div className="space-y-1.5">
              {security.findings.map((f) => (
                <div key={f.id} className="p-3 bg-slate-950 rounded border border-slate-800 text-xs flex justify-between items-center">
                  <span className="text-slate-200 font-medium">{f.title}</span>
                  <span className="text-slate-500 font-mono text-[11px]">{f.evidence}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Device Table Snapshot */}
        <div className="space-y-2">
          <h4 className="text-xs uppercase font-mono font-bold text-slate-400 tracking-wider">Certified Host Inventory</h4>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 overflow-x-auto">
            <table className="w-full text-left font-mono text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-[11px]">
                  <th className="py-2">IP Address</th>
                  <th className="py-2">Hardware MAC</th>
                  <th className="py-2">Resolved Hostname</th>
                  <th className="py-2">Vendor</th>
                  <th className="py-2">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {devices.map((d) => (
                  <tr key={d.id}>
                    <td className="py-2 text-cyan-400">{d.ip}</td>
                    <td className="py-2 text-slate-400">{d.mac_address || 'N/A'}</td>
                    <td className="py-2 text-slate-300">{d.hostname || 'None'}</td>
                    <td className="py-2 text-slate-400">{d.vendor || 'Unknown'}</td>
                    <td className="py-2 text-slate-300">{d.device_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cryptographic Footprint */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-cyan-400" />
            <span>Cryptographic JSON Checksum applied upon export</span>
          </div>
          <span>Report Generated: {new Date().toUTCString()}</span>
        </div>
      </div>
    </div>
  );
};
