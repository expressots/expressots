/**
 * Sidebar navigation component
 */

import React, { Suspense, lazy, useState } from 'react';
import {
  Activity,
  GitBranch,
  BarChart3,
  Play,
  Send,
  Settings,
  ChevronLeft,
  ChevronRight,
  Boxes,
  Terminal,
  LayoutDashboard,
  ShieldCheck,
  Database,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppStore } from '../stores/app-store';
import type { ViewMode } from '../types';

// Settings is a sizable drawer only opened on demand, so load it lazily.
const SettingsPanel = lazy(() =>
  import('./SettingsPanel').then((m) => ({ default: m.SettingsPanel })),
);

interface NavItem {
  id: ViewMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { id: 'status', label: 'Status', icon: LayoutDashboard },
  { id: 'requests', label: 'Requests', icon: Activity },
  { id: 'logs', label: 'Logs', icon: Terminal },
  { id: 'api-client', label: 'API Client', icon: Send },
  { id: 'container', label: 'Container', icon: Boxes },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'architecture', label: 'Architecture', icon: GitBranch },
  { id: 'metrics', label: 'Metrics', icon: BarChart3 },
  { id: 'replay', label: 'Replay', icon: Play },
  { id: 'security', label: 'Security', icon: ShieldCheck },
];

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen, currentView, setCurrentView, connected } = useAppStore();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full z-40 transition-all duration-300 ease-spring backdrop-blur-xl',
        sidebarOpen ? 'w-64' : 'w-16',
      )}
      style={{
        backgroundColor: 'rgba(14, 16, 20, 0.85)',
        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: 'inset -1px 0 0 rgba(255, 255, 255, 0.03), 8px 0 28px rgba(0, 0, 0, 0.25)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-gray-800/60">
        <div className="relative flex-shrink-0">
          <img
            src="/expressots-icon.svg"
            alt="ExpressoTS"
            className="w-8 h-8 rounded-full"
          />
          {connected && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success-500 border-2 border-gray-900" />
          )}
        </div>
        {sidebarOpen && (
          <div className="ml-3 overflow-hidden flex items-center gap-2">
            <span className="text-lg font-bold text-white whitespace-nowrap tracking-tight">
              EXPRESSO
            </span>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-primary-500/15 text-primary-400 border border-primary-500/25 whitespace-nowrap">
              TS
            </span>
          </div>
        )}
      </div>

      {/* Connection Status */}
      <div className={cn(
        'flex items-center px-4 py-2.5 mx-2 mt-2 rounded-lg border',
        connected
          ? 'bg-success-500/5 border-success-500/20 text-success-500'
          : 'bg-error-500/5 border-error-500/20 text-error-500',
      )}>
        <div className={cn(
          'w-2 h-2 rounded-full flex-shrink-0',
          connected ? 'bg-success-500 animate-pulse-slow' : 'bg-error-500',
        )} />
        {sidebarOpen && (
          <span className="ml-2.5 text-xs font-medium whitespace-nowrap">
            {connected ? 'Agent connected' : 'Agent offline'}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={cn(
                'studio-nav-item',
                !sidebarOpen && 'justify-center mx-0 px-0 w-[calc(100%-8px)]',
                isActive && 'studio-nav-active',
              )}
              title={!sidebarOpen ? item.label : undefined}
            >
              <Icon className={cn('w-[18px] h-[18px] flex-shrink-0', isActive && 'text-primary-400')} />
              {sidebarOpen && (
                <span className="ml-3 whitespace-nowrap text-sm">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="border-t border-gray-800/60 p-3">
        <button
          onClick={() => setSettingsOpen(true)}
          className={cn(
            'studio-nav-item text-gray-400',
            !sidebarOpen && 'justify-center mx-0 px-0 w-[calc(100%-8px)]',
          )}
          title={!sidebarOpen ? 'Settings' : undefined}
        >
          <Settings className="w-[18px] h-[18px] flex-shrink-0" />
          {sidebarOpen && (
            <span className="ml-3 whitespace-nowrap text-sm">Settings</span>
          )}
        </button>
      </div>

      {settingsOpen && (
        <Suspense fallback={null}>
          <SettingsPanel onClose={() => setSettingsOpen(false)} />
        </Suspense>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={cn(
          'absolute -right-3 top-[4.5rem] w-6 h-6 rounded-full flex items-center justify-center',
          'bg-gray-800 border border-gray-700/80 text-gray-400',
          'hover:text-white hover:bg-gray-700 hover:border-gray-600',
          'transition-all duration-150 shadow-card active:scale-95',
        )}
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
      </button>
    </aside>
  );
}
