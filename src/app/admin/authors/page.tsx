'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/AdminLayout';
import { formatINR } from '@/components/StatusBadge';
import { Users, Search, BookOpen, ChevronRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface AuthorItem {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  bookCount: number;
  copiesSold: number;
  totalRoyaltyEarned: number;
  royaltyPaid: number;
  royaltyPending: number;
  openTicketCount: number;
  profile?: {
    country: string;
    penName?: string | null;
    bankAccountLinked: boolean;
    bankName?: string | null;
  } | null;
}

export default function AdminAuthorsPage() {
  const [authors, setAuthors] = useState<AuthorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [adminUser, setAdminUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);

  const fetchAuthors = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/authors?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAuthors(data.authors || []);
      }
    } catch (err) {
      console.error('Failed to load authors:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) setAdminUser(d.user);
      });
  }, []);

  useEffect(() => {
    fetchAuthors();
  }, [fetchAuthors]);

  return (
    <AdminLayout user={adminUser || { id: '', name: 'Ops Admin', email: '', role: 'ADMIN' }}>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-serif">Authors & Catalog Registry</h1>
            <p className="text-xs text-stone-600 mt-1">
              Registered publishing authors, platform sales volumes, and active support tickets.
            </p>
          </div>
          <span className="text-xs text-stone-500 font-mono">
            Total Authors: <strong className="text-slate-900">{authors.length}</strong>
          </span>
        </div>

        {/* Search Bar */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search author name, pen name, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:bg-white text-slate-900"
            />
          </div>
        </div>

        {/* Authors Table */}
        {loading ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-700" />
            <p className="text-sm text-stone-500">Loading author directory...</p>
          </div>
        ) : authors.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center text-xs text-stone-500">
            No authors found matching search.
          </div>
        ) : (
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Author Profile</th>
                    <th className="py-3.5 px-4">Country & Bank</th>
                    <th className="py-3.5 px-4 text-center">Titles</th>
                    <th className="py-3.5 px-4 text-right">Copies Sold</th>
                    <th className="py-3.5 px-4 text-right">Earned</th>
                    <th className="py-3.5 px-4 text-right">Paid</th>
                    <th className="py-3.5 px-4 text-right">Pending</th>
                    <th className="py-3.5 px-4 text-center">Open Tickets</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-slate-800">
                  {authors.map((a) => (
                    <tr key={a.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-4 px-4">
                        <Link
                          href={`/admin/authors/${a.id}`}
                          className="font-semibold text-slate-900 text-sm hover:text-indigo-700 transition-colors block"
                        >
                          {a.name}
                        </Link>
                        <p className="text-stone-500 text-[11px] mt-0.5">
                          {a.profile?.penName ? `Pen: ${a.profile.penName} • ` : ''}
                          <span className="font-mono">{a.email}</span>
                        </p>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="text-slate-800 font-medium block">
                          {a.profile?.country || 'India'}
                        </span>
                        {a.profile?.bankAccountLinked ? (
                          <span className="inline-flex items-center text-[10px] text-emerald-700 font-medium mt-0.5">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {a.profile.bankName || 'Bank Linked'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] text-rose-600 font-medium mt-0.5">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Bank Unlinked
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center font-semibold text-slate-900">
                        {a.bookCount}
                      </td>

                      <td className="py-4 px-4 text-right font-medium">
                        {a.copiesSold.toLocaleString('en-IN')}
                      </td>

                      <td className="py-4 px-4 text-right font-bold text-slate-900 font-serif">
                        {formatINR(a.totalRoyaltyEarned)}
                      </td>

                      <td className="py-4 px-4 text-right text-emerald-800 font-medium">
                        {formatINR(a.royaltyPaid)}
                      </td>

                      <td className="py-4 px-4 text-right font-semibold text-amber-900">
                        {formatINR(a.royaltyPending)}
                      </td>

                      <td className="py-4 px-4 text-center">
                        {a.openTicketCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                            {a.openTicketCount} active
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <Link
                          href={`/admin/authors/${a.id}`}
                          className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-700 hover:text-indigo-800"
                        >
                          <span>Catalog</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
