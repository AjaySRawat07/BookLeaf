import React from 'react';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { AuthorLayout } from '@/components/AuthorLayout';
import { StatusBadge, PriorityBadge, formatINR } from '@/components/StatusBadge';
import {
  BookOpen,
  ArrowLeft,
  DollarSign,
  CheckCircle2,
  Clock,
  Layers,
  Globe,
  PlusCircle,
  HelpCircle,
} from 'lucide-react';


const PRODUCTION_STAGES = [
  'MANUSCRIPT_RECEIVED',
  'EDITING',
  'COVER_DESIGN',
  'TYPESETTING',
  'PROOFREADING',
  'ISBN_ASSIGNMENT',
  'PRINTING',
  'DISTRIBUTION_SETUP',
  'PUBLISHED_AND_LIVE',
];

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { bookId } = await params;

  const book = await db.book.findUnique({
    where: { id: bookId },
    include: {
      author: {
        include: { user: true },
      },
      tickets: {
        where: { authorId: session.id },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!book) notFound();

  // IDOR Protection: Must belong to current author (unless admin)
  if (session.role !== 'ADMIN' && book.author.userId !== session.id) {
    redirect('/author/books');
  }

  const platforms: string[] = book.platforms ? JSON.parse(book.platforms) : [];
  const currentStageIndex = book.productionStage
    ? PRODUCTION_STAGES.indexOf(book.productionStage)
    : book.status === 'PUBLISHED'
    ? PRODUCTION_STAGES.length - 1
    : 0;

  return (
    <AuthorLayout user={book.author.user}>
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Breadcrumb / Back Link */}
        <div className="flex items-center space-x-2 text-xs text-stone-500">
          <Link href="/author/books" className="hover:text-stone-900 flex items-center space-x-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>My Books</span>
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-800 truncate">{book.title}</span>
        </div>

        {/* Hero Card */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-serif">
                {book.title}
              </h1>
              {book.status === 'PUBLISHED' ? (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  Live & Published
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                  In Production
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-stone-500">
              ISBN: <span className="font-bold text-slate-800">{book.isbn}</span> • Genre: {book.genre} • Imprint: BookLeaf Publishing
            </p>
            {book.synopsis && (
              <p className="text-sm text-stone-600 pt-2 leading-relaxed italic">
                &ldquo;{book.synopsis}&rdquo;
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto">
            <Link
              href={`/author/tickets/new?bookId=${book.id}`}
              className="inline-flex items-center justify-center space-x-2 bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Raise Query for This Book</span>
            </Link>
          </div>
        </div>

        {/* Production Stage Milestone Tracker */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 font-serif flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-700" />
            <span>Production Workflow Status</span>
          </h2>

          <div className="overflow-x-auto pb-2">
            <div className="flex items-center min-w-[750px] justify-between relative">
              {PRODUCTION_STAGES.map((st, idx) => {
                const isPassed = idx <= currentStageIndex;
                const isCurrent = idx === currentStageIndex && book.status !== 'PUBLISHED';
                const label = st.replace(/_/g, ' ').toLowerCase();

                return (
                  <div key={st} className="flex flex-col items-center flex-1 relative text-center">
                    {/* Connecting line */}
                    {idx > 0 && (
                      <div
                        className={`absolute top-3.5 -left-1/2 right-1/2 h-0.5 -z-0 ${
                          idx <= currentStageIndex ? 'bg-indigo-600' : 'bg-stone-200'
                        }`}
                      />
                    )}

                    {/* Dot */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold z-10 ${
                        isPassed
                          ? 'bg-indigo-700 text-white'
                          : 'bg-stone-100 text-stone-400 border border-stone-300'
                      } ${isCurrent ? 'ring-4 ring-indigo-100' : ''}`}
                    >
                      {idx + 1}
                    </div>

                    <span
                      className={`text-[11px] mt-2 capitalize font-medium ${
                        isCurrent
                          ? 'text-indigo-900 font-bold'
                          : isPassed
                          ? 'text-slate-800'
                          : 'text-stone-400'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Financial Economics & Distribution Channels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Royalty Calculation Card */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 font-serif flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Royalty Breakdown & Net Profit Economics</span>
            </h2>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                <span className="text-[11px] text-stone-500 block">Retail MRP</span>
                <span className="text-lg font-bold text-slate-900 font-serif">{formatINR(book.mrp)}</span>
              </div>
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                <span className="text-[11px] text-stone-500 block">Total Sold</span>
                <span className="text-lg font-bold text-slate-900 font-serif">{book.copiesSold} copies</span>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                <span className="text-[11px] text-emerald-700 block">Total Earned</span>
                <span className="text-lg font-bold text-emerald-900 font-serif">{formatINR(book.totalRoyaltyEarned)}</span>
              </div>
            </div>

            <div className="text-xs text-stone-600 space-y-1.5 pt-2 border-t border-stone-100">
              <p className="font-semibold text-slate-800">BookLeaf 80/20 Royalty Policy:</p>
              <p>• Net Profit = MRP minus Printing Cost, Platform Commission, and Shipping Charges.</p>
              <p>• Author Share: <strong>80% of net profit</strong> per copy.</p>
              <p>• Paid to date: <strong>{formatINR(book.royaltyPaid)}</strong> • Pending: <strong>{formatINR(book.royaltyPending)}</strong></p>
            </div>
          </div>

          {/* Distribution Channels Card */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 font-serif flex items-center space-x-2">
              <Globe className="w-4 h-4 text-indigo-700" />
              <span>Distribution Channels</span>
            </h2>

            {platforms.length === 0 ? (
              <p className="text-xs text-stone-500 py-4">
                Retail listing setup begins automatically once proofing and printing milestones complete.
              </p>
            ) : (
              <div className="space-y-2 pt-2">
                {platforms.map((p) => (
                  <div
                    key={p}
                    className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-stone-50 text-xs"
                  >
                    <span className="font-semibold text-slate-800">{p}</span>
                    <span className="inline-flex items-center text-emerald-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      Active Live Listing
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Related Support Tickets */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 font-serif flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-indigo-700" />
              <span>Support Inquiries for this Book</span>
            </h2>
            <Link
              href={`/author/tickets/new?bookId=${book.id}`}
              className="text-xs font-semibold text-indigo-700 hover:underline"
            >
              + Raise New Query
            </Link>
          </div>

          {book.tickets.length === 0 ? (
            <p className="text-xs text-stone-500 py-2">No queries logged specifically for this title.</p>
          ) : (
            <div className="divide-y divide-stone-100 text-xs">
              {book.tickets.map((t) => (
                <div key={t.id} className="py-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Link
                      href={`/author/tickets/${t.id}`}
                      className="font-semibold text-slate-900 hover:text-indigo-700"
                    >
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
    </AuthorLayout>
  );
}
