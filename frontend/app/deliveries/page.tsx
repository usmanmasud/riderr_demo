'use client';
import { useEffect, useState } from 'react';
import { fetchDeliveries, fetchRiders, createDelivery, assignRider, cancelDelivery } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';

type Rider    = { _id: string; name: string; phone: string };
type Delivery = {
  _id: string; trackingCode: string; customerName: string; customerPhone: string;
  pickupAddress: string; deliveryAddress: string; status: string;
  rider: Rider | null; createdAt: string; notes?: string;
};

const STATUS_BADGE: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-800',
  accepted:   'bg-blue-100 text-blue-800',
  in_transit: 'bg-purple-100 text-purple-800',
  delivered:  'bg-green-100 text-green-800',
  failed:     'bg-red-100 text-red-800',
  cancelled:  'bg-gray-100 text-gray-600',
};

const EMPTY = { customerName: '', customerPhone: '', pickupAddress: '', deliveryAddress: '', notes: '' };

export default function DeliveriesPage() {
  const { isAdmin, user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedRider, setSelectedRider] = useState<Record<string, string>>({});

  const load = async () => {
    const data = await fetchDeliveries();
    setDeliveries(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    load();
    if (isAdmin) fetchRiders().then(d => setRiders(Array.isArray(d) ? d : []));
  }, [isAdmin]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // For customers, pre-fill their name/phone from profile
    const payload = isAdmin ? form : {
      ...form,
      customerName:  form.customerName  || user?.name  || '',
      customerPhone: form.customerPhone || user?.phone || '',
    };
    const res = await createDelivery(payload);
    if (res.error) { alert(res.error); setLoading(false); return; }
    setForm(EMPTY); setShowForm(false);
    await load();
    setLoading(false);
  }

  async function handleAssign(deliveryId: string) {
    const riderId = selectedRider[deliveryId];
    if (!riderId) return;
    await assignRider(deliveryId, riderId);
    await load();
    setAssigning(null);
  }

  async function handleCancel(id: string) {
    if (!confirm('Cancel this delivery?')) return;
    const res = await cancelDelivery(id);
    if (res.error) { alert(res.error); return; }
    await load();
  }

  const formFields = isAdmin
    ? [
        { key: 'customerName',    label: 'Customer Name' },
        { key: 'customerPhone',   label: 'Customer Phone' },
        { key: 'pickupAddress',   label: 'Pickup Address' },
        { key: 'deliveryAddress', label: 'Delivery Address' },
        { key: 'notes',           label: 'Notes (optional)' },
      ]
    : [
        { key: 'customerName',    label: 'Your Name' },
        { key: 'customerPhone',   label: 'Your Phone' },
        { key: 'pickupAddress',   label: 'Pickup Address' },
        { key: 'deliveryAddress', label: 'Delivery Address' },
        { key: 'notes',           label: 'Notes (optional)' },
      ];

  return (
    <AuthGuard>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{isAdmin ? 'All Deliveries' : 'My Deliveries'}</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
        >
          {showForm ? 'Cancel' : '+ New Delivery'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow p-6 mb-6 grid grid-cols-2 gap-4">
          {formFields.map(f => (
            <div key={f.key} className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">{f.label}</label>
              <input
                required={!f.label.includes('optional')}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                value={(form as any)[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="col-span-2">
            <button type="submit" disabled={loading}
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
              {['Tracking', 'Customer', 'Pickup', 'Destination', 'Status', 'Rider', 'Date', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {deliveries.map(d => (
              <tr key={d._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-semibold text-xs">{d.trackingCode}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{d.customerName}</p>
                  <p className="text-xs text-gray-400">{d.customerPhone}</p>
                </td>
                <td className="px-4 py-3 max-w-[110px] truncate text-xs">{d.pickupAddress}</td>
                <td className="px-4 py-3 max-w-[110px] truncate text-xs">{d.deliveryAddress}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[d.status] ?? ''}`}>
                    {d.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">{d.rider?.name ?? <span className="text-gray-400">—</span>}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{new Date(d.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    {isAdmin && d.status === 'pending' && (
                      assigning === d._id ? (
                        <div className="flex gap-1 items-center">
                          <select
                            className="border rounded px-2 py-1 text-xs"
                            value={selectedRider[d._id] ?? ''}
                            onChange={e => setSelectedRider(r => ({ ...r, [d._id]: e.target.value }))}
                          >
                            <option value="">Select rider</option>
                            {riders.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                          </select>
                          <button onClick={() => handleAssign(d._id)}
                            className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700">
                            Assign
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setAssigning(d._id)}
                          className="text-blue-600 hover:underline text-xs">
                          Assign Rider
                        </button>
                      )
                    )}
                    {['pending', 'accepted'].includes(d.status) && (
                      <button onClick={() => handleCancel(d._id)}
                        className="text-red-500 hover:underline text-xs">
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!deliveries.length && (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">No deliveries yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AuthGuard>
  );
}
