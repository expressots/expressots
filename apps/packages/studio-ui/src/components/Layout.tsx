/**
 * Main layout component
 */

import React from 'react';
import { cn } from '../lib/utils';
import { useAppStore } from '../stores/app-store';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { sidebarOpen } = useAppStore();

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      <Sidebar />
      <div
        className={cn(
          'flex flex-col flex-1 transition-all duration-300',
          sidebarOpen ? 'ml-64' : 'ml-16'
        )}
      >
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
