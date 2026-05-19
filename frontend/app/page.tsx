'use client';
import { useEffect, useState } from 'react';
import { fetchAnalytics } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  accepted: '#3b82f6',
  in_transit: '#8b5cf6',
  delivered: '#10b981',
  failed: '#ef4444',
};

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchAnalytics().then(setAnalytics);
  }, []);

  const total = Object.values(analytics).reduce((a, b) => a + b, 0);

  const chartData = Object.entries(analytics).map(([status, count]) => ({
    status: status.replace('_', ' '),
    count,
    key: status,
  }));

  const stats = [
    { label: 'Total Deliveries', value: total, color: 'bg-gray-800' },
    { label: 'Pending', value: analytics.pending ?? 0, color: 'bg-yellow-500' },
    { label: 'In Transit', value: analytics.in_transit ?? 0, color: 'bg-purple-500' },
    { label: 'Delivered', value: analytics.delivered ?? 0, color: 'bg-green-500' },
    { label: 'Failed', value: analytics.failed ?? 0, color: 'bg-red-500' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Overview</h2>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        {stats.map(s => (
          <div key={s.label} className={`${s.color} text-white rounded-xl p-4 shadow`}>
            <p className="text-sm opacity-80">{s.label}</p>
            <p className="text-3xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Delivery Status Breakdown</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} barSize={48}>
            <XAxis dataKey="status" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {chartData.map(entry => (
                <Cell key={entry.key} fill={STATUS_COLORS[entry.key] ?? '#6b7280'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
