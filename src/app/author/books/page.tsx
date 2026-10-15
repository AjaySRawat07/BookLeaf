'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AuthorLayout } from '@/components/AuthorLayout';
import { formatINR } from '@/components/StatusBadge';
import { BookOpen, Search, ArrowUpDown, ChevronRight, Loader2, Sparkles } from 'lucide-react';

interface BookItem {
  id: string;
  title: string;
  isbn: string;
  genre: string;
  publicationDate: string | null;
  status: 'PUBLISHED' | 'IN_PRODUCTION' | 'DRAFT';
  productionStage: string | null;
  mrp: number;
  copiesSold: number;
  totalRoyaltyEarned: number;
  royaltyPaid: number;
  royaltyPending: number;
  platforms: string[];
}

interface Summary {
  totalBooks: number;
  publishedBooks: number;
  inProductionBooks: number;
  copiesSold: number;
  totalRoyaltyEarned: number;
  royaltyPaid: number;
  royaltyPending: number;
}

export default function AuthorBooksPage() {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'IN_PRODUCTION'>('ALL');
  const [sortBy, setSortBy] = useState('copiesSold');
  const [userProfile, setUserProfile] = useState<{ id: string; name: string; email: string; role: string } | null>(null);

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      params.set('sortBy', sortBy);

      const res = await fetch(`/api/author/books?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBooks(data.books || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error('Error fetching books:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sortBy]);

  useEffect(() => {
    // Fetch profile
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) setUserProfile(d.user);
      });
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  return (
    <AuthorLayout user={userProfile || { id: '', name: 'Author', email: '', role: 'AUTHOR' }}>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-serif">My Books & Royalties</h1>
            <p className="text-sm text-stone-600 mt-1">
              Complete catalog, platform distribution channels, and sales performance.
            </p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by title, ISBN, or genre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:bg-white text-slate-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Status Filter */}
            <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-lg">
              {(['ALL', 'PUBLISHED', 'IN_PRODUCTION'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    statusFilter === st
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-stone-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'ALL' ? 'All Books' : st === 'PUBLISHED' ? 'Published' : 'In Production'}
                </button>
              ))}
            </div>

            {/* Sort Selector */}
            <div className="flex items-center space-x-1.5 text-xs text-stone-600">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
              >
                <option value="copiesSold">Sort: Copies Sold</option>
                <option value="totalRoyaltyEarned">Sort: Royalty Earned</option>
                <option value="mrp">Sort: MRP</option>
                <option value="title">Sort: Title (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Books List Table / Cards */}
        {loading ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-700" />
            <p className="text-sm text-stone-500">Loading catalog...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center">
            <BookOpen className="w-10 h-10 text-stone-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900">No books found</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              {search || statusFilter !== 'ALL'
                ? 'Try adjusting your search criteria or filter options.'
                : 'No books have been published or submitted yet.'}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Book Details</th>
                    <th className="py-3.5 px-4">Status & Stage</th>
                    <th className="py-3.5 px-4 text-right">MRP</th>
                    <th className="py-3.5 px-4 text-right">Copies Sold</th>
                    <th className="py-3.5 px-4 text-right">Royalty Earned</th>
                    <th className="py-3.5 px-4 text-right">Paid</th>
                    <th className="py-3.5 px-4 text-right">Pending</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-slate-800">
                  {books.map((b) => (
                    <tr key={b.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-4 px-4">
                        <Link
                          href={`/author/books/${b.id}`}
                          className="font-semibold text-slate-900 text-sm hover:text-indigo-700 transition-colors block"
                        >
                          {b.title}
                        </Link>
                        <p className="text-stone-500 font-mono text-[11px] mt-0.5">
                          ISBN: {b.isbn} • {b.genre}
                        </p>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        {b.status === 'PUBLISHED' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Published
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              In Production
                            </span>
                            {b.productionStage && (
                              <p className="text-[10px] text-stone-500 capitalize">
                                {b.productionStage.replace(/_/g, ' ').toLowerCase()}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right font-medium">
                        {formatINR(b.mrp)}
                      </td>
                      <td className="py-4 px-4 text-right font-semibold text-slate-900">
                        {b.copiesSold.toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-slate-900 font-serif">
                        {formatINR(b.totalRoyaltyEarned)}
                      </td>
                      <td className="py-4 px-4 text-right text-emerald-800 font-medium">
                        {formatINR(b.royaltyPaid)}
                      </td>
                      <td className="py-4 px-4 text-right font-semibold text-amber-900">
                        {formatINR(b.royaltyPending)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Link
                          href={`/author/books/${b.id}`}
                          className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-700 hover:text-indigo-800"
                        >
                          <span>Details</span>
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
    </AuthorLayout>
  );
}
