'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AuthorLayout } from '@/components/AuthorLayout';
import { StatusBadge, PriorityBadge, CategoryBadge } from '@/components/StatusBadge';
import { LifeBuoy, PlusCircle, Search, MessageSquare, Loader2, ArrowRight } from 'lucide-react';

interface TicketItem {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: string;
  category: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  book?: {
    id: string;
    title: string;
    isbn: string;
  } | null;
  messages: {
    id: string;
    senderRole: string;
    createdAt: string;
    message: string;
  }[];
  _count: {
    messages: number;
  };
}

export default function AuthorTicketsPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [userProfile, setUserProfile] = useState<{ id: string; name: string; email: string; role: string } | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/author/tickets');
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) setUserProfile(d.user);
      });
    fetchTickets();
  }, [fetchTickets]);

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        t.subject.toLowerCase().includes(q) ||
        t.ticketNumber.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.book?.title && t.book.title.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <AuthorLayout user={userProfile || { id: '', name: 'Author', email: '', role: 'AUTHOR' }}>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-serif">Support Tickets</h1>
            <p className="text-sm text-stone-600 mt-1">
              Track responses, royalties inquiries, print quality escalations, and production queries.
            </p>
          </div>
          <Link
            href="/author/tickets/new"
            className="inline-flex items-center space-x-2 bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit New Query</span>
          </Link>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by ticket #, subject, or book..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:bg-white text-slate-900"
            />
          </div>

          <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
            {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-stone-600 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'All Tickets' : st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Tickets List */}
        {loading ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-700" />
            <p className="text-sm text-stone-500">Loading support inquiries...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center space-y-3">
            <LifeBuoy className="w-10 h-10 text-stone-400 mx-auto" />
            <h3 className="text-base font-semibold text-slate-900">No support tickets found</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              {search || statusFilter !== 'ALL'
                ? 'No tickets match the selected filter.'
                : 'Need assistance with your books or royalties? Submit a query anytime.'}
            </p>
            <Link
              href="/author/tickets/new"
              className="inline-flex items-center space-x-2 text-xs font-semibold text-indigo-700 hover:underline pt-2"
            >
              <span>Create your first ticket</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((t) => {
              const latestMsg = t.messages[0];
              const dateStr = new Date(t.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });

              return (
                <Link
                  key={t.id}
                  href={`/author/tickets/${t.id}`}
                  className="block bg-white border border-stone-200 rounded-2xl p-5 hover:border-stone-300 shadow-xs transition-all hover:shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                        {t.ticketNumber}
                      </span>
                      <CategoryBadge category={t.category} />
                    </div>
                    <div className="flex items-center space-x-2">
                      <PriorityBadge priority={t.priority} />
                      <StatusBadge status={t.status} />
                    </div>
                  </div>

                  <h3 className="font-semibold text-slate-900 text-sm mt-3 hover:text-indigo-700 transition-colors">
                    {t.subject}
                  </h3>

                  <p className="text-xs text-stone-600 mt-1 line-clamp-2 leading-relaxed">
                    {t.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500">
                    <div className="flex items-center space-x-4">
                      <span>
                        Book:{' '}
                        <strong className="text-slate-800">
                          {t.book ? t.book.title : 'General / Account Level'}
                        </strong>
                      </span>
                      <span>Created: {dateStr}</span>
                    </div>

                    <div className="flex items-center space-x-3 text-stone-600">
                      <span className="flex items-center space-x-1">
                        <MessageSquare className="w-3.5 h-3.5 text-stone-400" />
                        <span>{t._count.messages} messages</span>
                      </span>
                      {latestMsg && latestMsg.senderRole === 'ADMIN' && (
                        <span className="text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded-sm">
                          Admin Replied
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AuthorLayout>
  );
}
