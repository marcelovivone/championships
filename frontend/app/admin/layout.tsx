'use client';

import { ReactNode } from 'react';
import ProtectedRoute from '@/components/protected-route';
import AdminSidebar from '@/components/admin/admin-sidebar';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-gray-100">
        <AdminSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
