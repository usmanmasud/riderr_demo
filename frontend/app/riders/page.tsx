'use client';
import { useEffect, useState } from 'react';
import { fetchRiders, createRider, updateRider, deleteRider } from '@/lib/api';
import AuthGuard from '@/components/AuthGuard';

type Rider = { _id: string; name: string; phone: string; isActive: boolean; totalDeliveries: number; rating: number };

export default function RidersPage() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const data = await fetchRiders();
    setRiders(Array.isArray(data) ? data : []);
  };
  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await createRider(form);
    if (res.error) { alert(res.error); setLoading(false); return; }
    setForm({ name: '', phone: '' });
    setShowForm(false);
    await load();
    setLoading(false);
  }

  async function toggleActive(rider: Rider) {
    await updateRider(rider._id, { isActive: !rider.isActive });
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this rider?')) return;
    await deleteRider(id);
    await load();
  }

  return (
    <AuthGuard adminOnly>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Riders</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition">
          {showForm ? 'Cancel' : '+ Add Rider'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow p-6 mb-6 flex gap-4 items-end">
          {(['name', 'phone'] as const).map(key => (
            <div key={key} className="flex flex-col gap-1 flex-1">
              <label className="text-sm text-gray-600 capitalize">{key}</label>
              <input required
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
          <button type="submit" disabled={loading}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50">
            {loading ? 'Adding...' : 'Add Rider'}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {riders.map(r => (
          <div key={r._id} className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center text-lg font-bold">
                {r.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{r.name}</p>
                <p className="text-sm text-gray-500">{r.phone}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {r.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex gap-4 text-xs text-gray-500 mb-3">
              <span>📦 {r.totalDeliveries} deliveries</span>
              <span>⭐ {r.rating.toFixed(1)} rating</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleActive(r)}
                className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition ${
                  r.isActive ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}>
                {r.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button onClick={() => handleDelete(r._id)}
                className="flex-1 text-xs py-1.5 rounded-lg font-medium bg-red-50 text-red-600 hover:bg-red-100 transition">
                Delete
              </button>
            </div>
          </div>
        ))}
        {!riders.length && <p className="text-gray-400 col-span-3 text-center py-10">No riders registered yet</p>}
      </div>
    </AuthGuard>
  );
}
