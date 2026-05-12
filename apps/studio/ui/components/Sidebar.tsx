/**
 * Sidebar navigation component
 */

import React, { useState } from 'react';
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
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppStore } from '../stores/app-store';
import { SettingsPanel } from './SettingsPanel';
import type { ViewMode } from '../types';

interface NavItem {
  id: ViewMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { id: 'requests', label: 'Requests', icon: Activity },
  { id: 'logs', label: 'Logs', icon: Terminal },
  { id: 'api-client', label: 'API Client', icon: Send },
  { id: 'container', label: 'Container', icon: Boxes },
  { id: 'architecture', label: 'Architecture', icon: GitBranch },
  { id: 'metrics', label: 'Metrics', icon: BarChart3 },
  { id: 'replay', label: 'Replay', icon: Play },
];

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen, currentView, setCurrentView, connected } = useAppStore();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-gray-900 border-r border-gray-800 z-40 transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-gray-800">
        <img
          src="/expressots-icon.svg"
          alt="ExpressoTS"
          className="w-8 h-8 flex-shrink-0 rounded-full"
        />
        {sidebarOpen && (
          <div className="ml-3 overflow-hidden flex items-center gap-2">
            <span className="text-lg font-bold text-white whitespace-nowrap">
              EXPRESSO
            </span>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-primary-950 text-primary-500 shadow-sm whitespace-nowrap">
              TS
            </span>
          </div>
        )}
      </div>

      {/* Connection Status */}
      <div className={cn(
        'flex items-center px-4 py-3 border-b border-gray-800',
        connected ? 'text-success-500' : 'text-error-500'
      )}>
        <div className={cn(
          'w-2 h-2 rounded-full flex-shrink-0',
          connected ? 'bg-success-500 animate-pulse-slow' : 'bg-error-500'
        )} />
        {sidebarOpen && (
          <span className="ml-3 text-sm whitespace-nowrap">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={cn(
                'flex items-center w-full px-4 py-3 text-left transition-colors',
                isActive
                  ? 'bg-primary-500/10 text-primary-400 border-r-2 border-primary-500'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && (
                <span className="ml-3 whitespace-nowrap">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="border-t border-gray-800 p-4">
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center w-full text-gray-400 hover:text-gray-200 transition-colors"
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && (
            <span className="ml-3 whitespace-nowrap">Settings</span>
          )}
        </button>
      </div>

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}

      {/* Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute -right-3 top-20 w-6 h-6 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>
    </aside>
  );
}
