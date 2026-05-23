'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  const fields: { key: keyof typeof form; label: string; type: string }[] = [
    { key: 'name',     label: 'Full Name',        type: 'text' },
    { key: 'email',    label: 'Email',             type: 'email' },
    { key: 'phone',    label: 'Phone Number',      type: 'tel' },
    { key: 'password', label: 'Password',          type: 'password' },
    { key: 'confirm',  label: 'Confirm Password',  type: 'password' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 to-gray-800">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-lg bg-yellow-400 flex items-center justify-center text-gray-950 font-black">R</div>
          <span className="text-2xl font-bold tracking-tight text-gray-900">RiderR</span>
        </div>

        <h2 className="text-xl font-semibold text-gray-800 mb-1">Create an account</h2>
        <p className="text-sm text-gray-500 mb-6">Book and track your deliveries</p>

        {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {fields.map(f => (
            <div key={f.key}>
              <label className="text-sm text-gray-600 block mb-1">{f.label}</label>
              <input
                type={f.type} required={f.key !== 'phone'}
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                value={form[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <button
            type="submit" disabled={loading}
            className="bg-gray-900 text-white py-2.5 rounded-lg font-medium hover:bg-gray-700 transition disabled:opacity-50 mt-1"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-yellow-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
