'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { trackDelivery } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const STATUS_COLOR: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-800 border-yellow-200',
  accepted:   'bg-blue-100 text-blue-800 border-blue-200',
  in_transit: 'bg-purple-100 text-purple-800 border-purple-200',
  delivered:  'bg-green-100 text-green-800 border-green-200',
  failed:     'bg-red-100 text-red-800 border-red-200',
  cancelled:  'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUS_ICON: Record<string, string> = {
  pending:    '🕐',
  accepted:   '✅',
  in_transit: '🚚',
  delivered:  '🎉',
  failed:     '❌',
  cancelled:  '🚫',
};

const STATUS_STEPS = [
  { key: 'pending',    label: 'Booked',     icon: '📋' },
  { key: 'accepted',   label: 'Accepted',   icon: '✅' },
  { key: 'in_transit', label: 'In Transit', icon: '🚚' },
  { key: 'delivered',  label: 'Delivered',  icon: '🎉' },
];

export default function TrackPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [code, setCode]       = useState('');
  const [result, setResult]   = useState<any>(null);
  const [error, setError]     = useState('');
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

  function handleReset() {
    setResult(null);
    setError('');
    setCode('');
  }

  const stepIndex = result ? STATUS_STEPS.findIndex(s => s.key === result.status) : -1;
  const isFailed  = result && ['failed', 'cancelled'].includes(result.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 flex flex-col">
      {/* Top nav */}
      <div className="flex items-center justify-between px-6 py-4">
        <button
          onClick={() => user ? router.back() : router.push('/login')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition text-sm"
        >
          <span className="text-lg">←</span>
          <span>{user ? 'Go Back' : 'Sign In'}</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-yellow-400 flex items-center justify-center text-gray-950 font-black text-xs">R</div>
          <span className="text-white font-bold tracking-tight">RiderR</span>
        </div>

        {!user && (
          <Link href="/register" className="text-yellow-400 hover:text-yellow-300 transition text-sm font-medium">
            Register
          </Link>
        )}
        {user && <div className="w-16" />}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-10">
        <div className="w-full max-w-lg">

          {/* Search card — always visible */}
          <div className="bg-white rounded-2xl shadow-2xl p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Track Delivery</h2>
                <p className="text-xs text-gray-500 mt-0.5">Enter your tracking code below</p>
              </div>
              {result && (
                <button onClick={handleReset} className="text-xs text-gray-400 hover:text-gray-600 transition underline">
                  Clear
                </button>
              )}
            </div>

            <form onSubmit={handleTrack} className="flex gap-2">
              <input
                required
                placeholder="e.g. RDR-A1B2C3"
                className="flex-1 border rounded-xl px-4 py-3 text-sm uppercase font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-gray-50"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
              />
              <button
                type="submit" disabled={loading}
                className="bg-gray-900 text-white px-5 py-3 rounded-xl text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50 flex items-center gap-1"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                ) : '🔍'}
              </button>
            </form>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mt-3 flex items-center gap-2">
                <span>❌</span> {error}
              </div>
            )}
          </div>

          {/* Result card */}
          {result && (
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Status header */}
              <div className={`px-6 py-5 border-b ${STATUS_COLOR[result.status]} flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{STATUS_ICON[result.status]}</span>
                  <div>
                    <p className="font-mono font-bold text-gray-800 text-base">{result.trackingCode}</p>
                    <p className="text-xs font-semibold uppercase tracking-wide mt-0.5">
                      {result.status.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                {result.price && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Est. Cost</p>
                    <p className="font-bold text-gray-800">₦{result.price.toLocaleString()}</p>
                  </div>
                )}
              </div>

              <div className="p-6 space-y-5">
                {/* Progress stepper */}
                {!isFailed && (
                  <div className="flex items-center">
                    {STATUS_STEPS.map((step, i) => {
                      const done    = i <= stepIndex;
                      const current = i === stepIndex;
                      const last    = i === STATUS_STEPS.length - 1;
                      return (
                        <div key={step.key} className="flex items-center flex-1 last:flex-none">
                          <div className="flex flex-col items-center gap-1">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base transition-all ${
                              done ? 'bg-yellow-400 shadow-md' : 'bg-gray-100'
                            } ${current ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}`}>
                              {step.icon}
                            </div>
                            <span className={`text-[10px] font-medium whitespace-nowrap ${done ? 'text-gray-700' : 'text-gray-400'}`}>
                              {step.label}
                            </span>
                          </div>
                          {!last && (
                            <div className={`flex-1 h-0.5 mx-1 mb-4 rounded ${i < stepIndex ? 'bg-yellow-400' : 'bg-gray-200'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Delivery details */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                  <div className="flex gap-3">
                    <span className="text-green-500 text-base mt-0.5">📍</span>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">PICKUP</p>
                      <p className="text-gray-700">{result.pickupAddress}</p>
                    </div>
                  </div>
                  <div className="border-l-2 border-dashed border-gray-300 ml-3 h-3" />
                  <div className="flex gap-3">
                    <span className="text-red-500 text-base mt-0.5">🏁</span>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">DESTINATION</p>
                      <p className="text-gray-700 font-medium">{result.deliveryAddress}</p>
                    </div>
                  </div>
                </div>

                {/* Customer & rider info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 font-medium mb-1">CUSTOMER</p>
                    <p className="font-semibold text-gray-800">{result.customerName}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 font-medium mb-1">RIDER</p>
                    {result.rider ? (
                      <>
                        <p className="font-semibold text-gray-800">{result.rider.name}</p>
                        <p className="text-xs text-gray-500">{result.rider.phone}</p>
                      </>
                    ) : (
                      <p className="text-gray-400 text-xs">Not yet assigned</p>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 col-span-2">
                    <p className="text-xs text-gray-400 font-medium mb-1">BOOKED</p>
                    <p className="text-gray-700">{new Date(result.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                {/* Status history */}
                {result.statusHistory?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">Timeline</p>
                    <div className="space-y-2">
                      {[...result.statusHistory].reverse().map((h: any, i: number) => (
                        <div key={i} className="flex gap-3 items-start">
                          <div className="w-2 h-2 rounded-full bg-yellow-400 mt-1.5 shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700 capitalize">{h.status.replace('_', ' ')}</p>
                            {h.note && <p className="text-xs text-red-500">{h.note}</p>}
                            <p className="text-xs text-gray-400">{new Date(h.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Track another */}
                <button
                  onClick={handleReset}
                  className="w-full border-2 border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:border-gray-300 hover:bg-gray-50 transition"
                >
                  Track Another Delivery
                </button>
              </div>
            </div>
          )}

          {/* Footer links */}
          {!result && (
            <p className="text-center text-gray-500 text-sm mt-4">
              {user ? (
                <button onClick={() => router.back()} className="hover:text-white transition">
                  ← Back to dashboard
                </button>
              ) : (
                <>
                  <Link href="/login" className="hover:text-white transition">Sign in</Link>
                  {' · '}
                  <Link href="/register" className="hover:text-white transition">Create account</Link>
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
