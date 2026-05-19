'use client';
import { useEffect, useState } from 'react';
import { fetchDeliveries, fetchRiders, createDelivery, assignRider } from '@/lib/api';

type Rider = { id: number; name: string; phone: string };
type Delivery = {
  id: number;
  trackingCode: string;
  customerName: string;
  customerPhone: string;
  pickupAddress: string;
  deliveryAddress: string;
  status: string;
  Rider: Rider | null;
  createdAt: string;
};

const STATUS_BADGE: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-800',
  accepted:   'bg-blue-100 text-blue-800',
  in_transit: 'bg-purple-100 text-purple-800',
  delivered:  'bg-green-100 text-green-800',
  failed:     'bg-red-100 text-red-800',
};

const EMPTY = { customerName: '', customerPhone: '', pickupAddress: '', deliveryAddress: '' };

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<number | null>(null);
  const [selectedRider, setSelectedRider] = useState<Record<number, string>>({});

  const load = () => fetchDeliveries().then(setDeliveries);

  useEffect(() => {
    load();
    fetchRiders().then(setRiders);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await createDelivery(form);
    setForm(EMPTY);
    setShowForm(false);
    await load();
    setLoading(false);
  }

  async function handleAssign(deliveryId: number) {
    const riderId = selectedRider[deliveryId];
    if (!riderId) return;
    await assignRider(deliveryId, Number(riderId));
    await load();
    setAssigning(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Deliveries</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
        >
          {showForm ? 'Cancel' : '+ New Delivery'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow p-6 mb-6 grid grid-cols-2 gap-4">
          {Object.keys(EMPTY).map(key => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-sm text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
              <input
                required
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                value={(form as any)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Delivery'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              {['Tracking', 'Customer', 'Phone', 'Pickup', 'Destination', 'Status', 'Rider', 'Action'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {deliveries.map(d => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-semibold">{d.trackingCode}</td>
                <td className="px-4 py-3">{d.customerName}</td>
                <td className="px-4 py-3">{d.customerPhone}</td>
                <td className="px-4 py-3 max-w-[120px] truncate">{d.pickupAddress}</td>
                <td className="px-4 py-3 max-w-[120px] truncate">{d.deliveryAddress}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[d.status] ?? ''}`}>
                    {d.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">{d.Rider?.name ?? <span className="text-gray-400">Unassigned</span>}</td>
                <td className="px-4 py-3">
                  {d.status === 'pending' && (
                    assigning === d.id ? (
                      <div className="flex gap-2 items-center">
                        <select
                          className="border rounded px-2 py-1 text-xs"
                          value={selectedRider[d.id] ?? ''}
                          onChange={e => setSelectedRider(r => ({ ...r, [d.id]: e.target.value }))}
                        >
                          <option value="">Select rider</option>
                          {riders.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAssign(d.id)}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                        >
                          Assign
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAssigning(d.id)}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Assign Rider
                      </button>
                    )
                  )}
                </td>
              </tr>
            ))}
            {!deliveries.length && (
              <tr>
                <td colSpan={8} className="text-center py-10 text-gray-400">No deliveries yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
