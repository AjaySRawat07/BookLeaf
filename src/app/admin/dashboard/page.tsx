import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { AdminLayout } from '@/components/AdminLayout';
import { StatusBadge, PriorityBadge, CategoryBadge, formatINR } from '@/components/StatusBadge';
import {
  Inbox,
  AlertOctagon,
  Clock,
  CheckCircle2,
  Users,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Sparkles,
  ShieldAlert,
  Activity,
} from 'lucide-react';


export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    redirect('/login');
  }

  // Calculate live metrics from database
  const [
    totalTickets,
    openTickets,
    inProgressTickets,
    resolvedTickets,
    urgentUnresolved,
    totalAuthors,
    totalBooks,
    ticketsByCategory,
    ticketsByPriority,
    recentTickets,
    recentActivities,
  ] = await Promise.all([
    db.ticket.count(),
    db.ticket.count({ where: { status: 'OPEN' } }),
    db.ticket.count({ where: { status: 'IN_PROGRESS' } }),
    db.ticket.count({ where: { status: { in: ['RESOLVED', 'CLOSED'] } } }),
    db.ticket.count({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        priority: { in: ['Critical', 'High'] },
      },
    }),
    db.user.count({ where: { role: 'AUTHOR' } }),
    db.book.count(),
    db.ticket.groupBy({
      by: ['category'],
      _count: { id: true },
    }),
    db.ticket.groupBy({
      by: ['priority'],
      _count: { id: true },
    }),
    db.ticket.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { name: true, email: true } },
        book: { select: { title: true } },
        assignedAdmin: { select: { name: true } },
      },
    }),
    db.ticketActivity.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        ticket: { select: { ticketNumber: true, subject: true } },
        actor: { select: { name: true, role: true } },
      },
    }),
  ]);

  return (
    <AdminLayout user={session}>
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Ops Header */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                Operations Command
              </span>
              <span className="text-xs text-stone-500 font-mono">BookLeaf Publishing SLA</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 font-serif mt-1">
              Author Operations & Ticket Center
            </h1>
            <p className="text-xs text-stone-600 mt-0.5">
              Managing {totalAuthors} authors and {totalBooks} catalog titles across India and the US.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/admin/tickets?priority=Critical"
              className="inline-flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-xs"
            >
              <AlertOctagon className="w-4 h-4" />
              <span>Urgent Queue ({urgentUnresolved})</span>
            </Link>
            <Link
              href="/admin/tickets"
              className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-xs"
            >
              <Inbox className="w-4 h-4" />
              <span>Full Inbox</span>
            </Link>
          </div>
        </div>

        {/* Operational Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Tickets */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">Total Volume</span>
            <p className="mt-1.5 text-2xl font-bold text-slate-900 font-serif">{totalTickets}</p>
            <span className="text-[11px] text-stone-400 mt-1 block">All recorded queries</span>
          </div>

          {/* Open / Awaiting Response */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">Awaiting First Reply</span>
            <p className="mt-1.5 text-2xl font-bold text-amber-900 font-serif">{openTickets}</p>
            <span className="text-[11px] text-amber-600 mt-1 block">Open status tickets</span>
          </div>

          {/* In Progress */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">In Progress</span>
            <p className="mt-1.5 text-2xl font-bold text-blue-900 font-serif">{inProgressTickets}</p>
            <span className="text-[11px] text-blue-600 mt-1 block">Actively handled by team</span>
          </div>

          {/* Urgent / Overdue */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">Critical / High</span>
            <p className="mt-1.5 text-2xl font-bold text-rose-900 font-serif">{urgentUnresolved}</p>
            <span className="text-[11px] text-rose-600 mt-1 block">Unresolved high impact</span>
          </div>

          {/* Resolved */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">Resolved / Closed</span>
            <p className="mt-1.5 text-2xl font-bold text-emerald-900 font-serif">{resolvedTickets}</p>
            <span className="text-[11px] text-emerald-600 mt-1 block">Successfully completed</span>
          </div>
        </div>

        {/* Breakdown Distributions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Distribution */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-stone-600">
              Distribution by Support Category
            </h2>
            <div className="space-y-3 pt-2">
              {ticketsByCategory.map((item) => {
                const pct = totalTickets > 0 ? Math.round((item._count.id / totalTickets) * 100) : 0;
                return (
                  <div key={item.category} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-800">{item.category}</span>
                      <span className="text-stone-500 font-mono">
                        {item._count.id} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Priority Distribution */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-stone-600">
              Distribution by Priority Level
            </h2>
            <div className="grid grid-cols-2 gap-4 pt-2">
              {['Critical', 'High', 'Medium', 'Low'].map((pr) => {
                const match = ticketsByPriority.find((p) => p.priority.toLowerCase() === pr.toLowerCase());
                const count = match ? match._count.id : 0;
                const pct = totalTickets > 0 ? Math.round((count / totalTickets) * 100) : 0;

                const borderClass =
                  pr === 'Critical'
                    ? 'border-rose-200 bg-rose-50/50'
                    : pr === 'High'
                    ? 'border-orange-200 bg-orange-50/50'
                    : pr === 'Medium'
                    ? 'border-amber-200 bg-amber-50/50'
                    : 'border-slate-200 bg-slate-50/50';

                return (
                  <div key={pr} className={`p-4 rounded-xl border ${borderClass}`}>
                    <div className="flex items-center justify-between">
                      <PriorityBadge priority={pr} />
                      <span className="text-xs font-mono text-stone-500">{pct}%</span>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-slate-900 font-serif">{count}</p>
                    <span className="text-[11px] text-stone-500 mt-0.5 block">tickets</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Section: Recent Tickets & Operations Audit Log */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Tickets Table (2 columns) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 font-serif flex items-center space-x-2">
                <Inbox className="w-5 h-5 text-indigo-700" />
                <span>Recent Incoming Tickets</span>
              </h2>
              <Link
                href="/admin/tickets"
                className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 flex items-center space-x-1"
              >
                <span>View Full Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs divide-y divide-stone-100">
              {recentTickets.map((t) => (
                <div key={t.id} className="p-4 hover:bg-stone-50 transition-colors flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-sm">
                        {t.ticketNumber}
                      </span>
                      <Link
                        href={`/admin/tickets/${t.id}`}
                        className="font-semibold text-slate-900 hover:text-indigo-700 text-sm line-clamp-1"
                      >
                        {t.subject}
                      </Link>
                    </div>
                    <p className="text-xs text-stone-500">
                      Author: <span className="text-slate-800 font-medium">{t.author.name}</span> • Category: {t.category}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Audit Stream (1 column) */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-indigo-700" />
              <h2 className="text-lg font-bold text-slate-900 font-serif">Audit Activity Log</h2>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs space-y-3 divide-y divide-stone-100 text-xs">
              {recentActivities.map((act) => {
                const dateStr = new Date(act.createdAt).toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div key={act.id} className="pt-3 first:pt-0 space-y-1">
                    <div className="flex items-center justify-between text-stone-500 text-[11px]">
                      <span className="font-mono text-indigo-700 font-semibold">{act.ticket.ticketNumber}</span>
                      <span>{dateStr}</span>
                    </div>
                    <p className="font-medium text-slate-800">
                      <span className="text-stone-500">{act.action.replace(/_/g, ' ')}:</span>{' '}
                      {act.actor ? act.actor.name : 'System AI'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
