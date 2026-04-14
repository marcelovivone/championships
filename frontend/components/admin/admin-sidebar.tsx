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
    ListOrdered,
} from 'lucide-react';

interface MenuItem {
    label: string;
    icon: React.ReactNode;
    href: string;
    children?: MenuItem[];
}

const menuItems: MenuItem[] = [
    { label: 'Dashboard', icon: <LayoutDashboard size={20} />, href: '/admin' },
    { label: 'Cities', icon: <MapPin size={20} />, href: '/admin/cities' },
    { label: 'Countries', icon: <Globe size={20} />, href: '/admin/countries' },
    { label: 'Clubs', icon: <Shield size={20} />, href: '/admin/clubs' },
    { label: 'Club Stadiums', icon: <Link2 size={20} />, href: '/admin/club-stadiums' },
    { label: 'Groups', icon: <GitBranch size={20} />, href: '/admin/groups' },
    { label: 'Leagues', icon: <Flag size={20} />, href: '/admin/leagues' },
    { label: 'Matches', icon: <Table size={20} />, href: '/admin/matches' },
    { label: 'Rounds', icon: <Target size={20} />, href: '/admin/rounds' },
    { label: 'Seasons', icon: <Calendar size={20} />, href: '/admin/seasons' },
    { label: 'Season Clubs', icon: <ClipboardList size={20} />, href: '/admin/season-clubs' },
    { label: 'Sports', icon: <Trophy size={20} />, href: '/admin/sports' },
    { label: 'Sport Clubs', icon: <Users size={20} />, href: '/admin/sport-clubs' },
    { label: 'Stadiums', icon: <Building2 size={20} />, href: '/admin/stadiums' },
    { label: 'Standing Zones', icon: <Table size={20} />, href: '/admin/standing-zones' },
    {
        label: 'Standing Order',
        icon: <ListOrdered size={20} />,
        href: '',
        children: [
            { label: 'Rules', icon: <ListOrdered size={16} />, href: '/admin/standing-order/rules' },
            { label: 'Point Systems', icon: <ListOrdered size={16} />, href: '/admin/standing-order/point-systems' },
            { label: 'Criteria Reference', icon: <ListOrdered size={16} />, href: '/admin/standing-order/criteria' },
        ],
    },
    { label: 'Users', icon: <UserCog size={20} />, href: '/admin/users' },
    {
        label: 'API',
        icon: <ClipboardList size={20} />,
        href: '',
        children: [
            {
                label: 'ETL',
                icon: <ClipboardList size={20} />,
                href: '',
                children: [
                    {
                        label: 'Extract',
                        icon: <ClipboardList size={16} />,
                        href: '/admin/api/etl/extract'
                    },
                    {
                        label: 'Transform & Load',
                        icon: <ClipboardList size={16} />,
                        href: '',
                        children: [
                            { label: 'Basketball', icon: <span style={{ fontSize: 18 }}>🏀</span>, href: '/admin/api/etl/transform-load/basketball' },
                            { label: 'Football', icon: <span style={{ fontSize: 18 }}>⚽</span>, href: '/admin/api/etl/transform-load/football' },
                            { label: 'Futsal', icon: <span style={{ fontSize: 18 }}>🥅</span>, href: '/admin/api/etl/transform-load/futsal' },
                            { label: 'Handball', icon: <span style={{ fontSize: 18 }}>🤾</span>, href: '/admin/api/etl/transform-load/handball' },
                            { label: 'Ice Hockey', icon: <span style={{ fontSize: 18 }}>🏒</span>, href: '/admin/api/etl/transform-load/ice-hockey' },
                            { label: 'Volleyball', icon: <span style={{ fontSize: 18 }}>🏐</span>, href: '/admin/api/etl/transform-load/volleyball' }
                        ]
                    },
                    {
                        label: 'Adjusts',
                        icon: <ClipboardList size={16} />,
                        href: '',
                        children: [
                            { label: 'Timezone', icon: <span style={{ fontSize: 18 }}>🌍</span>, href: '/admin/api/etl/adjusts/timezone' }
                        ]
                    }
                ]
            }
        ]
    }
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
                    {(() => {
                        const renderMenu = (items: MenuItem[], depth = 0) => {
                            return items.map((it) => {
                                const isActive = pathname === it.href;
                                const padding = { paddingLeft: depth * 12 } as React.CSSProperties;
                                if (it.children && it.children.length) {
                                    return (
                                        <div key={it.href || it.label}>
                                            <button
                                                onClick={() => it.href && router.push(it.href)}
                                                style={padding}
                                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                                            >
                                                {it.icon}
                                                <span>{it.label}</span>
                                            </button>
                                            <div>
                                                {renderMenu(it.children, depth + 1)}
                                            </div>
                                        </div>
                                    );
                                }
                                return (
                                    <button
                                        key={it.href || it.label}
                                        onClick={() => it.href && router.push(it.href)}
                                        style={padding}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                                    >
                                        {it.icon}
                                        <span>{it.label}</span>
                                    </button>
                                );
                            });
                        };
                        return renderMenu(menuItems);
                    })()}
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
