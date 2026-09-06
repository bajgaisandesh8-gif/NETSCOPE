import React, { useState } from 'react';
import { Device, ConfidenceLevel } from '../../types';
import { ConfidenceBadge } from '../ConfidenceBadge';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Server, 
  Smartphone, 
  Laptop, 
  Tv, 
  HelpCircle, 
  ShieldAlert, 
  ExternalLink,
  Edit2,
  Check,
  X,
  Radio
} from 'lucide-react';

interface DevicesViewProps {
  devices: Device[];
  isScanning: boolean;
  onTriggerScan: (subnet?: string) => Promise<void>;
  onUpdateDevice: (id: string, updates: { nickname?: string; device_type?: string }) => Promise<void>;
}

export const DevicesView: React.FC<DevicesViewProps> = ({
  devices,
  isScanning,
  onTriggerScan,
  onUpdateDevice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [customSubnet, setCustomSubnet] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNickname, setEditNickname] = useState('');
  const [editType, setEditType] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  const filteredDevices = devices.filter((dev) => {
    const matchesSearch =
      dev.ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dev.hostname && dev.hostname.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (dev.vendor && dev.vendor.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (dev.mac_address && dev.mac_address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (dev.nickname && dev.nickname.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType =
      filterType === 'all' ||
      (filterType === 'gateway' && dev.is_gateway) ||
      (filterType === 'unknown' && (!dev.vendor || dev.vendor === 'Unknown Vendor')) ||
      (filterType === 'services' && dev.services && dev.services.length > 0) ||
      dev.device_type.toLowerCase().includes(filterType.toLowerCase());

    return matchesSearch && matchesType;
  });

  const getDeviceIcon = (type: string, isGateway: boolean) => {
    if (isGateway) return <Radio className="w-4 h-4 text-emerald-400" />;
    const lower = type.toLowerCase();
    if (lower.includes('server') || lower.includes('node')) return <Server className="w-4 h-4 text-sky-400" />;
    if (lower.includes('mobile') || lower.includes('phone')) return <Smartphone className="w-4 h-4 text-purple-400" />;
    if (lower.includes('laptop') || lower.includes('workstation')) return <Laptop className="w-4 h-4 text-blue-400" />;
    if (lower.includes('tv') || lower.includes('media')) return <Tv className="w-4 h-4 text-amber-400" />;
    return <HelpCircle className="w-4 h-4 text-slate-400" />;
  };

  const handleStartEdit = (dev: Device) => {
    setEditingId(dev.id);
    setEditNickname(dev.nickname || '');
    setEditType(dev.device_type || 'Unknown');
  };

  const handleSaveEdit = async (id: string) => {
    await onUpdateDevice(id, {
      nickname: editNickname.trim() || undefined,
      device_type: editType.trim() || undefined,
    });
    setEditingId(null);
  };

  return (
    <div id="devices-view-container" className="space-y-6">
      {/* Top Controls Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-sm">
        {/* Search & Filter */}
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="device-search-input"
              type="text"
              placeholder="Search by IP, MAC, hostname, or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              id="device-type-filter"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Devices ({devices.length})</option>
              <option value="gateway">Gateways</option>
              <option value="server">Servers / Nodes</option>
              <option value="services">With Open Services</option>
              <option value="unknown">Unknown Vendors</option>
            </select>
          </div>
        </div>

        {/* Scan Trigger */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Subnet (e.g. 192.168.1.0/24)"
            value={customSubnet}
            onChange={(e) => setCustomSubnet(e.target.value)}
            className="w-48 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
          />
          <button
            id="trigger-discovery-btn"
            onClick={() => onTriggerScan(customSubnet.trim() || undefined)}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning...' : 'Scan Subnet'}</span>
          </button>
        </div>
      </div>

      {/* Device Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-200">Discovered Device Inventory</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-mono">
              {filteredDevices.length} hosts
            </span>
          </div>
          <span className="text-xs text-slate-500">Confidence tagging applied to all detected parameters</span>
        </div>

        {filteredDevices.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <p className="text-sm">No devices found matching current filters.</p>
            <button
              onClick={() => onTriggerScan()}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
            >
              Run Discovery Scan
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider font-mono border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Device / IP</th>
                  <th className="py-3 px-4">Hostname</th>
                  <th className="py-3 px-4">MAC & Vendor</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Open Services</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredDevices.map((dev) => (
                  <tr
                    key={dev.id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => setSelectedDevice(dev)}
                  >
                    {/* Device / IP */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                          {getDeviceIcon(dev.device_type, dev.is_gateway)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-medium text-slate-100">{dev.ip}</span>
                            {dev.is_gateway && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                GATEWAY
                              </span>
                            )}
                          </div>
                          {dev.nickname ? (
                            <div className="text-xs text-cyan-400 font-medium">{dev.nickname}</div>
                          ) : (
                            <div className="text-[11px] text-slate-500">Unlabeled node</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Hostname */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs text-slate-200">
                          {dev.hostname || <span className="text-slate-600 italic">None resolved</span>}
                        </span>
                        <ConfidenceBadge level={dev.hostname_confidence} size="sm" />
                      </div>
                    </td>

                    {/* MAC & Vendor */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-slate-300">{dev.mac_address || 'Unavailable'}</span>
                          <ConfidenceBadge level={dev.mac_confidence} size="sm" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400 truncate max-w-[140px]">
                            {dev.vendor || 'Unknown Vendor'}
                          </span>
                          <ConfidenceBadge level={dev.vendor_confidence} size="sm" />
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-300 font-medium">{dev.device_type}</span>
                        <ConfidenceBadge level={dev.type_confidence} size="sm" />
                      </div>
                    </td>

                    {/* Open Services */}
                    <td className="py-3.5 px-4">
                      {dev.services && dev.services.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {dev.services.map((s, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-cyan-300 border border-slate-700"
                              title={`${s.service} on port ${s.port}/${s.protocol}`}
                            >
                              {s.port} {s.service}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600 italic">None detected</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            dev.is_online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                          }`}
                        />
                        <span className="text-xs text-slate-300">{dev.is_online ? 'Active' : 'Dormant'}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleStartEdit(dev)}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors"
                        title="Edit nickname or classification"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-slate-100">Edit Device Classification</h3>
              <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Custom Nickname</label>
                <input
                  type="text"
                  placeholder="e.g. Living Room TV or Core Switch"
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Device Type</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Router / Gateway">Router / Gateway</option>
                  <option value="Server / Node">Server / Node</option>
                  <option value="Workstation / PC">Workstation / PC</option>
                  <option value="Mobile Device">Mobile Device</option>
                  <option value="Smart TV / Media">Smart TV / Media</option>
                  <option value="IoT Device">IoT Device</option>
                  <option value="Printer">Printer</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingId(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveEdit(editingId)}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-medium text-white transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Device Drawer Modal */}
      {selectedDevice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-slate-100">{selectedDevice.ip}</span>
                {selectedDevice.is_gateway && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    GATEWAY
                  </span>
                )}
              </div>
              <button onClick={() => setSelectedDevice(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-500 block">MAC Address:</span>
                  <span className="font-mono text-slate-200">{selectedDevice.mac_address || 'Unavailable'}</span>
                  <ConfidenceBadge level={selectedDevice.mac_confidence} size="sm" />
                </div>
                <div>
                  <span className="text-slate-500 block">Vendor:</span>
                  <span className="text-slate-200">{selectedDevice.vendor || 'Unknown'}</span>
                  <ConfidenceBadge level={selectedDevice.vendor_confidence} size="sm" />
                </div>
                <div>
                  <span className="text-slate-500 block">Hostname:</span>
                  <span className="font-mono text-slate-200">{selectedDevice.hostname || 'None'}</span>
                  <ConfidenceBadge level={selectedDevice.hostname_confidence} size="sm" />
                </div>
                <div>
                  <span className="text-slate-500 block">Device Type:</span>
                  <span className="text-slate-200">{selectedDevice.device_type}</span>
                  <ConfidenceBadge level={selectedDevice.type_confidence} size="sm" />
                </div>
                <div>
                  <span className="text-slate-500 block">First Seen:</span>
                  <span className="text-slate-400">{new Date(selectedDevice.first_seen).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Last Seen:</span>
                  <span className="text-slate-400">{new Date(selectedDevice.last_seen).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-medium block mb-1">Open Services & Exposed Ports:</span>
                {selectedDevice.services && selectedDevice.services.length > 0 ? (
                  <div className="space-y-1">
                    {selectedDevice.services.map((s, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-slate-950 rounded border border-slate-800"
                      >
                        <span className="font-mono text-cyan-300">
                          {s.port}/{s.protocol} ({s.service})
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400">
                          {s.state}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-950 rounded border border-slate-800 text-slate-500 italic">
                    No open services were identified during safe port checks.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedDevice(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
