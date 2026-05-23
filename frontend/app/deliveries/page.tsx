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
  pending:    'bg-yellow-50 text-yellow-700 border border-yellow-200',
  accepted:   'bg-blue-50 text-blue-700 border border-blue-200',
  in_transit: 'bg-purple-50 text-purple-700 border border-purple-200',
  delivered:  'bg-emerald-50 text-emerald-700 border border-emerald-200',
  failed:     'bg-red-50 text-red-700 border border-red-200',
};

const FORM_FIELDS = [
  { key: 'customerName',    label: 'Customer Name',    placeholder: 'Full name' },
  { key: 'customerPhone',   label: 'Customer Phone',   placeholder: '+234...' },
  { key: 'pickupAddress',   label: 'Pickup Address',   placeholder: 'Street, City' },
  { key: 'deliveryAddress', label: 'Delivery Address', placeholder: 'Street, City' },
] as const;

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
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Deliveries</h2>
          <p className="text-gray-500 mt-1 text-sm">{deliveries.length} total deliveries</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
            showForm
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-gray-950 text-white hover:bg-gray-800'
          }`}
        >
          {showForm ? '✕ Cancel' : '+ New Delivery'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 grid grid-cols-2 gap-4">
          {FORM_FIELDS.map(({ key, label, placeholder }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
              <input
                required
                placeholder={placeholder}
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 text-white px-8 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Creating...' : 'Create Delivery'}
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Tracking', 'Customer', 'Phone', 'Pickup', 'Destination', 'Status', 'Rider', 'Action'].map(h => (
                  <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {deliveries.map(d => (
                <tr key={d.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-4 font-mono text-xs font-semibold text-gray-700 whitespace-nowrap">{d.trackingCode}</td>
                  <td className="px-5 py-4 font-medium text-gray-800 whitespace-nowrap">{d.customerName}</td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{d.customerPhone}</td>
                  <td className="px-5 py-4 text-gray-500 max-w-[130px] truncate">{d.pickupAddress}</td>
                  <td className="px-5 py-4 text-gray-500 max-w-[130px] truncate">{d.deliveryAddress}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[d.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {d.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {d.Rider?.name
                      ? <span className="font-medium text-gray-700">{d.Rider.name}</span>
                      : <span className="text-gray-300 italic text-xs">Unassigned</span>
                    }
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {d.status === 'pending' && (
                      assigning === d.id ? (
                        <div className="flex gap-2 items-center">
                          <select
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
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
                            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
                          >
                            Assign
                          </button>
                          <button
                            onClick={() => setAssigning(null)}
                            className="text-gray-400 hover:text-gray-600 text-xs px-1"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAssigning(d.id)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition"
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
                  <td colSpan={8} className="text-center py-16 text-gray-400">
                    <p className="text-4xl mb-3">📦</p>
                    <p className="font-medium">No deliveries yet</p>
                    <p className="text-sm mt-1">Click "+ New Delivery" to create one</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
