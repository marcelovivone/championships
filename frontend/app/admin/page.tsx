'use client';

import { useAuthStore } from '@/lib/stores/auth-store';

export default function AdminDashboard() {
  const { user } = useAuthStore();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Welcome, {user?.name}!</h2>
        <p className="text-gray-600">
          Use the sidebar to navigate through different sections of the admin panel.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Basic Data</h3>
            <p className="text-sm text-blue-700">Manage sports, countries, cities, stadiums, and clubs</p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">Competition Structure</h3>
            <p className="text-sm text-green-700">Set up leagues, seasons, phases, and groups</p>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-purple-900 mb-2">Match Management</h3>
            <p className="text-sm text-purple-700">Create and manage matches with sport-specific data</p>
          </div>
        </div>
      </div>
    </div>
  );
}
