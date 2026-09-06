import React, { useState, useRef, useEffect } from 'react';
import { Device, NetworkBaseline } from '../../types';
import { Radio, Server, Laptop, Smartphone, HelpCircle, Shield, Layers, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

interface TopologyViewProps {
  devices: Device[];
  baseline: NetworkBaseline | null;
  onSelectDevice?: (dev: Device) => void;
}

export const TopologyView: React.FC<TopologyViewProps> = ({
  devices,
  baseline,
  onSelectDevice,
}) => {
  const [selectedNode, setSelectedNode] = useState<Device | null>(null);
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);

  const gatewayIp = baseline?.gateway.ip || (devices.find((d) => d.is_gateway)?.ip ?? '192.168.1.1');
  const gatewayDevice = devices.find((d) => d.is_gateway) || {
    id: 'gw-auto',
    ip: gatewayIp,
    hostname: 'Default Gateway',
    is_gateway: true,
    device_type: 'Router / Gateway',
    vendor: 'Network Gateway',
    is_online: true,
    mac_address: 'Unavailable',
    mac_confidence: 'Unavailable' as const,
    vendor_confidence: 'Inferred' as const,
    hostname_confidence: 'Likely' as const,
    type_confidence: 'Likely' as const,
    first_seen: new Date().toISOString(),
    last_seen: new Date().toISOString(),
    observation_count: 1,
    services: [],
  };

  const nonGatewayDevices = devices.filter((d) => !d.is_gateway);

  return (
    <div id="topology-view-container" className="space-y-4">
      {/* Header Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Interactive Network Topology Graph</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Hierarchical mapping of local gateway routing, subnets, and connected endpoints.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.1, 0.7))}
              className="p-1 text-slate-400 hover:text-slate-200"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-slate-300 px-2">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.1, 1.4))}
              className="p-1 text-slate-400 hover:text-slate-200"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Visual Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          ref={canvasRef}
          className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-8 min-h-[460px] relative overflow-hidden flex items-center justify-center shadow-inner"
        >
          {/* Subtle Grid Background Pattern */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          <div
            className="transition-transform duration-300 flex flex-col items-center gap-12 relative z-10"
            style={{ transform: `scale(${zoom})` }}
          >
            {/* Gateway Central Hub */}
            <div
              onClick={() => {
                setSelectedNode(gatewayDevice);
                if (onSelectDevice) onSelectDevice(gatewayDevice);
              }}
              className={`group cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                selectedNode?.ip === gatewayDevice.ip
                  ? 'bg-emerald-500/20 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-900/90 border-emerald-500/50 hover:border-emerald-400'
              }`}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                  <Radio className="w-6 h-6" />
                </div>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
              </div>
              <div className="text-center">
                <span className="font-mono text-xs font-bold text-slate-100 block">{gatewayDevice.ip}</span>
                <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Gateway Router</span>
              </div>
            </div>

            {/* Connecting Trunk Line */}
            <div className="w-0.5 h-8 bg-slate-700 relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            </div>

            {/* Endpoint Devices Node Ring */}
            <div className="flex flex-wrap justify-center gap-6 max-w-xl">
              {nonGatewayDevices.length === 0 ? (
                <div className="text-center p-6 bg-slate-900/80 rounded-xl border border-slate-800 text-slate-500 text-xs">
                  Only the local node/gateway is currently observed. Run a discovery scan to map additional endpoints.
                </div>
              ) : (
                nonGatewayDevices.map((dev) => {
                  const isSelected = selectedNode?.id === dev.id;
                  return (
                    <div
                      key={dev.id}
                      onClick={() => {
                        setSelectedNode(dev);
                        if (onSelectDevice) onSelectDevice(dev);
                      }}
                      className={`cursor-pointer p-3 rounded-xl border transition-all flex flex-col items-center gap-1.5 w-32 ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-slate-800 text-cyan-400 flex items-center justify-center border border-slate-700">
                        {dev.device_type.includes('Server') ? (
                          <Server className="w-4 h-4" />
                        ) : dev.device_type.includes('Mobile') ? (
                          <Smartphone className="w-4 h-4" />
                        ) : (
                          <Laptop className="w-4 h-4" />
                        )}
                      </div>
                      <div className="text-center w-full">
                        <span className="font-mono text-xs font-medium text-slate-200 truncate block">
                          {dev.nickname || dev.ip}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {dev.hostname || dev.vendor || 'Local Node'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Selected Node Details Panel */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-slate-100">Node Properties</h3>
            <p className="text-xs text-slate-500">Select any node on the canvas to inspect observed parameters</p>
          </div>

          {selectedNode ? (
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block">IP Address:</span>
                <span className="font-mono font-bold text-slate-100 text-sm">{selectedNode.ip}</span>
              </div>

              <div>
                <span className="text-slate-500 block">Device Role:</span>
                <span className="text-slate-200 font-medium">
                  {selectedNode.is_gateway ? 'Default Gateway / Router' : selectedNode.device_type}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Hardware MAC:</span>
                <span className="font-mono text-slate-300">{selectedNode.mac_address || 'Unavailable'}</span>
              </div>

              <div>
                <span className="text-slate-500 block">Identified Vendor:</span>
                <span className="text-slate-200">{selectedNode.vendor || 'Unknown Vendor'}</span>
              </div>

              <div>
                <span className="text-slate-500 block">Hostname:</span>
                <span className="font-mono text-slate-300">{selectedNode.hostname || 'None resolved'}</span>
              </div>

              {selectedNode.services && selectedNode.services.length > 0 && (
                <div>
                  <span className="text-slate-500 block mb-1">Open Services:</span>
                  <div className="space-y-1">
                    {selectedNode.services.map((s, idx) => (
                      <div key={idx} className="p-1.5 bg-slate-950 rounded border border-slate-800 font-mono text-[11px] text-cyan-300 flex justify-between">
                        <span>{s.port}/{s.protocol} ({s.service})</span>
                        <span className="text-emerald-400">{s.state}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs italic">
              Click a device node on the topology map to view routing and hardware parameters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
