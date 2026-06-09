/**
 * Main layout component
 */

import React from 'react';
import { cn } from '../lib/utils';
import { useAppStore } from '../stores/app-store';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { HealthFooter } from './HealthFooter';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { sidebarOpen } = useAppStore();

  return (
    <div className="flex h-screen text-gray-100 overflow-hidden">
      <Sidebar />
      <div
        className={cn(
          'flex flex-col flex-1 transition-all duration-300 ease-spring min-w-0',
          sidebarOpen ? 'ml-64' : 'ml-16'
        )}
      >
        <Header />
        <main className="flex-1 overflow-auto p-6 scroll-smooth">
          {children}
        </main>
        <HealthFooter />
      </div>
    </div>
  );
}
