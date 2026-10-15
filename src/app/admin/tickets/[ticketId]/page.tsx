'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/AdminLayout';
import { StatusBadge, PriorityBadge, CategoryBadge, formatINR } from '@/components/StatusBadge';
import {
  ArrowLeft,
  Sparkles,
  Send,
  Lock,
  UserCheck,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  User,
  Shield,
  Layers,
  DollarSign,
  AlertOctagon,
  FileText,
  Activity,
  Check,
} from 'lucide-react';
import { VALID_CATEGORIES, VALID_PRIORITIES } from '@/lib/ai/types';

interface Message {
  id: string;
  senderId: string;
  senderRole: 'AUTHOR' | 'ADMIN';
  message: string;
  isInternalNote: boolean;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface ActivityItem {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
  actor?: {
    id: string;
    name: string;
    role: string;
  } | null;
}

interface TicketWorkspace {
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
  aiRationale?: string | null;
  aiDraft?: string | null;
  aiDraftGeneratedAt?: string | null;
  attachmentUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    authorProfile?: {
      country: string;
      penName?: string | null;
      bankAccountLinked: boolean;
      bankName?: string | null;
      accountNumberMasked?: string | null;
      ifscCode?: string | null;
    } | null;
  };
  book?: {
    id: string;
    title: string;
    isbn: string;
    status: string;
    productionStage?: string | null;
    mrp: number;
    copiesSold: number;
    totalRoyaltyEarned: number;
    royaltyPaid: number;
    royaltyPending: number;
    platforms: string[];
  } | null;
  assignedAdmin?: {
    id: string;
    name: string;
    email: string;
  } | null;
  messages: Message[];
  activities: ActivityItem[];
}

