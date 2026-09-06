import React from 'react';
import {
  LayoutDashboard,
  Server,
  Box,
  HeartPulse,
  BellRing,
  History,
  Terminal,
  ShieldAlert,
  BarChart3,
  Sparkles,
  FileText,
  Settings,
  Radio
} from 'lucide-react';
import { NavigationTab } from '../types';

interface Props {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
}

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

export const NavigationSidebar: React.FC<Props> = ({ activeTab, onSelectTab }) => {
  const items: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'devices', label: 'Devices', icon: Server },
    { id: '3d-network', label: '3D Network', icon: Box, badge: '3D' },
    { id: 'health', label: 'Health', icon: HeartPulse },
    { id: 'events', label: 'Events', icon: BellRing },
    { id: 'history', label: 'History', icon: History },
    { id: 'diagnostics', label: 'Diagnostics', icon: Terminal },
    { id: 'security', label: 'Security', icon: ShieldAlert },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'ai', label: 'NetScope AI', icon: Sparkles },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      id="netscope-sidebar"
      className="w-56 shrink-0 bg-zinc-950 border-r border-zinc-800/80 flex flex-col justify-between h-[calc(100vh-57px)] sticky top-[57px]"
    >
      <div className="py-3 px-2 space-y-1">
        <div className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
          Navigation
        </div>
        <nav className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-mono transition-colors text-left ${
                  isActive
                    ? 'bg-zinc-800/90 text-cyan-300 font-semibold border-l-2 border-cyan-400 pl-2.5'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-zinc-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Defensive Security Notice */}
      <div className="p-3 m-2 rounded bg-zinc-900/60 border border-zinc-800/80 text-[11px] font-mono text-zinc-400">
        <div className="flex items-center gap-1.5 text-zinc-300 font-semibold mb-1">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Local Scope</span>
        </div>
        <p className="text-zinc-400 leading-relaxed">
          Defensive posture active. Scans restricted to verified RFC1918 subnets.
        </p>
      </div>
    </aside>
  );
};
