import Link from 'next/link';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/deliveries', label: 'Deliveries' },
  { href: '/riders', label: 'Riders' },
];

export default function Sidebar() {
  return (
    <aside className="w-56 min-h-screen bg-gray-900 text-white flex flex-col p-6 gap-4">
      <h1 className="text-2xl font-bold mb-6">RiderR</h1>
      {links.map(l => (
        <Link key={l.href} href={l.href} className="hover:text-yellow-400 transition-colors">
          {l.label}
        </Link>
      ))}
    </aside>
  );
}
