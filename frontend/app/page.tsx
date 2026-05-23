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

const STAT_META = [
  { key: 'total',      label: 'Total Deliveries', icon: '📊', gradient: 'from-gray-800 to-gray-900' },
  { key: 'pending',    label: 'Pending',           icon: '⏳', gradient: 'from-yellow-400 to-yellow-500' },
  { key: 'in_transit', label: 'In Transit',        icon: '🚚', gradient: 'from-purple-500 to-purple-600' },
  { key: 'delivered',  label: 'Delivered',         icon: '✅', gradient: 'from-emerald-500 to-emerald-600' },
  { key: 'failed',     label: 'Failed',            icon: '❌', gradient: 'from-red-500 to-red-600' },
];

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Record<string, number>>({});

  useEffect(() => { fetchAnalytics().then(setAnalytics); }, []);

  const total = Object.values(analytics).reduce((a, b) => a + b, 0);
  const data = { ...analytics, total };

  const chartData = Object.entries(analytics).map(([status, count]) => ({
    status: status.replace('_', ' '),
    count,
    key: status,
  }));

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 mt-1 text-sm">Welcome back — here's what's happening today.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {STAT_META.map(s => (
          <div
            key={s.key}
            className={`bg-gradient-to-br ${s.gradient} text-white rounded-2xl p-5 shadow-md flex flex-col gap-3`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium opacity-80 uppercase tracking-wide">{s.label}</p>
              <span className="text-lg">{s.icon}</span>
            </div>
            <p className="text-4xl font-bold">{data[s.key] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-gray-800">Delivery Status Breakdown</h3>
            <p className="text-xs text-gray-400 mt-0.5">All-time delivery distribution</p>
          </div>
          <div className="flex gap-3 flex-wrap justify-end">
            {Object.entries(STATUS_COLORS).map(([key, color]) => (
              <span key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
                {key.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} barSize={44} barCategoryGap="30%">
            <XAxis dataKey="status" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 13 }}
              cursor={{ fill: '#f3f4f6' }}
            />
            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
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
