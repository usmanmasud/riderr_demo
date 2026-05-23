'use client';
import { useEffect, useState } from 'react';
import { fetchRiders, createRider } from '@/lib/api';

type Rider = { id: number; name: string; phone: string; isActive: boolean };

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
  'bg-orange-500', 'bg-pink-500', 'bg-cyan-500',
];

export default function RidersPage() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = () => fetchRiders().then(setRiders);
  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await createRider(form);
    setForm({ name: '', phone: '' });
    setShowForm(false);
    await load();
    setLoading(false);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Riders</h2>
          <p className="text-gray-500 mt-1 text-sm">{riders.length} rider{riders.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
            showForm
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-gray-950 text-white hover:bg-gray-800'
          }`}
        >
          {showForm ? '✕ Cancel' : '+ Add Rider'}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 flex gap-4 items-end">
          {(['name', 'phone'] as const).map(key => (
            <div key={key} className="flex flex-col gap-1.5 flex-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{key}</label>
              <input
                required
                placeholder={key === 'name' ? 'Full name' : '+234...'}
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-50 shadow-sm"
          >
            {loading ? 'Adding...' : 'Add Rider'}
          </button>
        </form>
      )}

      {/* Rider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {riders.map((r, i) => (
          <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-2xl ${AVATAR_COLORS[i % AVATAR_COLORS.length]} text-white flex items-center justify-center text-lg font-bold flex-shrink-0`}>
              {r.name[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{r.name}</p>
              <p className="text-sm text-gray-400 mt-0.5">{r.phone}</p>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full mt-2 inline-block ${
                r.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'
              }`}>
                {r.isActive ? '● Active' : '○ Inactive'}
              </span>
            </div>
          </div>
        ))}
        {!riders.length && (
          <div className="col-span-3 text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🏍️</p>
            <p className="font-medium">No riders registered yet</p>
            <p className="text-sm mt-1">Click "+ Add Rider" to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
