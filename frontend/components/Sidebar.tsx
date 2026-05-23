'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const ADMIN_LINKS = [
  { href: '/',             label: 'Dashboard',  icon: '▦' },
  { href: '/deliveries',   label: 'Deliveries', icon: '📦' },
  { href: '/riders',       label: 'Riders',     icon: '🏍️' },
  { href: '/admin/users',  label: 'Users',      icon: '👥' },
];

const CUSTOMER_LINKS = [
  { href: '/',            label: 'Dashboard',  icon: '▦' },
  { href: '/deliveries',  label: 'My Deliveries', icon: '📦' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();
  const router = useRouter();
  const links = isAdmin ? ADMIN_LINKS : CUSTOMER_LINKS;

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <aside className="w-60 min-h-screen bg-gray-950 text-white flex flex-col p-5 gap-1 shadow-xl">
      <div className="flex items-center gap-2 mb-8 px-2">
        <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center text-gray-950 font-black text-sm">R</div>
        <span className="text-xl font-bold tracking-tight">RiderR</span>
      </div>

      <p className="text-xs text-gray-500 uppercase tracking-widest px-3 mb-2">Menu</p>

      {links.map(l => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href} href={l.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              active ? 'bg-yellow-400 text-gray-950' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span className="text-base leading-none">{l.icon}</span>
            {l.label}
          </Link>
        );
      })}

      <Link
        href="/track"
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
      >
        <span className="text-base leading-none">🔍</span>
        Track Delivery
      </Link>

      <div className="mt-auto pt-6 border-t border-gray-800 space-y-3">
        {user && (
          <div className="px-3">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block font-medium ${
              isAdmin ? 'bg-yellow-400 text-gray-900' : 'bg-gray-700 text-gray-300'
            }`}>
              {user.role}
            </span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950 hover:text-red-300 transition-all"
        >
          <span>↩</span> Sign Out
        </button>
      </div>
    </aside>
  );
}
