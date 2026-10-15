import React from 'react';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { AdminLayout } from '@/components/AdminLayout';
import { StatusBadge, PriorityBadge, CategoryBadge, formatINR } from '@/components/StatusBadge';
import {
  ArrowLeft,
  User,
  BookOpen,
  DollarSign,
  Building2,
  CheckCircle2,
  AlertCircle,
  Inbox,
  Globe,
} from 'lucide-react';


export default async function AdminAuthorDetailPage({
  params,
}: {
  params: Promise<{ authorId: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') redirect('/login');

  const { authorId } = await params;

  const author = await db.user.findFirst({
    where: { id: authorId, role: 'AUTHOR' },
    include: {
      authorProfile: {
        include: {
          books: {
            orderBy: { copiesSold: 'desc' },
          },
        },
      },
      tickets: {
        orderBy: { createdAt: 'desc' },
        include: {
          book: { select: { title: true } },
        },
      },
    },
  });

  if (!author) notFound();

  const profile = author.authorProfile;
  const books = profile?.books || [];

  const summary = books.reduce(
    (acc, b) => ({
      copiesSold: acc.copiesSold + b.copiesSold,
      earned: acc.earned + b.totalRoyaltyEarned,
      paid: acc.paid + b.royaltyPaid,
      pending: acc.pending + b.royaltyPending,
    }),
    { copiesSold: 0, earned: 0, paid: 0, pending: 0 }
  );

  return (
    <AdminLayout user={session}>
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-xs text-stone-500">
          <Link href="/admin/authors" className="hover:text-stone-900 flex items-center space-x-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Authors Directory</span>
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-800">{author.name}</span>
        </div>

        {/* Hero Card */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-serif">
                {author.name}
              </h1>
              {profile?.penName && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700">
                  Pen: {profile.penName}
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 font-mono">
              Email: {author.email} • Country: {profile?.country || 'India'} • Phone: {author.phone || 'N/A'}
            </p>
            {profile?.bio && (
              <p className="text-xs text-stone-600 pt-1 leading-relaxed max-w-2xl italic">
                &ldquo;{profile.bio}&rdquo;
              </p>
            )}
          </div>

          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs space-y-1.5 shrink-0 min-w-56">
            <span className="font-semibold text-slate-800 block text-[11px] uppercase tracking-wider text-stone-500">
              Bank Account Status
            </span>
            {profile?.bankAccountLinked ? (
              <>
                <p className="text-emerald-700 font-semibold flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  {profile.bankName || 'Verified Bank'}
                </p>
                <p className="text-stone-500 font-mono">{profile.accountNumberMasked}</p>
                <p className="text-stone-500 font-mono">IFSC: {profile.ifscCode}</p>
              </>
            ) : (
              <p className="text-rose-600 font-semibold flex items-center">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                No Bank Account Linked
              </p>
            )}
          </div>
        </div>

        {/* Aggregated Financial Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">Titles in Catalog</span>
            <p className="mt-1 text-2xl font-bold text-slate-900 font-serif">{books.length}</p>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">Copies Sold</span>
            <p className="mt-1 text-2xl font-bold text-slate-900 font-serif">{summary.copiesSold}</p>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">Total Royalty Earned</span>
            <p className="mt-1 text-2xl font-bold text-slate-900 font-serif">{formatINR(summary.earned)}</p>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">Pending Royalty</span>
            <p className="mt-1 text-2xl font-bold text-amber-900 font-serif">{formatINR(summary.pending)}</p>
          </div>
        </div>

        {/* Books Ledger */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 font-serif flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-indigo-700" />
            <span>Author Title Catalog & Performance</span>
          </h2>

          <div className="divide-y divide-stone-100 text-xs">
            {books.map((b) => {
              const platforms: string[] = b.platforms ? JSON.parse(b.platforms) : [];
              return (
                <div key={b.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="font-semibold text-slate-900 text-sm">{b.title}</span>
                    <p className="text-stone-500 font-mono text-[11px]">
                      ISBN: {b.isbn} • {b.genre} • MRP: {formatINR(b.mrp)}
                    </p>
                    {platforms.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {platforms.map((p) => (
                          <span key={p} className="px-2 py-0.2 rounded-xs bg-stone-100 text-stone-600 text-[10px]">
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="text-right text-xs">
                    <p className="font-bold text-slate-900 font-serif">{formatINR(b.totalRoyaltyEarned)}</p>
                    <p className="text-stone-500">{b.copiesSold} sold • Pending: {formatINR(b.royaltyPending)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Support History */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 font-serif flex items-center space-x-2">
            <Inbox className="w-4 h-4 text-indigo-700" />
            <span>Support Ticket History ({author.tickets.length})</span>
          </h2>

          {author.tickets.length === 0 ? (
            <p className="text-xs text-stone-500 py-2">No tickets submitted by this author.</p>
          ) : (
            <div className="divide-y divide-stone-100 text-xs">
              {author.tickets.map((t) => (
                <div key={t.id} className="py-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Link href={`/admin/tickets/${t.id}`} className="font-semibold text-slate-900 hover:text-indigo-700">
                      {t.subject}
                    </Link>
                    <p className="text-stone-400 font-mono text-[11px]">{t.ticketNumber} • {t.category}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <StatusBadge status={t.status} />
                    <PriorityBadge priority={t.priority} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
