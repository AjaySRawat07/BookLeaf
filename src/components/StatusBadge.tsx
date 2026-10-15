import React from 'react';

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();

  switch (normalized) {
    case 'OPEN':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
          Open
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
          In Progress
        </span>
      );
    case 'RESOLVED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
          Resolved
        </span>
      );
    case 'CLOSED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200">
          <span className="w-1.5 h-1.5 rounded-full bg-stone-400 mr-1.5"></span>
          Closed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-700">
          {status}
        </span>
      );
  }
}

export function PriorityBadge({ priority }: { priority: string }) {
  const normalized = priority.toLowerCase();

  switch (normalized) {
    case 'critical':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mr-1.5 animate-pulse"></span>
          Critical
        </span>
      );
    case 'high':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-200">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-1.5"></span>
          High
        </span>
      );
    case 'medium':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5"></span>
          Medium
        </span>
      );
    case 'low':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></span>
          Low
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-700">
          {priority}
        </span>
      );
  }
}

export function CategoryBadge({ category }: { category: string }) {
  let badgeStyle = 'bg-stone-100 text-stone-800 border-stone-200';

  if (category.includes('Royalty')) {
    badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  } else if (category.includes('ISBN')) {
    badgeStyle = 'bg-purple-50 text-purple-800 border-purple-200';
  } else if (category.includes('Printing')) {
    badgeStyle = 'bg-indigo-50 text-indigo-800 border-indigo-200';
  } else if (category.includes('Distribution')) {
    badgeStyle = 'bg-sky-50 text-sky-800 border-sky-200';
  } else if (category.includes('Production') || category.includes('Status')) {
    badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${badgeStyle}`}>
      {category}
    </span>
  );
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}
