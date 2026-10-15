'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  LayoutDashboard,
  Library,
  MessageSquarePlus,
  LifeBuoy,
  User,
  LogOut,
  Menu,
  X,
  FileText,
} from 'lucide-react';

interface AuthorLayoutProps {
  children: React.ReactNode;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    authorProfile?: {
      authorName: string;
      penName?: string | null;
      country: string;
      bankAccountLinked: boolean;
      bankName?: string | null;
    } | null;
  };
}

export function AuthorLayout({ children, user }: AuthorLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navItems = [
    { label: 'Overview', href: '/author/dashboard', icon: LayoutDashboard },
    { label: 'My Books', href: '/author/books', icon: Library },
    { label: 'Support Tickets', href: '/author/tickets', icon: LifeBuoy },
    { label: 'Submit Query', href: '/author/tickets/new', icon: MessageSquarePlus },
    { label: 'Author Account', href: '/author/account', icon: User },
  ];

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row text-slate-900">
      {/* Mobile Topbar */}
      <header className="md:hidden bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-5 h-5 text-indigo-700" />
          <span className="font-bold text-base tracking-tight text-slate-900">BookLeaf</span>
          <span className="text-xs px-2 py-0.5 rounded-sm bg-indigo-50 text-indigo-700 font-medium border border-indigo-200">
            Author
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-100"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-stone-200 min-h-screen p-5 shrink-0 justify-between">
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center space-x-3 px-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-700 text-white flex items-center justify-center font-bold shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base text-slate-900 tracking-tight block">BookLeaf</span>
              <span className="text-xs text-stone-500 font-medium">Author Portal</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 pt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/author/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-stone-600 hover:text-slate-900 hover:bg-stone-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer / User Profile & Logout */}
        <div className="pt-6 border-t border-stone-200 space-y-4">
          <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-900 truncate">{user.name}</p>
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-sm border border-emerald-200">
                Author
              </span>
            </div>
            {user.authorProfile?.penName && (
              <p className="text-[11px] text-stone-500 truncate mt-0.5">Pen: {user.authorProfile.penName}</p>
            )}
            <p className="text-[11px] text-stone-400 truncate">{user.email}</p>
          </div>

          <div className="flex items-center justify-between px-1">
            <Link
              href="/api-docs"
              className="text-xs text-stone-500 hover:text-stone-900 flex items-center space-x-1"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>API Specs</span>
            </Link>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center space-x-1 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex">
          <div className="w-72 bg-white h-full p-5 flex flex-col justify-between shadow-xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-indigo-700" />
                  <span className="font-bold text-slate-900">BookLeaf</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-stone-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                        isActive ? 'bg-slate-900 text-white' : 'text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-stone-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-stone-100 hover:bg-stone-200 text-rose-600 rounded-lg text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)}></div>
        </div>
      )}

      {/* Main Page Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
