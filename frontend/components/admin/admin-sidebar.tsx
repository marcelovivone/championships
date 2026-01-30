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
  { label: 'Dashboard', icon: <LayoutDashboard size={20} />, href: '/admin' },
  { label: 'Sports', icon: <Trophy size={20} />, href: '/admin/sports' },
  { label: 'Countries', icon: <Globe size={20} />, href: '/admin/countries' },
  { label: 'Cities', icon: <MapPin size={20} />, href: '/admin/cities' },
  { label: 'Stadiums', icon: <Building2 size={20} />, href: '/admin/stadiums' },
  { label: 'Clubs', icon: <Shield size={20} />, href: '/admin/clubs' },
  { label: 'Club Stadiums', icon: <Link2 size={20} />, href: '/admin/club-stadiums' },
  { label: 'Sport Clubs', icon: <Users size={20} />, href: '/admin/sport-clubs' },
  { label: 'Leagues', icon: <Flag size={20} />, href: '/admin/leagues' },
  { label: 'Seasons', icon: <Calendar size={20} />, href: '/admin/seasons' },
  { label: 'Rounds', icon: <Target size={20} />, href: '/admin/rounds' },
  { label: 'Groups', icon: <GitBranch size={20} />, href: '/admin/groups' },
  { label: 'Season Clubs', icon: <ClipboardList size={20} />, href: '/admin/season-clubs' },
  { label: 'Matches', icon: <Table size={20} />, href: '/admin/matches' },
  { label: 'Users', icon: <UserCog size={20} />, href: '/admin/users' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">Championships</h1>
        {user && (
          <p className="text-sm text-gray-400 mt-1">{user.name}</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {menuItems.map((item) => {
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
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition-colors"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
