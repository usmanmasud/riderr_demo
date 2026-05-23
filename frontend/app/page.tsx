'use client';
import { useEffect, useState } from 'react';
import { fetchAnalytics, fetchDeliveries } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import { useSocket } from '@/hooks/useSocket';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  pending:    '#f59e0b',
  accepted:   '#3b82f6',
  in_transit: '#8b5cf6',
  delivered:  '#10b981',
  failed:     '#ef4444',
  cancelled:  '#6b7280',
};

function AdminDashboard() {
  const [analytics, setAnalytics] = useState<Record<string, any>>({});

  const load = () => fetchAnalytics().then(d => { if (!d.error) setAnalytics(d); });
  useEffect(() => { load(); }, []);

  useSocket(() => load(), () => load());

  const chartData = Object.entries(analytics)
    .filter(([k]) => !['total', 'revenue', 'dailyTrend'].includes(k))
    .map(([status, count]) => ({ status: status.replace('_', ' '), count: count as number, key: status }));

  const stats = [
    { label: 'Total',      value: analytics.total      ?? 0, color: 'bg-gray-800' },
    { label: 'Pending',    value: analytics.pending     ?? 0, color: 'bg-yellow-500' },
    { label: 'In Transit', value: analytics.in_transit  ?? 0, color: 'bg-purple-500' },
    { label: 'Delivered',  value: analytics.delivered   ?? 0, color: 'bg-green-500' },
    { label: 'Failed',     value: analytics.failed      ?? 0, color: 'bg-red-500' },
  ];

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className={`${s.color} text-white rounded-xl p-4 shadow`}>
            <p className="text-sm opacity-80">{s.label}</p>
            <p className="text-3xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {analytics.revenue !== undefined && (
        <div className="bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-xl p-5 shadow mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">Total Revenue (Delivered)</p>
            <p className="text-3xl font-bold mt-1">₦{(analytics.revenue as number).toLocaleString()}</p>
          </div>
          <span className="text-5xl opacity-30">₦</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barSize={36}>
              <XAxis dataKey="status" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {chartData.map(e => <Cell key={e.key} fill={STATUS_COLORS[e.key] ?? '#6b7280'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={analytics.dailyTrend ?? []}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

function CustomerDashboard() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<any[]>([]);

  useEffect(() => {
    fetchDeliveries().then(d => setDeliveries(Array.isArray(d) ? d : []));
  }, []);

  const counts = {
    total:     deliveries.length,
    active:    deliveries.filter(d => ['accepted', 'in_transit'].includes(d.status)).length,
    delivered: deliveries.filter(d => d.status === 'delivered').length,
    pending:   deliveries.filter(d => d.status === 'pending').length,
  };

  return (
    <>
      <p className="text-gray-500 mb-6">Welcome back, {user?.name}!</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Bookings', value: counts.total,     color: 'bg-gray-800' },
          { label: 'Pending',        value: counts.pending,   color: 'bg-yellow-500' },
          { label: 'Active',         value: counts.active,    color: 'bg-purple-500' },
          { label: 'Delivered',      value: counts.delivered, color: 'bg-green-500' },
        ].map(s => (
          <div key={s.label} className={`${s.color} text-white rounded-xl p-4 shadow`}>
            <p className="text-sm opacity-80">{s.label}</p>
            <p className="text-3xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Deliveries</h3>
        {deliveries.slice(0, 5).map(d => (
          <div key={d._id} className="flex items-center justify-between py-3 border-b last:border-0">
            <div>
              <p className="font-mono font-semibold text-sm">{d.trackingCode}</p>
              <p className="text-xs text-gray-500">{d.deliveryAddress}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              d.status === 'delivered' ? 'bg-green-100 text-green-700' :
              d.status === 'pending'   ? 'bg-yellow-100 text-yellow-700' :
              'bg-purple-100 text-purple-700'
            }`}>
              {d.status.replace('_', ' ')}
            </span>
          </div>
        ))}
        {!deliveries.length && <p className="text-gray-400 text-sm">No deliveries yet. Go to My Deliveries to book one.</p>}
      </div>
    </>
  );
}

export default function DashboardPage() {
  const { isAdmin } = useAuth();
  return (
    <AuthGuard>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Overview</h2>
      {isAdmin ? <AdminDashboard /> : <CustomerDashboard />}
    </AuthGuard>
  );
}
