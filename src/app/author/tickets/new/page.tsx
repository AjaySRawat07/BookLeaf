'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthorLayout } from '@/components/AuthorLayout';
import { ArrowLeft, Send, AlertCircle, Paperclip, CheckCircle2, Loader2, BookOpen } from 'lucide-react';

interface BookOption {
  id: string;
  title: string;
  isbn: string;
  status: string;
}

function NewTicketForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedBookId = searchParams.get('bookId') || '';

  const [books, setBooks] = useState<BookOption[]>([]);
  const [selectedBookId, setSelectedBookId] = useState(preselectedBookId);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [userProfile, setUserProfile] = useState<{ id: string; name: string; email: string; role: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) setUserProfile(d.user);
      });

    fetch('/api/author/books')
      .then((r) => r.json())
      .then((d) => {
        setBooks(d.books || []);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (subject.trim().length < 5) {
      setErrorMsg('Subject must be at least 5 characters long.');
      return;
    }

    if (description.trim().length < 10) {
      setErrorMsg('Please describe your query in at least 10 characters.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        bookId: selectedBookId || null,
        queryType: selectedBookId ? 'BOOK_SPECIFIC' : 'GENERAL_ACCOUNT',
        subject: subject.trim(),
        description: description.trim(),
        attachmentUrl: attachmentUrl.trim() || null,
      };

      const res = await fetch('/api/author/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to submit ticket. Please try again.');
        return;
      }

      // Successful persistence: redirect to conversation view!
      router.push(`/author/tickets/${data.ticket.id}`);
    } catch (err) {
      console.error('Submit query error:', err);
      setErrorMsg('Network error. Your query could not be submitted.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthorLayout user={userProfile || { id: '', name: 'Author', email: '', role: 'AUTHOR' }}>
      <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto w-full">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-xs text-stone-500">
          <Link href="/author/tickets" className="hover:text-stone-900 flex items-center space-x-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Support Tickets</span>
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-800">Submit New Query</span>
        </div>

        {/* Form Container */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="border-b border-stone-100 pb-5 mb-6">
            <h1 className="text-2xl font-bold text-slate-900 font-serif">
              Submit a Support Query
            </h1>
            <p className="text-xs text-stone-600 mt-1">
              Our operations and editorial teams review inquiries promptly with strict SLA timelines.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Book Selector */}
            <div>
              <label htmlFor="bookSelect" className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                Select Related Title <span className="text-stone-400 normal-case font-normal">(optional)</span>
              </label>
              <div className="mt-1.5">
                <select
                  id="bookSelect"
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="block w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                >
                  <option value="">General / Account Level Query (No Specific Book)</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} (ISBN: {b.isbn} • {b.status === 'PUBLISHED' ? 'Live' : 'In Production'})
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1 text-[11px] text-stone-500">
                Choose the specific book if your inquiry relates to royalties, ISBN, distribution, or print quality.
              </p>
            </div>

            {/* Subject */}
            <div>
              <label htmlFor="subject" className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                Subject Line <span className="text-rose-500">*</span>
              </label>
              <div className="mt-1.5">
                <input
                  id="subject"
                  type="text"
                  required
                  maxLength={150}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Royalty payout confirmation or ISBN mismatch on Amazon"
                  className="block w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-slate-900 text-sm placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                />
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-stone-500">
                <span>Brief, clear summary of your query</span>
                <span>{subject.length}/150</span>
              </div>
            </div>

            {/* Detailed Description */}
            <div>
              <label htmlFor="description" className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                Detailed Description <span className="text-rose-500">*</span>
              </label>
              <div className="mt-1.5">
                <textarea
                  id="description"
                  required
                  rows={6}
                  maxLength={3000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please provide full details including relevant dates, retailer links, or observations to help us resolve your query faster..."
                  className="block w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-slate-900 text-sm placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:bg-white leading-relaxed"
                />
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-stone-500">
                <span>Minimum 10 characters</span>
                <span>{description.length}/3000</span>
              </div>
            </div>

            {/* Optional Attachment Support (UI requirement) */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <label htmlFor="attachmentUrl" className="block text-xs font-semibold text-stone-700 uppercase tracking-wider flex items-center space-x-1.5">
                <Paperclip className="w-3.5 h-3.5 text-stone-500" />
                <span>Optional Attachment Reference (Photo / Document URL)</span>
              </label>
              <input
                id="attachmentUrl"
                type="url"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                placeholder="https://drive.google.com/... or https://example.com/photo.jpg"
                className="block w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-slate-900 text-xs placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
              />
              <p className="text-[11px] text-stone-500">
                For print defects, you may provide photo links or email them in reply once the ticket is logged.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-end space-x-3">
              <Link
                href="/author/tickets"
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-slate-900"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting Query...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Query</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AuthorLayout>
  );
}

export default function NewTicketPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-stone-500">Loading form...</div>}>
      <NewTicketForm />
    </Suspense>
  );
}
