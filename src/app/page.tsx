'use client';

import dynamic from 'next/dynamic';
import Toolbar from '@/components/Canvas/Toolbar';
import Sidebar from '@/components/Sidebar/Sidebar';

// Dynamic import to avoid SSR issues with D3
const SankeyCanvas = dynamic(() => import('@/components/Canvas/SankeyCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center">
      <div className="text-gray-400">Loading diagram...</div>
    </div>
  ),
});

export default function Home() {
  return (
    <div className="flex flex-col h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="bg-[var(--card-bg)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-[var(--primary-text)]">Financial Sankey Studio</h1>
          <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-medium">Beta</span>
        </div>
      </header>

      {/* Main Content - Split Pane */}
      <main className="flex flex-1 overflow-hidden relative">
        {/* Canvas Area (70%) */}
        <div className="flex-1 p-0 flex flex-col min-w-0 relative bg-[var(--background)]">
          <Toolbar />
          <SankeyCanvas />
        </div>

        {/* Sidebar (30%) */}
        <Sidebar />
      </main>
    </div>
  );
}
