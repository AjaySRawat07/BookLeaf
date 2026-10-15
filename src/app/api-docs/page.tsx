'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BookOpen, Shield, Code, ChevronRight, CheckCircle2, ArrowLeft, ExternalLink } from 'lucide-react';

interface Endpoint {
  method: 'GET' | 'POST' | 'PATCH';
  path: string;
  summary: string;
  description?: string;
  auth: 'Public' | 'Author Only' | 'Admin Only';
  requestBody?: string;
  responses: Record<string, string>;
}

const ENDPOINTS: Endpoint[] = [
  // Auth
  {
    method: 'POST',
    path: '/api/auth/login',
    summary: 'Authenticate author or admin',
    description: 'Validates email and password, creates secure HttpOnly session cookie with sliding-window brute force rate limiting.',
    auth: 'Public',
    requestBody: JSON.stringify({ email: 'vikram.seth@example.com', password: 'AuthorPass@2026' }, null, 2),
    responses: { '200': 'Success, session cookie set', '401': 'Invalid credentials', '429': 'Rate limit exceeded' },
  },
  {
    method: 'POST',
    path: '/api/auth/logout',
    summary: 'Destroy session and logout',
    auth: 'Public',
    responses: { '200': 'Session cleared' },
  },
  {
    method: 'GET',
    path: '/api/auth/me',
    summary: 'Get current authenticated user profile',
    auth: 'Author Only',
    responses: { '200': 'User object with author profile', '401': 'Not logged in' },
  },

  // Author Books
  {
    method: 'GET',
    path: '/api/author/books',
    summary: 'List books of authenticated author',
    description: 'Enforces strict author-level ownership at the database layer. Returns aggregated royalty numbers (earned, paid, pending) matching BookLeaf 80/20 formula.',
    auth: 'Author Only',
    responses: { '200': 'List of books and aggregated summary' },
  },
  {
    method: 'GET',
    path: '/api/author/books/:bookId',
    summary: 'Get single book detail (IDOR protected)',
    auth: 'Author Only',
    responses: { '200': 'Book detail with platform breakdown', '403': 'Forbidden (IDOR violation)' },
  },

  // Author Tickets
  {
    method: 'GET',
    path: '/api/author/tickets',
    summary: 'List support tickets created by authenticated author',
    auth: 'Author Only',
    responses: { '200': 'Tickets array with latest message (internal notes omitted)' },
  },
  {
    method: 'POST',
    path: '/api/author/tickets',
    summary: 'Submit a new support ticket',
    description: 'Persists the ticket first to ensure zero data loss during AI outages, then runs background AI classification and priority scoring.',
    auth: 'Author Only',
    requestBody: JSON.stringify(
      {
        bookId: 'book_01',
        queryType: 'BOOK_SPECIFIC',
        subject: 'Royalty statement clarification needed',
        description: 'I would like to receive the line-by-line sales report for Q3.',
      },
      null,
      2
    ),
    responses: { '201': 'Ticket created and enriched', '400': 'Validation error' },
  },
  {
    method: 'GET',
    path: '/api/author/tickets/:ticketId',
    summary: 'Get author ticket detail and conversation view',
    description: 'Strictly excludes all messages where isInternalNote === true.',
    auth: 'Author Only',
    responses: { '200': 'Ticket details and public replies', '403': 'Forbidden: not your ticket' },
  },
  {
    method: 'POST',
    path: '/api/author/tickets/:ticketId',
    summary: 'Author posts a reply to an existing ticket',
    auth: 'Author Only',
    requestBody: JSON.stringify({ message: 'Here are the requested photos of the binding defect.' }, null, 2),
    responses: { '200': 'Reply saved and SSE event broadcast' },
  },
  {
    method: 'GET',
    path: '/api/author/tickets/:ticketId/events',
    summary: 'Server-Sent Events (SSE) real-time ticket stream',
    description: 'Streams live updates (new admin replies, status updates) without page refresh with automatic keep-alive ping.',
    auth: 'Author Only',
    responses: { '200': 'text/event-stream' },
  },

  // Admin Tickets
  {
    method: 'GET',
    path: '/api/admin/tickets',
    summary: 'List and filter operational ticket queue',
    description: 'Search by subject, author, ticket number, book. Filter by status, category, priority. Supports pagination and urgent/oldest sorting.',
    auth: 'Admin Only',
    responses: { '200': 'Paginated tickets array and summary' },
  },
  {
    method: 'GET',
    path: '/api/admin/tickets/:ticketId',
    summary: 'Get full admin ticket workspace',
    description: 'Includes original query, author profile with bank details, book metrics, AI confidence/rationale, public replies, and private internal notes.',
    auth: 'Admin Only',
    responses: { '200': 'Full workspace object with internal notes and audit trail' },
  },
  {
    method: 'PATCH',
    path: '/api/admin/tickets/:ticketId',
    summary: 'Update ticket status, override AI category, or override AI priority',
    auth: 'Admin Only',
    requestBody: JSON.stringify({ status: 'RESOLVED', category: 'Royalty & Payments', priority: 'High' }, null, 2),
    responses: { '200': 'Ticket updated and overrides logged' },
  },
  {
    method: 'POST',
    path: '/api/admin/tickets/:ticketId/messages',
    summary: 'Admin sends a public response to the author',
    auth: 'Admin Only',
    requestBody: JSON.stringify({ message: 'Dear author, we have initiated the stock re-sync with Amazon.', updateStatus: 'IN_PROGRESS' }, null, 2),
    responses: { '200': 'Public reply saved and broadcast via SSE to author' },
  },
  {
    method: 'POST',
    path: '/api/admin/tickets/:ticketId/notes',
    summary: 'Admin adds a private internal note',
    description: 'Strictly private to the operations team. Never accessible to authors or emitted over SSE.',
    auth: 'Admin Only',
    requestBody: JSON.stringify({ note: 'Checked with Repro printer; order #8812 reprint was dispatched yesterday.' }, null, 2),
    responses: { '200': 'Private note recorded' },
  },
  {
    method: 'POST',
    path: '/api/admin/tickets/:ticketId/assign',
    summary: 'Assign ticket to an admin',
    auth: 'Admin Only',
    responses: { '200': 'Ticket assigned' },
  },
  {
    method: 'POST',
    path: '/api/admin/tickets/:ticketId/ai/classify',
    summary: 'Run or re-run AI auto-classification',
    description: 'Classifies into 1 of 6 categories with confidence and rationale. Respects existing human overrides.',
    auth: 'Admin Only',
    responses: { '200': 'Classification scored and recorded' },
  },
  {
    method: 'POST',
    path: '/api/admin/tickets/:ticketId/ai/draft',
    summary: 'Generate grounded AI response draft',
    description: 'Draft only. Grounded in the BookLeaf Knowledge Base, author bank linkage, and book metrics. Never auto-sent.',
    auth: 'Admin Only',
    responses: { '200': 'Draft generated with rationale and key policy citations' },
  },
  {
    method: 'GET',
    path: '/api/admin/stats',
    summary: 'Operations dashboard metrics and distributions',
    auth: 'Admin Only',
    responses: { '200': 'Live ticket counts, category breakdown, priority distribution, and recent audit activity' },
  },
  {
    method: 'GET',
    path: '/api/admin/authors',
    summary: 'List authors with sales summaries and ticket volumes',
    auth: 'Admin Only',
    responses: { '200': 'Authors list with book metrics' },
  },
];

