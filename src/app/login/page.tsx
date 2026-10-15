'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Shield, KeyRound, User, AlertCircle, ArrowRight, Check } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Authentication failed. Please verify credentials.');
        return;
      }

      if (data.user.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/author/dashboard');
      }
      router.refresh();
    } catch (err) {
      console.error('Login error:', err);
      setErrorMessage('Network error occurred. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-slate-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo and Heading */}
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-700 text-white flex items-center justify-center shadow-md">
            <BookOpen className="w-7 h-7" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-bold tracking-tight text-slate-900 font-serif">
          BookLeaf Publishing
        </h2>
        <p className="mt-1 text-center text-sm text-stone-600">
          Author Support & Operational Communication Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xs border border-stone-200 rounded-2xl sm:px-10">
          {errorMessage && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-rose-800 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                Email Address
              </label>
              <div className="mt-1 relative rounded-lg">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="author@example.com"
                  className="block w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-slate-900 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:bg-white text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                Password
              </label>
              <div className="mt-1 relative rounded-lg">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-slate-900 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:bg-white text-sm transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg shadow-xs text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900 disabled:opacity-50 transition-colors"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-stone-100">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider text-center mb-3">
              Seeded Evaluation Accounts
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setDemoCredentials('admin@bookleafpublishing.com', 'BookleafAdmin@2026')}
                className="w-full text-left p-2.5 rounded-lg border border-indigo-100 bg-indigo-50/60 hover:bg-indigo-100/70 transition-colors flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-indigo-700" />
                  <div>
                    <span className="font-semibold text-indigo-950 block">Operations Admin</span>
                    <span className="text-indigo-700 font-mono text-[11px]">admin@bookleafpublishing.com</span>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-indigo-600 underline">Fill</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('vikram.seth@example.com', 'AuthorPass@2026')}
                className="w-full text-left p-2.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 transition-colors flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-stone-600" />
                  <div>
                    <span className="font-semibold text-stone-900 block">Vikram Seth (Published, 2 Books)</span>
                    <span className="text-stone-500 font-mono text-[11px]">vikram.seth@example.com</span>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-stone-600 underline">Fill</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('anita.nair@example.com', 'AuthorPass@2026')}
                className="w-full text-left p-2.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 transition-colors flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-stone-600" />
                  <div>
                    <span className="font-semibold text-stone-900 block">Anita Nair (Pending Royalty Case)</span>
                    <span className="text-stone-500 font-mono text-[11px]">anita.nair@example.com</span>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-stone-600 underline">Fill</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('rohan.sharma@example.com', 'AuthorPass@2026')}
                className="w-full text-left p-2.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 transition-colors flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-stone-600" />
                  <div>
                    <span className="font-semibold text-stone-900 block">Rohan Sharma (Book in Typesetting)</span>
                    <span className="text-stone-500 font-mono text-[11px]">rohan.sharma@example.com</span>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-stone-600 underline">Fill</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-stone-400">
          Protected by BookLeaf Secure Session & Rate Limiting • Enterprise SLA
        </div>
      </div>
    </div>
  );
}
