import Link from 'next/link';
import { BookOpen, Shield, User, ArrowRight, Code, Sparkles, CheckCircle2 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-stone-50 text-slate-900 flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-stone-200 bg-white shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-700 text-white flex items-center justify-center font-bold shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base text-slate-900 tracking-tight block font-serif">BookLeaf Publishing</span>
              <span className="text-[11px] text-stone-500 font-sans">Author Support & Operations Portal</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/api-docs"
              className="text-xs font-semibold text-stone-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors"
            >
              API Docs
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-lg shadow-xs transition-colors"
            >
              <span>Portal Login</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-8 my-auto">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Full-Stack Developer Technical Assignment</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 font-serif tracking-tight leading-tight max-w-3xl mx-auto">
          Author Support & Operational Communication Platform
        </h1>

        <p className="text-base sm:text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
          A production-grade web application powering transparent author royalties, real-time ticket resolution, and grounded AI assistance for BookLeaf operations teams.
        </p>

        {/* Portals Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 text-left max-w-3xl mx-auto">
          {/* Author Portal Card */}
          <Link
            href="/login"
            className="group bg-white p-6 rounded-2xl border border-stone-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:bg-indigo-700 group-hover:text-white transition-colors">
                <User className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 font-serif">Author Portal</h2>
              <p className="text-xs text-stone-600 leading-relaxed">
                View published books and quarterly royalties (80/20 net profit split), track in-production progress, submit queries with book context, and receive real-time admin replies.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-stone-100 flex items-center text-xs font-semibold text-indigo-700 group-hover:translate-x-1 transition-transform">
              <span>Sign in as Author</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          {/* Admin Ops Card */}
          <Link
            href="/login"
            className="group bg-white p-6 rounded-2xl border border-stone-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center group-hover:bg-indigo-700 transition-colors">
                <Shield className="w-5 h-5 text-amber-300" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 font-serif">Operations Desk</h2>
              <p className="text-xs text-stone-600 leading-relaxed">
                Triage incoming queries, inspect AI classifications and priorities, review grounded knowledge base drafts, override categories, manage private internal notes, and assign tickets.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-stone-100 flex items-center text-xs font-semibold text-indigo-700 group-hover:translate-x-1 transition-transform">
              <span>Sign in as Operations Admin</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="pt-10 border-t border-stone-200 max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 text-left text-xs">
          <div className="p-3 bg-white border border-stone-200 rounded-xl">
            <span className="font-semibold text-slate-900 block">AI Integration</span>
            <span className="text-stone-500 text-[11px] mt-0.5 block">6 Categories, 4 Priorities, Grounded KB Drafts</span>
          </div>
          <div className="p-3 bg-white border border-stone-200 rounded-xl">
            <span className="font-semibold text-slate-900 block">Real-Time Updates</span>
            <span className="text-stone-500 text-[11px] mt-0.5 block">Server-Sent Events (SSE) live streaming</span>
          </div>
          <div className="p-3 bg-white border border-stone-200 rounded-xl">
            <span className="font-semibold text-slate-900 block">Role-Based Security</span>
            <span className="text-stone-500 text-[11px] mt-0.5 block">Zero-trust author isolation, private notes</span>
          </div>
          <div className="p-3 bg-white border border-stone-200 rounded-xl">
            <span className="font-semibold text-slate-900 block">REST & OpenAPI</span>
            <span className="text-stone-500 text-[11px] mt-0.5 block">Full 3.0 specification & interactive UI</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-6 text-center text-xs text-stone-500">
        <p>BookLeaf Publishing • Full-Stack Developer Hiring Technical Assignment</p>
        <p className="mt-1 font-mono text-[11px] text-stone-400">
          Confidential Evaluation • Private Deployment Ready
        </p>
      </footer>
    </div>
  );
}
