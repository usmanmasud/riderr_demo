'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { fetchRiderMe, fetchRiderJobs, updateDeliveryStatus } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';

const STATUS_BADGE: Record<string, string> = {
  accepted:   'bg-blue-100 text-blue-800',
  in_transit: 'bg-purple-100 text-purple-800',
  delivered:  'bg-green-100 text-green-800',
  failed:     'bg-red-100 text-red-800',
};

type Delivery = {
  _id: string; trackingCode: string; customerName: string; customerPhone: string;
  pickupAddress: string; deliveryAddress: string; status: string; createdAt: string;
};

export default function RiderDashboard() {
  const { user, riderProfile, logout, loading } = useAuth();
  const router = useRouter();
  const [jobs, setJobs]         = useState<Delivery[]>([]);
  const [filter, setFilter]     = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [profile, setProfile]   = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) { router.replace('/login'); return; }
    if (!loading && user && user.role !== 'rider') { router.replace('/'); }
  }, [user, loading, router]);

  const loadJobs = async () => {
    const data = await fetchRiderJobs(filter === 'all' ? undefined : filter);
    setJobs(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    if (user?.role === 'rider') {
      loadJobs();
      fetchRiderMe().then(d => { if (!d.error) setProfile(d); });
    }
  }, [user, filter]);

  // Live updates — refresh if a job changes
  useSocket(undefined, (updated) => {
    setJobs(prev => prev.map(j => j._id === updated._id ? { ...j, ...updated } : j));
  });

  async function markInTransit(id: string) {
    setUpdating(id);
    await updateDeliveryStatus(id, 'in_transit');
    await loadJobs();
    setUpdating(null);
  }

  function handleLogout() { logout(); router.replace('/login'); }

  if (loading || !user) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const active    = jobs.filter(j => ['accepted', 'in_transit'].includes(j.status)).length;
  const delivered = jobs.filter(j => j.status === 'delivered').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gray-950 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center text-gray-950 font-black text-sm">R</div>
          <div>
            <p className="font-bold text-sm">RiderR Portal</p>
            <p className="text-xs text-gray-400">{user.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {profile && (
            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-400">Rating</p>
              <p className="text-sm font-bold text-yellow-400">⭐ {profile.rating?.toFixed(1)}</p>
            </div>
          )}
          <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300">Sign Out</button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-2">
          {[
            { label: 'Total Jobs',  value: profile?.totalDeliveries ?? 0, color: 'bg-gray-800' },
            { label: 'Active',      value: active,    color: 'bg-purple-600' },
            { label: 'Delivered',   value: delivered, color: 'bg-green-600' },
          ].map(s => (
            <div key={s.label} className={`${s.color} text-white rounded-xl p-3 text-center shadow`}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs opacity-80 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['all', 'accepted', 'in_transit', 'delivered'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                filter === f ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}>
              {f.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
            </button>
          ))}
        </div>

        {/* Job cards */}
        <div className="space-y-3">
          {jobs.map(job => (
            <div key={job._id} className="bg-white rounded-xl shadow p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-mono font-bold text-gray-800">{job.trackingCode}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{new Date(job.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_BADGE[job.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {job.status.replace('_', ' ')}
                </span>
              </div>

              <div className="space-y-1.5 text-sm mb-3">
                <div className="flex gap-2">
                  <span className="text-gray-400 w-20 shrink-0">Customer</span>
                  <span className="font-medium">{job.customerName} · {job.customerPhone}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-400 w-20 shrink-0">Pickup</span>
                  <span>{job.pickupAddress}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-400 w-20 shrink-0">Deliver to</span>
                  <span className="font-medium text-gray-800">{job.deliveryAddress}</span>
                </div>
              </div>

              {job.status === 'accepted' && (
                <button
                  onClick={() => markInTransit(job._id)}
                  disabled={updating === job._id}
                  className="w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {updating === job._id ? 'Updating...' : '🚀 Mark as Picked Up (In Transit)'}
                </button>
              )}

              {job.status === 'in_transit' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  📦 Package in transit — ask customer for OTP to confirm delivery via USSD or web
                </div>
              )}
            </div>
          ))}

          {!jobs.length && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">🏍️</p>
              <p className="font-medium">No jobs found</p>
              <p className="text-sm mt-1">Check back soon or dial USSD to accept jobs</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
