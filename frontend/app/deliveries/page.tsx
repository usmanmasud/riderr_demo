'use client';
import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { fetchDeliveries, fetchRiders, createDelivery, assignRider, cancelDelivery, exportDeliveries, rateDelivery } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import { useSocket } from '@/hooks/useSocket';

const MapModal = dynamic(() => import('@/components/MapModal'), { ssr: false });

type Rider    = { _id: string; name: string; phone: string };
type Delivery = {
  _id: string; trackingCode: string; customerName: string; customerPhone: string;
  pickupAddress: string; deliveryAddress: string; status: string;
  rider: Rider | null; createdAt: string; notes?: string; price?: number;
};

const STATUS_BADGE: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-800',
  accepted:   'bg-blue-100 text-blue-800',
  in_transit: 'bg-purple-100 text-purple-800',
  delivered:  'bg-green-100 text-green-800',
  failed:     'bg-red-100 text-red-800',
  cancelled:  'bg-gray-100 text-gray-600',
};

const EMPTY = { customerName: '', customerPhone: '', pickupAddress: '', deliveryAddress: '', notes: '', scheduledAt: '' };

export default function DeliveriesPage() {
  const { isAdmin, user } = useAuth();
  const [deliveries, setDeliveries]     = useState<Delivery[]>([]);
  const [riders, setRiders]             = useState<Rider[]>([]);
  const [form, setForm]                 = useState(EMPTY);
  const [showForm, setShowForm]         = useState(false);
  const [loading, setLoading]           = useState(false);
  const [assigning, setAssigning]       = useState<string | null>(null);
  const [selectedRider, setSelectedRider] = useState<Record<string, string>>({});
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [mapDelivery, setMapDelivery]   = useState<Delivery | null>(null);
  const [ratingDelivery, setRatingDelivery] = useState<Delivery | null>(null);
  const [ratingScore, setRatingScore]   = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [liveAlert, setLiveAlert]       = useState('');

  const load = useCallback(async () => {
    const params: Record<string, string> = {};
    if (search)       params.search = search;
    if (statusFilter) params.status = statusFilter;
    const data = await fetchDeliveries(params);
    setDeliveries(Array.isArray(data) ? data : []);
  }, [search, statusFilter]);

  useEffect(() => {
    load();
    if (isAdmin) fetchRiders().then(d => setRiders(Array.isArray(d) ? d : []));
  }, [isAdmin, load]);

  // Live socket updates
  useSocket(
    (newD) => {
      setDeliveries(prev => [newD, ...prev]);
      setLiveAlert(`New delivery booked: ${newD.trackingCode}`);
      setTimeout(() => setLiveAlert(''), 4000);
    },
    (updated) => {
      setDeliveries(prev => prev.map(d => d._id === updated._id ? { ...d, ...updated } : d));
    }
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
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

  async function handleExport() {
    const res = await exportDeliveries();
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'riderr-deliveries.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleRate(e: React.FormEvent) {
    e.preventDefault();
    if (!ratingDelivery) return;
    const res = await rateDelivery(ratingDelivery._id, ratingScore, ratingComment);
    if (res.error) { alert(res.error); return; }
    setRatingDelivery(null); setRatingComment(''); setRatingScore(5);
  }

  const formFields = [
    { key: 'customerName',    label: isAdmin ? 'Customer Name' : 'Your Name' },
    { key: 'customerPhone',   label: isAdmin ? 'Customer Phone' : 'Your Phone' },
    { key: 'pickupAddress',   label: 'Pickup Address' },
    { key: 'deliveryAddress', label: 'Delivery Address' },
    { key: 'scheduledAt',     label: 'Schedule For (optional)', type: 'datetime-local' },
    { key: 'notes',           label: 'Notes (optional)' },
  ];

  return (
    <AuthGuard>
      {/* Live alert */}
      {liveAlert && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-pulse">
          🔔 {liveAlert}
        </div>
      )}

      {/* Map modal */}
      {mapDelivery && (
        <MapModal
          pickup={mapDelivery.pickupAddress}
          destination={mapDelivery.deliveryAddress}
          trackingCode={mapDelivery.trackingCode}
          onClose={() => setMapDelivery(null)}
        />
      )}

      {/* Rating modal */}
      {ratingDelivery && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-800 mb-1">Rate this Delivery</h3>
            <p className="text-sm text-gray-500 mb-4">{ratingDelivery.trackingCode} · Rider: {ratingDelivery.rider?.name}</p>
            <form onSubmit={handleRate} className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 block mb-2">Score</label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button" onClick={() => setRatingScore(n)}
                      className={`w-10 h-10 rounded-full text-lg transition ${ratingScore >= n ? 'text-yellow-400' : 'text-gray-300'}`}>
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Comment (optional)</label>
                <textarea rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  value={ratingComment} onChange={e => setRatingComment(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-yellow-400 text-gray-900 py-2 rounded-lg font-medium hover:bg-yellow-500 transition">Submit</button>
                <button type="button" onClick={() => setRatingDelivery(null)} className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg font-medium hover:bg-gray-200 transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800">{isAdmin ? 'All Deliveries' : 'My Deliveries'}</h2>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <button onClick={handleExport}
              className="bg-white border text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm">
              ⬇ Export CSV
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition text-sm">
            {showForm ? 'Cancel' : '+ New Delivery'}
          </button>
        </div>
      </div>

      {/* Search & filter */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          placeholder="Search by tracking, name, phone..."
          className="flex-1 min-w-[200px] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          {['pending','accepted','in_transit','delivered','failed','cancelled'].map(s => (
            <option key={s} value={s}>{s.replace('_',' ')}</option>
          ))}
        </select>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow p-6 mb-6 grid grid-cols-2 gap-4">
          {formFields.map(f => (
            <div key={f.key} className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">{f.label}</label>
              <input
                type={f.type || 'text'}
                required={!f.label.includes('optional')}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                value={(form as any)[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="col-span-2">
            <button type="submit" disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Delivery'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              {['Tracking', 'Customer', 'Pickup', 'Destination', 'Status', 'Rider', 'Price', 'Date', 'Actions'].map(h => (
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
                <td className="px-4 py-3 max-w-[100px] truncate text-xs">{d.pickupAddress}</td>
                <td className="px-4 py-3 max-w-[100px] truncate text-xs">{d.deliveryAddress}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[d.status] ?? ''}`}>
                    {d.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">{d.rider?.name ?? <span className="text-gray-400">—</span>}</td>
                <td className="px-4 py-3 text-xs font-medium">{d.price ? `₦${d.price.toLocaleString()}` : '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{new Date(d.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <button onClick={() => setMapDelivery(d)}
                      className="text-gray-500 hover:text-gray-800 text-xs hover:underline">
                      🗺 Map
                    </button>
                    {isAdmin && d.status === 'pending' && (
                      assigning === d._id ? (
                        <div className="flex gap-1 items-center">
                          <select className="border rounded px-2 py-1 text-xs"
                            value={selectedRider[d._id] ?? ''}
                            onChange={e => setSelectedRider(r => ({ ...r, [d._id]: e.target.value }))}>
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
                    {d.status === 'delivered' && (
                      <button onClick={() => setRatingDelivery(d)}
                        className="text-yellow-600 hover:underline text-xs">
                        ★ Rate
                      </button>
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
              <tr><td colSpan={9} className="text-center py-10 text-gray-400">No deliveries found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AuthGuard>
  );
}
