import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { AuthorLayout } from '@/components/AuthorLayout';
import { StatusBadge, PriorityBadge, formatINR } from '@/components/StatusBadge';
import {
  BookOpen,
  DollarSign,
  TrendingUp,
  Clock,
  LifeBuoy,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';


export default async function AuthorDashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const user = await db.user.findUnique({
    where: { id: session.id },
    include: {
      authorProfile: {
        include: {
          books: {
            orderBy: { copiesSold: 'desc' },
          },
        },
      },
      tickets: {
        where: { authorId: session.id },
        orderBy: { createdAt: 'desc' },
        take: 4,
        include: {
          book: { select: { title: true } },
          messages: {
            where: { isInternalNote: false },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  if (!user) {
    redirect('/login');
  }

  const books = user.authorProfile?.books || [];

  // Aggregated Royalty Metrics matching exact source values
  const summary = books.reduce(
    (acc, b) => ({
      totalBooks: acc.totalBooks + 1,
      publishedBooks: acc.publishedBooks + (b.status === 'PUBLISHED' ? 1 : 0),
      inProductionBooks: acc.inProductionBooks + (b.status === 'IN_PRODUCTION' ? 1 : 0),
      copiesSold: acc.copiesSold + b.copiesSold,
      totalEarned: acc.totalEarned + b.totalRoyaltyEarned,
      royaltyPaid: acc.royaltyPaid + b.royaltyPaid,
      royaltyPending: acc.royaltyPending + b.royaltyPending,
    }),
    {
      totalBooks: 0,
      publishedBooks: 0,
      inProductionBooks: 0,
      copiesSold: 0,
      totalEarned: 0,
      royaltyPaid: 0,
      royaltyPending: 0,
    }
  );

  return (
    <AuthorLayout user={user}>
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Welcome Banner */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-serif">
              Welcome back, {user.name}
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Author Portal • {user.authorProfile?.country || 'India'}
              {user.authorProfile?.penName ? ` (Pen: ${user.authorProfile.penName})` : ''}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/author/tickets/new"
              className="inline-flex items-center space-x-2 bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit Query</span>
            </Link>
          </div>
        </div>

        {/* Banking Linkage Status Alert */}
        {user.authorProfile && !user.authorProfile.bankAccountLinked && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3 text-amber-800">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Bank Account Not Linked</p>
              <p className="mt-0.5 text-xs text-amber-700">
                You currently have no bank account linked. Accumulated royalties will automatically roll over until your account details are verified.
              </p>
            </div>
          </div>
        )}

        {/* Financial & Book Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Royalty Earned */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Royalty Earned</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 font-serif">
              {formatINR(summary.totalEarned)}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              80% net profit share across all titles
            </p>
          </div>

          {/* Royalty Paid */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Disbursed (Paid)</span>
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 font-serif">
              {formatINR(summary.royaltyPaid)}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Transferred to verified bank account
            </p>
          </div>

          {/* Royalty Pending */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Pending Payout</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-900 font-serif">
              {formatINR(summary.royaltyPending)}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              {summary.royaltyPending < 1000 && summary.royaltyPending > 0
                ? 'Below ₹1,000 threshold (rolls over)'
                : 'Quarterly payout cycle (within 45 days)'}
            </p>
          </div>

          {/* Copies Sold */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Copies Sold</span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 font-serif">
              {summary.copiesSold.toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              {summary.publishedBooks} published • {summary.inProductionBooks} in production
            </p>
          </div>
        </div>

        {/* Two Column Layout: My Books & Recent Support Tickets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* My Books Overview (2 columns) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 font-serif flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-indigo-700" />
                <span>My Published & In-Production Titles</span>
              </h2>
              <Link
                href="/author/books"
                className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 flex items-center space-x-1"
              >
                <span>View All ({books.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {books.length === 0 ? (
              <div className="bg-white border border-stone-200 rounded-xl p-8 text-center text-stone-500">
                <p>No books registered under your author profile yet.</p>
              </div>
            ) : (
              <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs divide-y divide-stone-100">
                {books.slice(0, 4).map((book) => (
                  <div key={book.id} className="p-4 hover:bg-stone-50/70 transition-colors flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/author/books/${book.id}`}
                          className="font-semibold text-slate-900 hover:text-indigo-700 transition-colors text-sm"
                        >
                          {book.title}
                        </Link>
                        {book.status === 'IN_PRODUCTION' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                            In Production ({book.productionStage?.replace(/_/g, ' ') || 'Stage'})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            Live & Published
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 font-mono">
                        ISBN: {book.isbn} • {book.genre} • MRP: {formatINR(book.mrp)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900 font-serif">
                        {book.status === 'PUBLISHED' ? formatINR(book.totalRoyaltyEarned) : '₹0.00'}
                      </p>
                      <p className="text-xs text-stone-500">
                        {book.copiesSold} copies sold
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Support Activity (1 column) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 font-serif flex items-center space-x-2">
                <LifeBuoy className="w-5 h-5 text-indigo-700" />
                <span>Recent Queries</span>
              </h2>
              <Link
                href="/author/tickets"
                className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 flex items-center space-x-1"
              >
                <span>All Tickets</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {user.tickets.length === 0 ? (
              <div className="bg-white border border-stone-200 rounded-xl p-6 text-center text-stone-500 text-sm">
                <p>No support queries submitted yet.</p>
                <Link
                  href="/author/tickets/new"
                  className="mt-3 inline-block text-xs font-semibold text-indigo-700 hover:underline"
                >
                  Raise a ticket now
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {user.tickets.map((t) => (
                  <Link
                    key={t.id}
                    href={`/author/tickets/${t.id}`}
                    className="block bg-white border border-stone-200 rounded-xl p-4 hover:border-stone-300 shadow-xs transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-indigo-700">
                        {t.ticketNumber}
                      </span>
                      <StatusBadge status={t.status} />
                    </div>
                    <p className="font-medium text-slate-900 text-sm mt-1.5 line-clamp-1">
                      {t.subject}
                    </p>
                    <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                      <span>{t.category}</span>
                      <PriorityBadge priority={t.priority} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthorLayout>
  );
}
