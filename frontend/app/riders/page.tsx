'use client';
import { useEffect, useState } from 'react';
import { fetchRiders, createRider } from '@/lib/api';

type Rider = { id: number; name: string; phone: string; isActive: boolean };

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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Riders</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
        >
          {showForm ? 'Cancel' : '+ Add Rider'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow p-6 mb-6 flex gap-4 items-end">
          {(['name', 'phone'] as const).map(key => (
            <div key={key} className="flex flex-col gap-1 flex-1">
              <label className="text-sm text-gray-600 capitalize">{key}</label>
              <input
                required
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Rider'}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {riders.map(r => (
          <div key={r.id} className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center text-lg font-bold">
              {r.name[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-800">{r.name}</p>
              <p className="text-sm text-gray-500">{r.phone}</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {r.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
        {!riders.length && (
          <p className="text-gray-400 col-span-3 text-center py-10">No riders registered yet</p>
        )}
      </div>
    </div>
  );
}
