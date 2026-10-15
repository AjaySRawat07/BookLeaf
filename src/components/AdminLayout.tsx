'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Inbox,
  Users,
  Code,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Sparkles,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function AdminLayout({ children, user }: AdminLayoutProps) {
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
    { label: 'Operations Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Ticket Queue', href: '/admin/tickets', icon: Inbox },
    { label: 'Authors & Catalog', href: '/admin/authors', icon: Users },
    { label: 'API Specification', href: '/api-docs', icon: Code },
  ];

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row text-slate-900">
      {/* Mobile Topbar */}
      <header className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <span className="font-bold text-base tracking-tight">BookLeaf Ops</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg text-stone-300 hover:bg-slate-800"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Desktop Persistent Admin Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-950 text-stone-200 border-r border-slate-800 min-h-screen p-5 shrink-0 justify-between">
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center space-x-3 px-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
              <ShieldAlert className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <span className="font-bold text-base text-white tracking-tight block">BookLeaf</span>
              <span className="text-xs text-amber-400 font-medium flex items-center space-x-1">
                <Sparkles className="w-3 h-3 inline mr-1" />
                Ops & AI Portal
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 pt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-stone-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-6 border-t border-slate-800 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <span className="text-[10px] font-medium text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded-sm border border-amber-800">
                Admin
              </span>
            </div>
            <p className="text-[11px] text-stone-400 truncate mt-0.5">{user.email}</p>
          </div>

          <div className="flex items-center justify-between px-1">
            <Link
              href="/author/dashboard"
              className="text-xs text-stone-400 hover:text-stone-200 transition-colors"
            >
              Switch to Author View
            </Link>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center space-x-1 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex">
          <div className="w-72 bg-slate-950 text-white h-full p-5 flex flex-col justify-between shadow-xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                  <span className="font-bold">BookLeaf Ops</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-stone-400">
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
                        isActive ? 'bg-indigo-600 text-white' : 'text-stone-400 hover:bg-slate-900'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-rose-400 rounded-lg text-sm font-medium"
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