export default function ApiDocsPage() {
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'Author Only' | 'Admin Only'>('ALL');
  const [search, setSearch] = useState('');

  const filtered = ENDPOINTS.filter((e) => {
    if (selectedFilter !== 'ALL' && e.auth !== selectedFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return e.path.toLowerCase().includes(q) || e.summary.toLowerCase().includes(q) || e.method.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      {/* Top Header */}
      <header className="border-b border-stone-200 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2 text-stone-600 hover:text-stone-900 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to App</span>
            </Link>
            <span className="text-stone-300">|</span>
            <div className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-indigo-700" />
              <h1 className="font-semibold text-slate-900 text-lg">BookLeaf REST API Specification</h1>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <a
              href="/api/openapi.json"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md px-3 py-1.5 transition-colors"
            >
              <Code className="w-3.5 h-3.5" />
              <span>Download openapi.json</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Intro Banner */}
        <div className="bg-white border border-stone-200 rounded-xl p-6 mb-8 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 mb-2">
                OpenAPI 3.0.0
              </span>
              <h2 className="text-2xl font-bold text-slate-900">BookLeaf Publishing API Reference</h2>
              <p className="mt-1 text-sm text-stone-600 max-w-3xl">
                Comprehensive documentation for the Author Portal, Operations Ticket Queue, Real-time SSE streaming, and Grounded AI Services. All protected endpoints strictly validate server-side RBAC and author data isolation.
              </p>
            </div>
            <div className="hidden sm:flex flex-col items-end text-xs text-stone-500 space-y-1">
              <span className="flex items-center text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Zero-trust Author Isolation
              </span>
              <span className="flex items-center text-indigo-700 font-medium">
                <Shield className="w-3.5 h-3.5 mr-1" /> Rate-Limited & Sanitized
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-stone-100">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              {(['ALL', 'Author Only', 'Admin Only'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedFilter === tab
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {tab === 'ALL' ? 'All Endpoints' : tab}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Search endpoints (e.g. tickets, royalty, books)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-80 px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Endpoints List */}
        <div className="space-y-4">
          {filtered.map((ep, idx) => {
            const methodBg =
              ep.method === 'GET'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : ep.method === 'POST'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200';

            const authBg =
              ep.auth === 'Admin Only'
                ? 'bg-purple-100 text-purple-800'
                : ep.auth === 'Author Only'
                ? 'bg-teal-100 text-teal-800'
                : 'bg-stone-100 text-stone-700';

            return (
              <div
                key={idx}
                className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs hover:border-stone-300 transition-all"
              >
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <span className={`px-2.5 py-1 text-xs font-bold font-mono rounded-md border ${methodBg}`}>
                        {ep.method}
                      </span>
                      <span className="font-mono text-sm font-semibold text-slate-800">{ep.path}</span>
                    </div>
                    <span className={`self-start sm:self-auto px-2 py-0.5 rounded-full text-xs font-medium ${authBg}`}>
                      {ep.auth}
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-medium text-slate-700">{ep.summary}</p>
                  {ep.description && (
                    <p className="mt-1 text-xs text-stone-500 leading-relaxed">{ep.description}</p>
                  )}

                  {ep.requestBody && (
                    <div className="mt-4">
                      <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                        Sample Request Body
                      </span>
                      <pre className="bg-stone-900 text-stone-100 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                        {ep.requestBody}
                      </pre>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-medium text-stone-500 mr-1">Responses:</span>
                    {Object.entries(ep.responses).map(([code, desc]) => (
                      <span
                        key={code}
                        className={`text-xs px-2 py-0.5 rounded-md font-mono border ${
                          code.startsWith('2')
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : code.startsWith('4')
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-stone-50 text-stone-600 border-stone-200'
                        }`}
                      >
                        <strong>{code}</strong>: {desc}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
