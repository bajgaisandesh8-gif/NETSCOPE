import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  NavigationTab,
  SystemStatus,
  NetworkBaseline,
  FirstRunInfo,
  Device,
  SecurityPosture,
  HealthMetrics,
} from './types';
import { StatusHeader } from './components/StatusHeader';
import { NavigationSidebar } from './components/NavigationSidebar';
import { FirstRunModal } from './components/FirstRunModal';
import { OverviewView } from './components/views/OverviewView';
import { DevicesView } from './components/views/DevicesView';
import { TopologyView } from './components/views/TopologyView';
import { HealthView } from './components/views/HealthView';
import { SecurityView } from './components/views/SecurityView';
import { DiagnosticsView } from './components/views/DiagnosticsView';
import { HistoryView } from './components/views/HistoryView';
import { EventsView } from './components/views/EventsView';
import { AiAnalystView } from './components/views/AiAnalystView';
import { ReportsView } from './components/views/ReportsView';
import { SettingsView } from './components/views/SettingsView';
import { Shield, RefreshCw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('overview');
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [baseline, setBaseline] = useState<NetworkBaseline | null>(null);
  const [firstRunInfo, setFirstRunInfo] = useState<FirstRunInfo | null>(null);
  const [isFirstRunOpen, setIsFirstRunOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Core Subsystem States
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [securityPosture, setSecurityPosture] = useState<SecurityPosture | null>(null);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics | null>(null);

  // Fetch initial telemetry, devices, posture, and metrics
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    }
    setFetchError(null);

    try {
      // 1. Fetch System Status
      const statusRes = await fetch('/api/status');
      if (statusRes.ok) {
        const statusData: SystemStatus = await statusRes.json();
        setStatus(statusData);
      }

      // 2. Fetch Network Baseline
      const baselineRes = await fetch('/api/network/baseline');
      if (baselineRes.ok) {
        const baselineData: NetworkBaseline = await baselineRes.json();
        setBaseline(baselineData);
      }

      // 3. Fetch First-Run Info
      const firstRunRes = await fetch('/api/first-run');
      if (firstRunRes.ok) {
        const firstRunData: FirstRunInfo = await firstRunRes.json();
        setFirstRunInfo(firstRunData);
      }

      // 4. Fetch Devices
      const devRes = await fetch('/api/devices');
      if (devRes.ok) {
        const devData = await devRes.json();
        setDevices(devData.devices || []);
        setIsScanning(devData.is_scanning || false);
      }

      // 5. Fetch Security Posture
      const secRes = await fetch('/api/security/posture');
      if (secRes.ok) {
        const secData: SecurityPosture = await secRes.json();
        setSecurityPosture(secData);
      }

      // 6. Fetch Health Metrics
      const healthRes = await fetch('/api/health/metrics');
      if (healthRes.ok) {
        const healthData: HealthMetrics = await healthRes.json();
        setHealthMetrics(healthData);
      }
    } catch (err: unknown) {
      console.error('Error fetching NetScope data:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setFetchError(errorMsg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Initialize Socket.IO connection for real-time telemetry
    const socket: Socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('discovery_completed', () => {
      loadData(false);
    });

    socket.on('telemetry_update', (data) => {
      if (data?.health) {
        setHealthMetrics(data.health);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [loadData]);

  // Handlers
  const handleTriggerScan = async (subnet?: string) => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/devices/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subnet }),
      });
      const data = await res.json();
      if (data.devices) {
        setDevices(data.devices);
      }
      // Re-evaluate posture after scan
      const secRes = await fetch('/api/security/posture');
      if (secRes.ok) {
        setSecurityPosture(await secRes.json());
      }
    } catch (err) {
      console.error('Discovery scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleUpdateDevice = async (id: string, updates: { nickname?: string; device_type?: string }) => {
    try {
      const res = await fetch(`/api/devices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, ...updated } : d)));
      }
    } catch (err) {
      console.error('Update device error:', err);
    }
  };

  const handleRefreshPosture = async () => {
    try {
      const res = await fetch('/api/security/posture');
      if (res.ok) {
        setSecurityPosture(await res.json());
      }
    } catch (err) {
      console.error('Refresh posture error:', err);
    }
  };

  const handleRunHealthProbe = async () => {
    try {
      const res = await fetch('/api/health/probe', { method: 'POST' });
      if (res.ok) {
        setHealthMetrics(await res.json());
      }
    } catch (err) {
      console.error('Health probe error:', err);
    }
  };

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 font-mono">
        <div className="w-12 h-12 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-4 animate-pulse">
          <Shield className="w-6 h-6" />
        </div>
        <h1 className="text-sm font-bold tracking-wider uppercase mb-2">NetScope Initializing</h1>
        <p className="text-xs text-slate-400 mb-4 text-center max-w-sm">
          Inspecting Linux network interfaces, kernel routes, local ARP tables, and checking Nmap...
        </p>
        <div className="flex items-center gap-2 text-xs text-cyan-400">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Starting NetScope Local Engine...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-900 selection:text-cyan-200">
      {/* Top Header */}
      <StatusHeader
        status={status}
        baseline={baseline}
        isRefreshing={isRefreshing}
        onRefresh={() => loadData(true)}
        onOpenFirstRun={() => setIsFirstRunOpen(true)}
      />

      {/* Main View Area with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        <NavigationSidebar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
        />

        <main className="flex-1 p-6 overflow-y-auto bg-slate-950/60">
          {fetchError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-xs font-mono text-rose-300 flex items-center justify-between">
              <span>Failed to synchronize with Network Engine: {fetchError}</span>
              <button
                onClick={() => loadData(true)}
                className="px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-900 text-rose-200"
              >
                Retry
              </button>
            </div>
          )}

          {activeTab === 'overview' && (
            <OverviewView
              baseline={baseline}
              status={status}
              onRefresh={() => loadData(true)}
            />
          )}

          {activeTab === 'devices' && (
            <DevicesView
              devices={devices}
              isScanning={isScanning}
              onTriggerScan={handleTriggerScan}
              onUpdateDevice={handleUpdateDevice}
            />
          )}

          {activeTab === '3d-network' && (
            <TopologyView
              devices={devices}
              baseline={baseline}
            />
          )}

          {(activeTab === 'health' || activeTab === 'analytics') && (
            <HealthView
              metrics={healthMetrics}
              baseline={baseline}
              onRunProbe={handleRunHealthProbe}
              isLoading={isRefreshing}
            />
          )}

          {activeTab === 'security' && (
            <SecurityView
              posture={securityPosture}
              devices={devices}
              isLoading={isRefreshing}
              onRefreshPosture={handleRefreshPosture}
            />
          )}

          {activeTab === 'diagnostics' && (
            <DiagnosticsView
              baseline={baseline}
            />
          )}

          {activeTab === 'history' && (
            <HistoryView
              devices={devices}
            />
          )}

          {activeTab === 'events' && (
            <EventsView />
          )}

          {activeTab === 'ai' && (
            <AiAnalystView
              devices={devices}
              baseline={baseline}
              security={securityPosture}
              health={healthMetrics}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              devices={devices}
              baseline={baseline}
              security={securityPosture}
              health={healthMetrics}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              status={status}
              baseline={baseline}
            />
          )}
        </main>
      </div>

      {/* First Run Permission & Interface Modal */}
      <FirstRunModal
        info={firstRunInfo}
        isOpen={isFirstRunOpen}
        onClose={() => setIsFirstRunOpen(false)}
        onStartDiscovery={() => {
          setIsFirstRunOpen(false);
          handleTriggerScan();
        }}
      />
    </div>
  );
}