export default function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const resolvedParams = use(params);
  const ticketId = resolvedParams.ticketId;

  const [ticket, setTicket] = useState<TicketWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);

  // Draft Editor State
  const [draftContent, setDraftContent] = useState('');
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [draftRationale, setDraftRationale] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replySuccessBanner, setReplySuccessBanner] = useState(false);

  // Internal Note State
  const [internalNote, setInternalNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Status & Override Form State
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [updatingMeta, setUpdatingMeta] = useState(false);

  const fetchTicket = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/tickets/${ticketId}`);
      if (res.ok) {
        const data = await res.json();
        const t: TicketWorkspace = data.ticket;
        setTicket(t);
        setSelectedStatus(t.status);
        setSelectedCategory(t.category);
        setSelectedPriority(t.priority);
        if (t.aiDraft && !draftContent) {
          setDraftContent(t.aiDraft);
        }
        if (t.aiRationale) {
          setDraftRationale(t.aiRationale);
        }
      }
    } catch (err) {
      console.error('Failed to load admin ticket:', err);
    } finally {
      setLoading(false);
    }
  }, [ticketId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) setAdminUser(d.user);
      });
    fetchTicket();
  }, [fetchTicket]);

  // Generate / Regenerate AI Draft
  const handleGenerateDraft = async () => {
    setGeneratingDraft(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/ai/draft`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setDraftContent(data.draft.draftText);
        setDraftRationale(data.draft.rationale);
      }
    } catch (err) {
      console.error('Failed to generate draft:', err);
    } finally {
      setGeneratingDraft(false);
    }
  };

  // Re-run AI Classification & Priority Scoring
  const handleReclassify = async () => {
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/ai/classify`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchTicket();
      }
    } catch (err) {
      console.error('Reclassification error:', err);
    }
  };

  // Save Meta Overrides (Category, Priority, Status)
  const handleSaveMeta = async () => {
    setUpdatingMeta(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: selectedStatus,
          category: selectedCategory,
          priority: selectedPriority,
        }),
      });

      if (res.ok) {
        await fetchTicket();
      }
    } catch (err) {
      console.error('Failed to update meta:', err);
    } finally {
      setUpdatingMeta(false);
    }
  };

  // Assign to logged-in admin
  const handleAssignToMe = async () => {
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: adminUser?.id }),
      });
      if (res.ok) {
        await fetchTicket();
      }
    } catch (err) {
      console.error('Assignment error:', err);
    }
  };

  // Send Public Reply to Author
  const handleSendPublicReply = async () => {
    if (!draftContent.trim() || sendingReply) return;

    setSendingReply(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: draftContent.trim(),
          updateStatus: selectedStatus === 'OPEN' ? 'IN_PROGRESS' : selectedStatus,
        }),
      });

      if (res.ok) {
        setReplySuccessBanner(true);
        setTimeout(() => setReplySuccessBanner(false), 5000);
        await fetchTicket();
      }
    } catch (err) {
      console.error('Failed to send public response:', err);
    } finally {
      setSendingReply(false);
    }
  };

  // Submit Private Internal Note
  const handleAddInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalNote.trim() || submittingNote) return;

    setSubmittingNote(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: internalNote.trim() }),
      });

      if (res.ok) {
        setInternalNote('');
        await fetchTicket();
      }
    } catch (err) {
      console.error('Failed to add internal note:', err);
    } finally {
      setSubmittingNote(false);
    }
  };

  return (
    <AdminLayout user={adminUser || { id: '', name: 'Ops Admin', email: '', role: 'ADMIN' }}>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Top Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-stone-500">
            <Link href="/admin/tickets" className="hover:text-stone-900 flex items-center space-x-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Ticket Queue</span>
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800 font-mono">
              {ticket ? ticket.ticketNumber : 'Loading...'}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {ticket && !ticket.assignedAdmin && (
              <button
                onClick={handleAssignToMe}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Assign to Me</span>
              </button>
            )}
            <button
              onClick={handleReclassify}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Re-run AI Analysis</span>
            </button>
          </div>
        </div>

        {replySuccessBanner && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-3 text-emerald-800 text-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Response sent successfully to author! The ticket conversation and author dashboard have updated.</span>
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center text-xs text-stone-500">
            Loading ticket workspace...
          </div>
        ) : !ticket ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center text-xs text-stone-500">
            Ticket not found.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Columns: Main Workspace */}
            <div className="lg:col-span-2 space-y-6">
              {/* Ticket Query Summary Card */}
              <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                      {ticket.ticketNumber}
                    </span>
                    <CategoryBadge category={ticket.category} />
                    <PriorityBadge priority={ticket.priority} />
                    <StatusBadge status={ticket.status} />
                  </div>
                  <span className="text-xs text-stone-400">
                    Logged: {new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div>
                  <h1 className="text-xl font-bold text-slate-900 font-serif">{ticket.subject}</h1>
                  <div className="mt-3 p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                    {ticket.description}
                  </div>
                </div>

                {ticket.attachmentUrl && (
                  <div className="text-xs text-indigo-700 flex items-center space-x-1.5 pt-1">
                    <FileText className="w-4 h-4" />
                    <a href={ticket.attachmentUrl} target="_blank" rel="noopener noreferrer" className="underline">
                      Author Attached Document / Media
                    </a>
                  </div>
                )}
              </div>

              {/* AI Assistant & Response Drafting Workspace */}
              <div className="bg-white border border-indigo-100 rounded-2xl p-6 shadow-xs space-y-4 ring-1 ring-indigo-50">
                <div className="flex items-center justify-between border-b border-indigo-50 pb-3">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-base font-bold text-slate-900 font-serif">
                      AI Response Assistant (Grounded in BookLeaf KB)
                    </h2>
                  </div>
                  <button
                    onClick={handleGenerateDraft}
                    disabled={generatingDraft}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs disabled:opacity-50 transition-colors"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${generatingDraft ? 'animate-spin' : ''}`} />
                    <span>{generatingDraft ? 'Generating Draft...' : 'Generate / Regenerate Draft'}</span>
                  </button>
                </div>

                {/* AI Rationale / Reasoning Banner */}
                {draftRationale && (
                  <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs text-indigo-900 space-y-1">
                    <span className="font-semibold block uppercase tracking-wider text-[10px] text-indigo-700">
                      AI Reasoning & Policy Match:
                    </span>
                    <p className="leading-relaxed">{draftRationale}</p>
                  </div>
                )}

                {/* Editable Response Editor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <label htmlFor="responseEditor" className="font-semibold text-slate-800">
                      Proposed Public Response <span className="font-normal text-stone-400">(Editable before sending)</span>
                    </label>
                    <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-sm border border-amber-200">
                      Draft Only • Never Auto-Sent
                    </span>
                  </div>

                  <textarea
                    id="responseEditor"
                    rows={8}
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    placeholder="Click 'Generate / Regenerate Draft' to create a proposed response using the official BookLeaf Knowledge Base, or compose your reply manually..."
                    className="w-full p-4 text-xs font-sans leading-relaxed bg-stone-50 border border-stone-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-[11px] text-stone-500 italic">
                    Review and personalize dates/breakdowns before sending to the author.
                  </p>
                  <button
                    onClick={handleSendPublicReply}
                    disabled={sendingReply || !draftContent.trim()}
                    className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingReply ? 'Sending Response...' : 'Send Response to Author'}</span>
                  </button>
                </div>
              </div>

              {/* Conversation History Stream (Public vs Private separated!) */}
              <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-6">
                <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider pb-2 border-b border-stone-100">
                  Full Ticket Thread (Public & Private Notes)
                </h2>

                <div className="space-y-4">
                  {ticket.messages.map((m) => {
                    const isNote = m.isInternalNote;
                    const isAdmin = m.senderRole === 'ADMIN';
                    const dateStr = new Date(m.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    if (isNote) {
                      return (
                        <div key={m.id} className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-amber-900 font-semibold">
                            <span className="flex items-center space-x-1.5">
                              <Lock className="w-3.5 h-3.5 text-amber-700" />
                              <span>Private Internal Note (Ops Only • Not Visible to Author)</span>
                            </span>
                            <span className="text-amber-700 font-normal">{dateStr}</span>
                          </div>
                          <p className="text-xs text-amber-950 whitespace-pre-wrap leading-relaxed">{m.message}</p>
                          <span className="text-[10px] text-amber-700 block pt-1">
                            Added by {m.sender?.name || 'Admin'}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={m.id}
                        className={`p-4 rounded-xl border text-xs leading-relaxed whitespace-pre-wrap ${
                          isAdmin
                            ? 'bg-indigo-50/70 border-indigo-100 text-slate-900'
                            : 'bg-stone-50 border-stone-200 text-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1">
                          <span className="font-semibold text-slate-800">
                            {isAdmin ? `BookLeaf Ops (${m.sender?.name || 'Admin'})` : `${ticket.author.name} (Author Query)`}
                          </span>
                          <span>{dateStr}</span>
                        </div>
                        <p>{m.message}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Add Internal Note Composer */}
                <form onSubmit={handleAddInternalNote} className="pt-4 border-t border-stone-100 space-y-3">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-stone-700">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Add Private Internal Note</span>
                    <span className="text-stone-400 font-normal text-[11px]">(Visible to operations team only)</span>
                  </div>

                  <textarea
                    rows={2}
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    placeholder="Log internal investigation steps, printer communications, or supervisor notes..."
                    className="w-full p-3 text-xs bg-stone-50 border border-stone-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingNote || !internalNote.trim()}
                      className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors"
                    >
                      {submittingNote ? 'Saving Note...' : 'Save Internal Note'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Column: Controls, Overrides, Author & Book Fact Sheet */}
            <div className="space-y-6">
              {/* Ticket Controls & Overrides Card */}
              <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
                <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider pb-2 border-b border-stone-100">
                  Ticket Controls & Overrides
                </h2>

                {/* Status Selector */}
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">Current Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="OPEN">Open (Awaiting Response)</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>

                {/* Category Override */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-stone-600">Category</label>
                    {ticket.categoryOverridden && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-sm border border-amber-200">
                        Overridden
                      </span>
                    )}
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600"
                  >
                    {VALID_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {ticket.aiCategory && (
                    <span className="text-[10px] text-stone-400 mt-1 block">
                      AI Suggested: {ticket.aiCategory} ({Math.round((ticket.aiConfidence || 0) * 100)}% conf)
                    </span>
                  )}
                </div>

                {/* Priority Override */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-stone-600">Priority</label>
                    {ticket.priorityOverridden && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-sm border border-amber-200">
                        Overridden
                      </span>
                    )}
                  </div>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600"
                  >
                    {VALID_PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  {ticket.aiPriority && (
                    <span className="text-[10px] text-stone-400 mt-1 block">
                      AI Suggested: {ticket.aiPriority}
                    </span>
                  )}
                </div>

                <button
                  onClick={handleSaveMeta}
                  disabled={updatingMeta}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                >
                  {updatingMeta ? 'Updating Ticket...' : 'Save Status & Overrides'}
                </button>
              </div>

              {/* Author Facts Card */}
              <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-3 text-xs">
                <div className="flex items-center space-x-2 pb-2 border-b border-stone-100">
                  <User className="w-4 h-4 text-indigo-700" />
                  <h3 className="font-semibold text-slate-900">Author Fact Sheet</h3>
                </div>

                <div className="space-y-1.5">
                  <p>
                    <span className="text-stone-500">Name:</span>{' '}
                    <strong className="text-slate-900">{ticket.author.name}</strong>
                  </p>
                  <p>
                    <span className="text-stone-500">Email:</span>{' '}
                    <span className="font-mono text-slate-800">{ticket.author.email}</span>
                  </p>
                  <p>
                    <span className="text-stone-500">Country:</span>{' '}
                    {ticket.author.authorProfile?.country || 'India'}
                  </p>
                  <p>
                    <span className="text-stone-500">Pen Name:</span>{' '}
                    {ticket.author.authorProfile?.penName || 'None'}
                  </p>
                  <p>
                    <span className="text-stone-500">Bank Status:</span>{' '}
                    {ticket.author.authorProfile?.bankAccountLinked ? (
                      <span className="text-emerald-700 font-semibold">
                        Linked ({ticket.author.authorProfile.bankName || 'Verified'})
                      </span>
                    ) : (
                      <span className="text-rose-600 font-semibold">Not Linked</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Related Book Facts Card */}
              {ticket.book ? (
                <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-3 text-xs">
                  <div className="flex items-center space-x-2 pb-2 border-b border-stone-100">
                    <BookOpen className="w-4 h-4 text-indigo-700" />
                    <h3 className="font-semibold text-slate-900">Catalog Book Facts</h3>
                  </div>

                  <div className="space-y-1.5">
                    <p>
                      <span className="text-stone-500">Title:</span>{' '}
                      <strong className="text-slate-900">{ticket.book.title}</strong>
                    </p>
                    <p>
                      <span className="text-stone-500">ISBN:</span>{' '}
                      <span className="font-mono text-slate-800">{ticket.book.isbn}</span>
                    </p>
                    <p>
                      <span className="text-stone-500">Status:</span>{' '}
                      <span className="font-semibold">{ticket.book.status}</span>
                      {ticket.book.productionStage && (
                        <span className="text-stone-500 block capitalize">
                          Stage: {ticket.book.productionStage.replace(/_/g, ' ').toLowerCase()}
                        </span>
                      )}
                    </p>
                    <p>
                      <span className="text-stone-500">Copies Sold:</span>{' '}
                      <strong>{ticket.book.copiesSold}</strong>
                    </p>
                    <p>
                      <span className="text-stone-500">Earned:</span>{' '}
                      <strong>{formatINR(ticket.book.totalRoyaltyEarned)}</strong>
                    </p>
                    <p>
                      <span className="text-stone-500">Pending Royalty:</span>{' '}
                      <strong className="text-amber-800">{formatINR(ticket.book.royaltyPending)}</strong>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-500 italic">
                  Non-book specific / General account inquiry.
                </div>
              )}

              {/* Activity Audit Trail */}
              <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-3 text-xs">
                <div className="flex items-center space-x-2 pb-2 border-b border-stone-100">
                  <Activity className="w-4 h-4 text-stone-500" />
                  <h3 className="font-semibold text-slate-900">Audit History</h3>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto">
                  {ticket.activities.map((act) => (
                    <div key={act.id} className="text-[11px] space-y-0.5 border-b border-stone-50 pb-2">
                      <div className="flex justify-between text-stone-400">
                        <span className="font-semibold text-slate-800">{act.action.replace(/_/g, ' ')}</span>
                        <span>{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <span className="text-stone-500 block">
                        Actor: {act.actor ? act.actor.name : 'System AI'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
