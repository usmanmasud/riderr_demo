'use client';
import { useEffect, useState } from 'react';
import { fetchUsers, updateUser, deleteUser } from '@/lib/api';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/context/AuthContext';

type User = { _id: string; name: string; email: string; role: string; phone?: string; isActive: boolean; createdAt: string };

const ROLE_BADGE: Record<string, string> = {
  admin:    'bg-yellow-100 text-yellow-800',
  customer: 'bg-blue-100 text-blue-800',
  rider:    'bg-purple-100 text-purple-800',
};

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');

  const load = async () => {
    const data = await fetchUsers();
    setUsers(Array.isArray(data) ? data : []);
  };
  useEffect(() => { load(); }, []);

  async function toggleActive(u: User) {
    await updateUser(u._id, { isActive: !u.isActive });
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    const res = await deleteUser(id);
    if (res.error) { alert(res.error); return; }
    await load();
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AuthGuard adminOnly>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
        <span className="text-sm text-gray-500">{users.length} total users</span>
      </div>

      <input
        placeholder="Search by name or email..."
        className="w-full max-w-sm border rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-gray-400"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              {['Name', 'Email', 'Phone', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(u => (
              <tr key={u._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3 text-gray-500">{u.phone || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_BADGE[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.isActive ? 'Active' : 'Suspended'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {u._id !== me?._id && (
                    <div className="flex gap-2">
                      <button onClick={() => toggleActive(u)}
                        className={`text-xs px-2 py-1 rounded font-medium transition ${
                          u.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}>
                        {u.isActive ? 'Suspend' : 'Activate'}
                      </button>
                      <button onClick={() => handleDelete(u._id)}
                        className="text-xs px-2 py-1 rounded font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AuthGuard>
  );
}
