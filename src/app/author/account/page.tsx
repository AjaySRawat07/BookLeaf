import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { AuthorLayout } from '@/components/AuthorLayout';
import { User, CreditCard, ShieldCheck, CheckCircle2, AlertCircle, Building2, FileText } from 'lucide-react';


export default async function AuthorAccountPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const user = await db.user.findUnique({
    where: { id: session.id },
    include: {
      authorProfile: true,
    },
  });

  if (!user) redirect('/login');

  const profile = user.authorProfile;

  return (
    <AuthorLayout user={user}>
      <div className="p-6 md:p-8 space-y-8 max-w-4xl mx-auto w-full">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-serif">Author Account & Payout Settings</h1>
          <p className="text-sm text-stone-600 mt-1">
            Verified author profile, linked bank details, and quarterly royalty disbursement terms.
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-stone-100">
            <User className="w-5 h-5 text-indigo-700" />
            <h2 className="text-base font-bold text-slate-900 font-serif">Personal Information</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
              <span className="text-stone-500 block">Full Legal Name</span>
              <span className="font-semibold text-slate-900 text-sm">{user.name}</span>
            </div>

            <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
              <span className="text-stone-500 block">Pen Name / Pseudonym</span>
              <span className="font-semibold text-slate-900 text-sm">
                {profile?.penName || 'Same as legal name'}
              </span>
            </div>

            <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
              <span className="text-stone-500 block">Registered Email</span>
              <span className="font-semibold text-slate-900 text-sm font-mono">{user.email}</span>
            </div>

            <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
              <span className="text-stone-500 block">Phone</span>
              <span className="font-semibold text-slate-900 text-sm">{user.phone || 'Not provided'}</span>
            </div>

            <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 sm:col-span-2">
              <span className="text-stone-500 block">Author Biography</span>
              <p className="text-stone-700 mt-1 leading-relaxed">
                {profile?.bio || 'No biography entered.'}
              </p>
            </div>
          </div>
        </div>

        {/* Bank & Payout Information */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center space-x-3">
              <Building2 className="w-5 h-5 text-emerald-700" />
              <h2 className="text-base font-bold text-slate-900 font-serif">Bank Details for Royalty Disbursement</h2>
            </div>
            {profile?.bankAccountLinked ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Verified & Active
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                <AlertCircle className="w-3.5 h-3.5 mr-1" /> Not Linked
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
              <span className="text-stone-500 block">Bank Name</span>
              <span className="font-semibold text-slate-900 text-sm">
                {profile?.bankName || 'Not linked'}
              </span>
            </div>

            <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
              <span className="text-stone-500 block">Account Number</span>
              <span className="font-semibold text-slate-900 text-sm font-mono">
                {profile?.accountNumberMasked || 'Not linked'}
              </span>
            </div>

            <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
              <span className="text-stone-500 block">IFSC / Routing Code</span>
              <span className="font-semibold text-slate-900 text-sm font-mono">
                {profile?.ifscCode || 'Not linked'}
              </span>
            </div>
          </div>

          {/* Official BookLeaf Policy Box */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 space-y-2">
            <div className="flex items-center space-x-2 text-slate-900 font-semibold">
              <ShieldCheck className="w-4 h-4 text-indigo-700" />
              <span>Official BookLeaf Royalty Disbursement Terms</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-stone-600">
              <li>Royalties are calculated on a quarterly schedule (Q1–Q4) and disbursed within <strong>45 days</strong> following quarter close.</li>
              <li>Minimum payout threshold is <strong>₹1,000</strong>. Lower amounts automatically roll over to the subsequent quarter.</li>
              <li>Payments are remitted via automated direct bank transfer to your verified account above.</li>
            </ul>
          </div>
        </div>
      </div>
    </AuthorLayout>
  );
}
