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
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900">Financial Sankey Builder</h1>
          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Beta</span>
        </div>
      </header>

      {/* Toolbar */}
      <Toolbar />

      {/* Main Content - Split Pane */}
      <main className="flex flex-1 overflow-hidden">
        {/* Canvas Area (70%) */}
        <div className="flex-1 p-4 flex flex-col min-w-0">
          <SankeyCanvas />
        </div>

        {/* Sidebar (30%) */}
        <Sidebar />
      </main>
    </div>
  );
}
