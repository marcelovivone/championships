'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import {
  LayoutDashboard,
  Trophy,
  Globe,
  MapPin,
  Building2,
  Users,
  Calendar,
  Target,
  GitBranch,
  Shield,
  Flag,
  Table,
  UserCog,
  LogOut,
  Link2,
  ClipboardList,
} from 'lucide-react';

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={20} />, href: '/common' },
  {
    label: 'Standings',
    icon: <MapPin size={20} />,
    href: '/common/standings',
    children: [
        { label: 'Basketball', icon: <span style={{ fontSize: 18 }}>🏀</span>, href: '/common/standings/basketball' },
      { label: 'Football', icon: <span style={{ fontSize: 18 }}>⚽</span>, href: '/common/standings/football' },
      { label: 'Futsal', icon: <span style={{ fontSize: 18 }}>🥅</span>, href: '/common/standings/futsal' },
      { label: 'Handball', icon: <span style={{ fontSize: 18 }}>🤾</span>, href: '/common/standings/handball' },
      { label: 'Ice Hockey', icon: <span style={{ fontSize: 18 }}>🏒</span>, href: '/common/standings/ice-hockey' },
      { label: 'Volleyball', icon: <span style={{ fontSize: 18 }}>🏐</span>, href: '/common/standings/volleyball' },
    ],
  },
  { label: 'Statistics', icon: <MapPin size={20} />, href: '/common/statistics' },
];

export default function CommonSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className="sticky top-0 h-screen w-64 bg-gray-900 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">Championships</h1>
        {user && (
          <p className="text-sm text-gray-400 mt-1">{user.name}</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 flex flex-col">
        <div>
          {menuItems.map((item) => {
            const isParentActive = pathname?.startsWith(item.href);
            if (item.children && item.children.length > 0) {
              return (
                <div key={item.href} className="mb-2">
                  <div className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isParentActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  <div className="pl-8">
                    {item.children.map((child) => {
                      const isActive = pathname === child.href;
                      return (
                        <button
                          key={child.href}
                          onClick={() => router.push(child.href)}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${isActive ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>
                          {child.icon}
                          <span>{child.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            const isActive = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-auto p-0 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition-colors"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
