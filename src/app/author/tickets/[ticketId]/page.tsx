'use client';

import React, { useState, useEffect, useRef, useCallback, use } from 'react';
import Link from 'next/link';
import { AuthorLayout } from '@/components/AuthorLayout';
import { StatusBadge, PriorityBadge, CategoryBadge } from '@/components/StatusBadge';
import {
  ArrowLeft,
  Send,
  Loader2,
  Paperclip,
  CheckCircle2,
  User,
  Shield,
  Clock,
  Radio,
  BookOpen,
} from 'lucide-react';

interface Sender {
  id: string;
  name: string;
  role: string;
}

interface Message {
  id: string;
  senderId: string;
  senderRole: 'AUTHOR' | 'ADMIN';
  message: string;
  createdAt: string;
  sender?: Sender;
}

interface TicketDetail {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: string;
  category: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  attachmentUrl?: string | null;
  book?: {
    id: string;
    title: string;
    isbn: string;
    status: string;
  } | null;
  messages: Message[];
}

export default function AuthorTicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const resolvedParams = use(params);
  const ticketId = resolvedParams.ticketId;

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const [userProfile, setUserProfile] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTicket = useCallback(async () => {
    try {
      const res = await fetch(`/api/author/tickets/${ticketId}`);
      if (res.ok) {
        const data = await res.json();
        setTicket(data.ticket);
      }
    } catch (err) {
      console.error('Failed to load ticket:', err);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) setUserProfile(d.user);
      });
    fetchTicket();
  }, [fetchTicket]);

  // Connect to SSE stream for real-time live updates
  useEffect(() => {
    if (!ticketId) return;

    const eventSource = new EventSource(`/api/author/tickets/${ticketId}/events`);

    eventSource.addEventListener('connected', () => {
      setSseConnected(true);
    });

    eventSource.addEventListener('update', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'message') {
          setTicket((prev) => {
            if (!prev) return prev;
            // Prevent duplicate message insertions
            if (prev.messages.some((m) => m.id === payload.data.id)) return prev;
            return {
              ...prev,
              messages: [...prev.messages, payload.data],
              updatedAt: new Date().toISOString(),
            };
          });
        } else if (payload.type === 'status_change') {
          setTicket((prev) => (prev ? { ...prev, status: payload.data.status } : prev));
        } else if (payload.type === 'priority_change') {
          setTicket((prev) => (prev ? { ...prev, priority: payload.data.priority } : prev));
        }
      } catch (err) {
        console.error('Error handling SSE update:', err);
      }
    });

    eventSource.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [ticketId]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || submittingReply) return;

    setSubmittingReply(true);
    try {
      const res = await fetch(`/api/author/tickets/${ticketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setReplyText('');
        // Append locally if not already received via SSE
        setTicket((prev) => {
          if (!prev) return prev;
          if (prev.messages.some((m) => m.id === data.message.id)) return prev;
          return {
            ...prev,
            messages: [...prev.messages, data.message],
            status: prev.status === 'RESOLVED' ? 'IN_PROGRESS' : prev.status,
          };
        });
      }
    } catch (err) {
      console.error('Failed to post reply:', err);
    } finally {
      setSubmittingReply(false);
    }
  };

  return (
    <AuthorLayout user={userProfile || { id: '', name: 'Author', email: '', role: 'AUTHOR' }}>
      <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto w-full">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-stone-500">
            <Link href="/author/tickets" className="hover:text-stone-900 flex items-center space-x-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Support Tickets</span>
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800 font-mono">
              {ticket ? ticket.ticketNumber : 'Loading...'}
            </span>
          </div>

          {/* Real-time SSE indicator */}
          <div className="flex items-center space-x-1.5 text-[11px] font-medium text-stone-500">
            <span className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'}`} />
            <span>{sseConnected ? 'Live Connection Active' : 'Connecting Real-time...'}</span>
          </div>
        </div>

        {loading ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-700" />
            <p className="text-sm text-stone-500">Loading conversation...</p>
          </div>
        ) : !ticket ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center text-stone-500">
            <p>Ticket not found or access denied.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Ticket Header Card */}
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                    {ticket.ticketNumber}
                  </span>
                  <CategoryBadge category={ticket.category} />
                </div>
                <div className="flex items-center space-x-2">
                  <PriorityBadge priority={ticket.priority} />
                  <StatusBadge status={ticket.status} />
                </div>
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">
                  {ticket.subject}
                </h1>
                <p className="text-xs text-stone-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    Book:{' '}
                    <strong className="text-slate-800">
                      {ticket.book ? ticket.book.title : 'General Account / Non-Book Query'}
                    </strong>
                  </span>
                  <span>
                    Logged on:{' '}
                    {new Date(ticket.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </p>
              </div>

              {ticket.attachmentUrl && (
                <div className="pt-2 border-t border-stone-100 flex items-center space-x-2 text-xs text-indigo-700">
                  <Paperclip className="w-3.5 h-3.5" />
                  <a
                    href={ticket.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-indigo-900"
                  >
                    View Attached Document / Photo
                  </a>
                </div>
              )}
            </div>

            {/* Conversation Stream */}
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-6">
              <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider pb-2 border-b border-stone-100">
                Conversation History
              </h2>

              <div className="space-y-4">
                {ticket.messages.map((msg) => {
                  const isAdmin = msg.senderRole === 'ADMIN';
                  const dateStr = new Date(msg.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center space-x-2 text-[11px] text-stone-500 mb-1 px-1">
                        {isAdmin ? (
                          <>
                            <Shield className="w-3.5 h-3.5 text-indigo-700" />
                            <span className="font-semibold text-slate-900">
                              BookLeaf Operations Team
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="font-semibold text-slate-900">You (Author)</span>
                            <User className="w-3.5 h-3.5 text-stone-500" />
                          </>
                        )}
                        <span>• {dateStr}</span>
                      </div>

                      <div
                        className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap ${
                          isAdmin
                            ? 'bg-indigo-50/70 border border-indigo-100 text-slate-900 rounded-tl-xs'
                            : 'bg-slate-900 text-white rounded-tr-xs'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Input Box */}
              {ticket.status === 'CLOSED' ? (
                <div className="pt-4 border-t border-stone-100 text-center text-xs text-stone-500 p-4 bg-stone-50 rounded-xl">
                  This support query has been marked as closed. If you have a new question, please submit a new ticket.
                </div>
              ) : (
                <form onSubmit={handleSendReply} className="pt-4 border-t border-stone-100 space-y-3">
                  <label htmlFor="replyBox" className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                    Post a Response
                  </label>
                  <textarea
                    id="replyBox"
                    rows={3}
                    required
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your message to the BookLeaf operations team..."
                    className="w-full p-3 text-xs bg-stone-50 border border-stone-200 rounded-xl text-slate-900 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingReply || !replyText.trim()}
                      className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                    >
                      {submittingReply ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Reply</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </AuthorLayout>
  );
}
