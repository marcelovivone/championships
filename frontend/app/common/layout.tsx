'use client';

import { ReactNode } from 'react';
import ProtectedRoute from '@/components/protected-route';
import CommonSidebar from '@/components/common/common-sidebar';

export default function CommonLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-gray-100">
        <CommonSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
