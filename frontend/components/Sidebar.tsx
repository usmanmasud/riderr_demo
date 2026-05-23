'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Dashboard', icon: '▦' },
  { href: '/deliveries', label: 'Deliveries', icon: '📦' },
  { href: '/riders', label: 'Riders', icon: '🏍️' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 min-h-screen bg-gray-950 text-white flex flex-col p-5 gap-1 shadow-xl">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8 px-2">
        <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center text-gray-950 font-black text-sm">R</div>
        <span className="text-xl font-bold tracking-tight">RiderR</span>
      </div>

      <p className="text-xs text-gray-500 uppercase tracking-widest px-3 mb-2">Menu</p>

      {links.map(l => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              active
                ? 'bg-yellow-400 text-gray-950'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span className="text-base leading-none">{l.icon}</span>
            {l.label}
          </Link>
        );
      })}

      <div className="mt-auto pt-6 border-t border-gray-800">
        <p className="text-xs text-gray-600 px-3">RiderR Admin v1.0</p>
      </div>
    </aside>
  );
}
