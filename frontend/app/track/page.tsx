'use client';
import { useState } from 'react';
import Link from 'next/link';
import { trackDelivery } from '@/lib/api';

const STATUS_COLOR: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-800',
  accepted:   'bg-blue-100 text-blue-800',
  in_transit: 'bg-purple-100 text-purple-800',
  delivered:  'bg-green-100 text-green-800',
  failed:     'bg-red-100 text-red-800',
  cancelled:  'bg-gray-100 text-gray-600',
};

const STATUS_STEPS = ['pending', 'accepted', 'in_transit', 'delivered'];

export default function TrackPage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setResult(null);
    setLoading(true);
    try {
      const data = await trackDelivery(code.trim().toUpperCase());
      if (data.error) { setError(data.error); return; }
      setResult(data);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const stepIndex = result ? STATUS_STEPS.indexOf(result.status) : -1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-800 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 rounded-lg bg-yellow-400 flex items-center justify-center text-gray-950 font-black">R</div>
          <span className="text-2xl font-bold tracking-tight text-white">RiderR</span>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-1">Track Your Delivery</h2>
          <p className="text-sm text-gray-500 mb-6">Enter your tracking code to see the status</p>

          <form onSubmit={handleTrack} className="flex gap-2">
            <input
              required
              placeholder="e.g. RDR-A1B2C3"
              className="flex-1 border rounded-lg px-3 py-2.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-yellow-400"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
            />
            <button
              type="submit" disabled={loading}
              className="bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50"
            >
              {loading ? '...' : 'Track'}
            </button>
          </form>

          {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mt-4">{error}</div>}

          {result && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-gray-800 text-lg">{result.trackingCode}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[result.status] ?? ''}`}>
                  {result.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              {/* Progress bar */}
              {!['failed', 'cancelled'].includes(result.status) && (
                <div className="flex items-center gap-1 mt-2">
                  {STATUS_STEPS.map((s, i) => (
                    <div key={s} className="flex-1 flex flex-col items-center gap-1">
                      <div className={`h-2 w-full rounded-full ${i <= stepIndex ? 'bg-yellow-400' : 'bg-gray-200'}`} />
                      <span className="text-[10px] text-gray-400 capitalize">{s.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex gap-2"><span className="text-gray-500 w-24">Customer</span><span className="font-medium">{result.customerName}</span></div>
                <div className="flex gap-2"><span className="text-gray-500 w-24">Pickup</span><span>{result.pickupAddress}</span></div>
                <div className="flex gap-2"><span className="text-gray-500 w-24">Destination</span><span>{result.deliveryAddress}</span></div>
                {result.rider && (
                  <div className="flex gap-2"><span className="text-gray-500 w-24">Rider</span><span>{result.rider.name} · {result.rider.phone}</span></div>
                )}
                <div className="flex gap-2"><span className="text-gray-500 w-24">Booked</span><span>{new Date(result.createdAt).toLocaleString()}</span></div>
              </div>

              {result.statusHistory?.length > 1 && (
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">History</p>
                  <div className="space-y-1">
                    {result.statusHistory.map((h: any, i: number) => (
                      <div key={i} className="flex gap-3 text-xs text-gray-600">
                        <span className="text-gray-400">{new Date(h.timestamp).toLocaleString()}</span>
                        <span className="capitalize font-medium">{h.status.replace('_', ' ')}</span>
                        {h.note && <span className="text-gray-400">— {h.note}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-gray-400 text-sm mt-6">
          <Link href="/login" className="hover:text-white transition">Sign in</Link>
          {' · '}
          <Link href="/register" className="hover:text-white transition">Create account</Link>
        </p>
      </div>
    </div>
  );
}
