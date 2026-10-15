'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { StatusBadge, PriorityBadge, CategoryBadge } from '@/components/StatusBadge';
import {
  Inbox,
  Search,
  Filter,
  ArrowUpDown,
  AlertOctagon,
  ChevronRight,
  ChevronLeft,
  Loader2,
  UserCheck,
  Clock,
  Sparkles,
} from 'lucide-react';
import { VALID_CATEGORIES } from '@/lib/ai/types';

interface TicketItem {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: string;
  category: string;
  priority: string;
  aiCategory?: string | null;
  aiPriority?: string | null;
  categoryOverridden: boolean;
  priorityOverridden: boolean;
  aiConfidence?: number | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  book?: {
    id: string;
    title: string;
    isbn: string;
  } | null;
  assignedAdmin?: {
    id: string;
    name: string;
    email: string;
  } | null;
  _count: {
    messages: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function TicketQueueContent() {
  const searchParams = useSearchParams();
  const initialPriority = searchParams.get('priority') || 'ALL';

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [priority, setPriority] = useState(initialPriority);
  const [sortBy, setSortBy] = useState('priority_urgency');
  const [adminUser, setAdminUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status !== 'ALL') params.set('status', status);
      if (category !== 'ALL') params.set('category', category);
      if (priority !== 'ALL') params.set('priority', priority);
      params.set('sortBy', sortBy);
      params.set('page', String(pagination.page));
      params.set('limit', String(pagination.limit));

      const res = await fetch(`/api/admin/tickets?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        if (data.pagination) setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to load queue:', err);
    } finally {
      setLoading(false);
    }
  }, [search, status, category, priority, sortBy, pagination.page, pagination.limit]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) setAdminUser(d.user);
      });
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  return (
    <AdminLayout user={adminUser || { id: '', name: 'Ops Admin', email: '', role: 'ADMIN' }}>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-serif">Operations Ticket Queue</h1>
            <p className="text-xs text-stone-600 mt-1">
              Central operational triage inbox. Prioritized by urgency and author impact.
            </p>
          </div>
          <div className="text-xs text-stone-500 font-mono">
            Total In Queue: <strong className="text-slate-900">{pagination.total}</strong>
          </div>
        </div>

        {/* Filter, Search, and Sort Panel */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search ticket #, subject, author, or book..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:bg-white text-slate-900"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-2 text-xs w-full md:w-auto justify-end">
              <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
              <span className="text-stone-500">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
              >
                <option value="priority_urgency">Urgency (Critical First, Oldest Unresolved)</option>
                <option value="createdAt">Creation Time (Newest)</option>
                <option value="updatedAt">Last Updated</option>
              </select>
            </div>
          </div>

          {/* Filter Pills Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-stone-100 text-xs">
            {/* Status Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open (Awaiting Response)</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            {/* Category Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
              >
                <option value="ALL">All Categories</option>
                {VALID_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Priority Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
              >
                <option value="ALL">All Priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tickets Queue Table */}
        {loading ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-700" />
            <p className="text-sm text-stone-500">Loading operations queue...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center space-y-2">
            <Inbox className="w-10 h-10 text-stone-400 mx-auto" />
            <h3 className="text-base font-semibold text-slate-900">No tickets found</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              There are no incoming tickets matching your filter criteria.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs divide-y divide-stone-100">
            {tickets.map((t) => {
              const isUrgentUnresolved = (t.priority === 'Critical' || t.priority === 'High') && t.status !== 'RESOLVED' && t.status !== 'CLOSED';
              const createdDate = new Date(t.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={t.id}
                  className={`p-5 hover:bg-stone-50/80 transition-colors ${
                    isUrgentUnresolved ? 'bg-rose-50/20' : ''
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Left: Identifiers & Badges */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          {t.ticketNumber}
                        </span>
                        <CategoryBadge category={t.category} />
                        {t.categoryOverridden && (
                          <span className="text-[10px] font-medium text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded-sm">
                            Manual Category Override
                          </span>
                        )}
                        <PriorityBadge priority={t.priority} />
                        {t.priorityOverridden && (
                          <span className="text-[10px] font-medium text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded-sm">
                            Manual Priority Override
                          </span>
                        )}
                        <StatusBadge status={t.status} />

                        {isUrgentUnresolved && (
                          <span className="inline-flex items-center text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
                            <AlertOctagon className="w-3 h-3 mr-1" />
                            Action Required
                          </span>
                        )}
                      </div>

                      {/* Subject */}
                      <Link
                        href={`/admin/tickets/${t.id}`}
                        className="font-bold text-slate-900 text-sm hover:text-indigo-700 transition-colors block line-clamp-1"
                      >
                        {t.subject}
                      </Link>

                      {/* Author & Book Meta */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                        <span>
                          Author: <strong className="text-slate-800">{t.author.name}</strong> ({t.author.email})
                        </span>
                        <span>
                          Book: <strong className="text-slate-800">{t.book ? t.book.title : 'General Account'}</strong>
                        </span>
                        <span>Created: {createdDate}</span>
                      </div>
                    </div>

                    {/* Right: Assignment & Workspace Action */}
                    <div className="flex items-center space-x-4 self-end lg:self-center shrink-0">
                      <div className="text-right text-xs">
                        {t.assignedAdmin ? (
                          <span className="inline-flex items-center text-stone-600 bg-stone-100 px-2.5 py-1 rounded-md text-[11px]">
                            <UserCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                            {t.assignedAdmin.name}
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[11px] italic">Unassigned</span>
                        )}
                        <span className="block text-[10px] text-stone-400 mt-0.5">
                          {t._count.messages} messages
                        </span>
                      </div>

                      <Link
                        href={`/admin/tickets/${t.id}`}
                        className="inline-flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors"
                      >
                        <span>Workspace</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-stone-500 pt-2">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} tickets total)
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                className="px-3 py-1.5 border border-stone-200 rounded-lg hover:bg-stone-100 disabled:opacity-40 transition-colors flex items-center space-x-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                className="px-3 py-1.5 border border-stone-200 rounded-lg hover:bg-stone-100 disabled:opacity-40 transition-colors flex items-center space-x-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default function AdminTicketsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-stone-500">Loading ticket queue...</div>}>
      <TicketQueueContent />
    </Suspense>
  );
}
