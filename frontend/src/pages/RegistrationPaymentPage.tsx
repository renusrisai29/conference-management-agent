import React, { useState, useEffect } from 'react';
import { Registration, PaymentRecord, Role } from '../types';
import { api } from '../services/api';
import {
  CreditCard, CheckCircle2, ShieldCheck, Plus, Receipt,
  AlertCircle, RefreshCw, Check, Clock, AlertTriangle,
  Filter, UserCheck, Banknote, ArrowUpRight
} from 'lucide-react';

interface RegistrationPaymentPageProps {
  registrations: Registration[];
  currentRole?: Role;
  onRefresh: () => void;
}

export interface CategoryFeeRule {
  id: string;
  name: string;
  description: string;
  early_bird_fee: number;
  regular_fee: number;
}

export const CATEGORY_RULES: CategoryFeeRule[] = [
  { id: 'STUDENT', name: 'Student (Undergraduate / Postgraduate)', description: 'Valid student ID verification required', early_bird_fee: 2500, regular_fee: 3500 },
  { id: 'RESEARCH_SCHOLAR', name: 'PhD Research Scholar / Postdoc', description: 'Academic doctoral researchers & scholars', early_bird_fee: 3500, regular_fee: 4500 },
  { id: 'FACULTY', name: 'Faculty & Academic Staff', description: 'University professors, instructors & scientists', early_bird_fee: 4500, regular_fee: 6000 },
  { id: 'INDUSTRY', name: 'Industry Pioneer & Corporate', description: 'Industry delegates, engineers & enterprise sponsors', early_bird_fee: 7000, regular_fee: 9000 },
  { id: 'AUTHOR', name: 'Author (Paper Presentation)', description: 'Full presentation slot & proceedings publication', early_bird_fee: 5000, regular_fee: 6500 },
  { id: 'LISTENER', name: 'Listener / Attendee (Non-presenting)', description: 'Full access to keynote & all technical sessions', early_bird_fee: 1500, regular_fee: 2500 },
  { id: 'PARTICIPANT', name: 'General Participant', description: 'Standard delegate admission & conference kit', early_bird_fee: 2000, regular_fee: 3000 }
];

export const RegistrationPaymentPage: React.FC<RegistrationPaymentPageProps> = ({
  registrations,
  currentRole = 'CHAIR',
  onRefresh
}) => {
  const isAdmin = ['ADMIN', 'CHAIR', 'ORGANIZER'].includes(currentRole);
  const [activeTab, setActiveTab] = useState<'REGISTRATIONS' | 'RECONCILIATION'>('REGISTRATIONS');

  // Registration Form State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [category, setCategory] = useState('STUDENT');
  const [isEarlyBird, setIsEarlyBird] = useState(true);
  const [paperTitle, setPaperTitle] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Checkout / Payment Modal State
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<any>(null);
  const [testCard, setTestCard] = useState('4242 4242 4242 4242');
  const [cardHolder, setCardHolder] = useState('Prof. Elena Rostova');
  const [isPaying, setIsPaying] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  // Financial Reconciliation State
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED' | 'UNMATCHED'>('ALL');
  const [paymentToReconcile, setPaymentToReconcile] = useState<any | null>(null);
  const [reconcileRegId, setReconcileRegId] = useState('');
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconcileNotice, setReconcileNotice] = useState<string | null>(null);

  // Receipt Modal State
  const [viewReceipt, setViewReceipt] = useState<any | null>(null);

  // Fetch payments for reconciliation
  const loadPayments = async () => {
    setIsLoadingPayments(true);
    try {
      const data = await api.getPayments();
      setPayments(data);
    } catch (err: any) {
      console.error('Failed to load payments:', err);
    } finally {
      setIsLoadingPayments(false);
    }
  };

  useEffect(() => {
    if (isAdmin || activeTab === 'RECONCILIATION') {
      loadPayments();
    }
  }, [isAdmin, activeTab]);

  // Current selected category rule
  const currentRule = CATEGORY_RULES.find(c => c.id === category) || CATEGORY_RULES[0];
  const calculatedFee = isEarlyBird ? currentRule.early_bird_fee : currentRule.regular_fee;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    try {
      const res = await api.createRegistration({
        user_name: userName,
        user_email: userEmail,
        category: currentRule.id,
        is_early_bird: isEarlyBird,
        fee_amount: calculatedFee,
        paper_title: paperTitle || undefined
      });
      setShowRegisterModal(false);
      setUserName('');
      setUserEmail('');
      setPaperTitle('');
      onRefresh();
      loadPayments();
      // Directly open checkout for the new registration
      handleOpenCheckout(res.registration);
    } catch (err: any) {
      alert(`Registration failed: ${err.message}`);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleOpenCheckout = async (reg: Registration) => {
    setSelectedReg(reg);
    setPaymentResult(null);
    try {
      const order = await api.createPaymentOrder(reg.id, reg.fee_amount);
      setCheckoutOrder(order);
    } catch (err: any) {
      alert(`Checkout order error: ${err.message}`);
    }
  };

  const handleProcessSandboxPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReg || !checkoutOrder) return;
    setIsPaying(true);
    try {
      const res = await api.submitSandboxPayment({
        registration_id: selectedReg.id,
        order_id: checkoutOrder.order_id,
        card_number: testCard,
        cardholder_name: cardHolder,
        amount: selectedReg.fee_amount
      });
      setPaymentResult(res);
      onRefresh();
      loadPayments();
    } catch (err: any) {
      alert(`Payment authorization failed: ${err.message}`);
    } finally {
      setIsPaying(false);
    }
  };

  const handleReconcilePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentToReconcile) return;
    setIsReconciling(true);
    try {
      await api.reconcilePayment(
        paymentToReconcile.id,
        { registration_id: reconcileRegId || paymentToReconcile.registration_id },
        currentRole
      );
      setReconcileNotice(`Payment ${paymentToReconcile.id} successfully matched and reconciled.`);
      setPaymentToReconcile(null);
      setReconcileRegId('');
      onRefresh();
      loadPayments();
    } catch (err: any) {
      alert(`Reconciliation error: ${err.message}`);
    } finally {
      setIsReconciling(false);
    }
  };

  // Reconciliation KPIs
  const totalPaymentsCount = payments.length;
  const successPayments = payments.filter(p => p.status === 'SUCCESS' || p.status === 'PAID');
  const pendingPayments = payments.filter(p => p.status === 'PENDING');
  const failedPayments = payments.filter(p => p.status === 'FAILED');
  const unmatchedPayments = payments.filter(p => p.status === 'UNMATCHED');

  const totalRevenue = successPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const pendingRevenue = pendingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const unmatchedRevenue = unmatchedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const filteredPayments = payments.filter(p => {
    if (paymentStatusFilter === 'ALL') return true;
    if (paymentStatusFilter === 'SUCCESS') return p.status === 'SUCCESS' || p.status === 'PAID';
    return p.status === paymentStatusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Real Sandbox Gateway & Reconciliation Engine
            </span>
            {isEarlyBird && (
              <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">
                Early-Bird Window Active
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-2">
            Registration & Payment Reconciliation
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Category-wise fee rules (student, faculty, industry, author, listener) with early-bird calculation and authorized admin payment reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={loadPayments}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2.5 rounded-xl transition border border-slate-200"
              title="Refresh payment records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPayments ? 'animate-spin' : ''}`} /> Sync Ledgers
            </button>
          )}

          <button
            onClick={() => {
              setUserName(currentRole === 'AUTHOR' ? 'Prof. Elena Rostova' : '');
              setUserEmail(currentRole === 'AUTHOR' ? 'author1@mit.edu' : '');
              setShowRegisterModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Delegate Registration
          </button>
        </div>
      </div>

      {/* Reconcile Notice Banner */}
      {reconcileNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{reconcileNotice}</span>
          </div>
          <button onClick={() => setReconcileNotice(null)} className="text-emerald-600 hover:text-emerald-800">
            &times;
          </button>
        </div>
      )}

      {/* Category Fee Tiers Banner (Dynamic early-bird vs regular comparison) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <Banknote className="w-4 h-4 text-blue-600" />
            Category-Wise Registration Fee Matrix
          </div>
          <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-100">
            Early-Bird savings up to 25% across all categories
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-1">
          {CATEGORY_RULES.map((cat) => (
            <div
              key={cat.id}
              className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-200 transition text-center flex flex-col justify-between"
            >
              <div>
                <div className="text-[10px] font-bold text-slate-600 uppercase tracking-tight truncate" title={cat.name}>
                  {cat.id.replace('_', ' ')}
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5 line-clamp-1" title={cat.description}>
                  {cat.description}
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-200/60">
                <div className="text-[10px] text-emerald-700 font-bold">
                  Early: ₹{cat.early_bird_fee.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  Regular: ₹{cat.regular_fee.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      {isAdmin && (
        <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab('REGISTRATIONS')}
            className={`pb-2.5 border-b-2 transition flex items-center gap-2 ${
              activeTab === 'REGISTRATIONS'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Registered Delegates ({registrations.length})
          </button>

          <button
            onClick={() => setActiveTab('RECONCILIATION')}
            className={`pb-2.5 border-b-2 transition flex items-center gap-2 ${
              activeTab === 'RECONCILIATION'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Financial Reconciliation Dashboard
            {(pendingPayments.length > 0 || unmatchedPayments.length > 0) && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {pendingPayments.length + unmatchedPayments.length} Action Needed
              </span>
            )}
          </button>
        </div>
      )}

      {/* VIEW 1: REGISTRATIONS LIST */}
      {(!isAdmin || activeTab === 'REGISTRATIONS') && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Registered Attendees & Conference Delegates ({registrations.length})
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Total Verified: {registrations.filter(r => r.payment_status === 'SUCCESS').length} / {registrations.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Delegate Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Category & Rate</th>
                  <th className="py-3 px-4">Fee Amount</th>
                  <th className="py-3 px-4">Payment Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div>{reg.user_name}</div>
                      {reg.paper_title && (
                        <div className="text-[10px] text-slate-400 font-normal truncate max-w-xs" title={reg.paper_title}>
                          Paper: {reg.paper_title}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono">{reg.user_email}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-medium text-[11px]">
                          {reg.category}
                        </span>
                        {reg.is_early_bird && (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold px-1.5 py-0.2 rounded">
                            Early-Bird
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      ₹{reg.fee_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          reg.payment_status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {reg.payment_status === 'SUCCESS' ? 'PAID / CONFIRMED' : reg.payment_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {reg.payment_status === 'SUCCESS' ? (
                        <button
                          type="button"
                          onClick={() => setViewReceipt({
                            id: `RCPT-${reg.id.slice(-4)}`,
                            delegate_name: reg.user_name,
                            delegate_email: reg.user_email,
                            category: reg.category,
                            amount: reg.fee_amount,
                            currency: 'INR',
                            date: reg.created_at,
                            verified_at: new Date().toISOString()
                          })}
                          className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold px-2.5 py-1 rounded-lg text-[11px] inline-flex items-center gap-1 border border-emerald-200 transition"
                        >
                          <Receipt className="w-3.5 h-3.5" /> View Receipt
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenCheckout(reg)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1 rounded-lg text-[11px] transition shadow-2xs"
                        >
                          Pay Sandbox Fee
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: FINANCIAL RECONCILIATION DASHBOARD (AUTHORIZED CHAIRS/ADMINS ONLY) */}
      {isAdmin && activeTab === 'RECONCILIATION' && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Total Ledgers</div>
              <div className="text-xl font-extrabold text-slate-900 font-mono mt-1">{totalPaymentsCount}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Logged Transactions</div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-emerald-200 shadow-2xs bg-emerald-50/20">
              <div className="text-[10px] font-bold text-emerald-700 uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Reconciled & Paid
              </div>
              <div className="text-xl font-extrabold text-emerald-800 font-mono mt-1">
                ₹{totalRevenue.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-emerald-600 mt-0.5">{successPayments.length} Settled Payments</div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-amber-200 shadow-2xs bg-amber-50/20">
              <div className="text-[10px] font-bold text-amber-700 uppercase flex items-center gap-1">
                <Clock className="w-3 h-3" /> Pending Approvals
              </div>
              <div className="text-xl font-extrabold text-amber-800 font-mono mt-1">
                ₹{pendingRevenue.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-amber-600 mt-0.5">{pendingPayments.length} Awaiting Verification</div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-rose-200 shadow-2xs bg-rose-50/20">
              <div className="text-[10px] font-bold text-rose-700 uppercase flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Failed Transactions
              </div>
              <div className="text-xl font-extrabold text-rose-800 font-mono mt-1">{failedPayments.length}</div>
              <div className="text-[10px] text-rose-600 mt-0.5">Gateway Rejected</div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-purple-200 shadow-2xs bg-purple-50/20">
              <div className="text-[10px] font-bold text-purple-700 uppercase flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Unmatched Wires
              </div>
              <div className="text-xl font-extrabold text-purple-800 font-mono mt-1">
                ₹{unmatchedRevenue.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-purple-600 mt-0.5">{unmatchedPayments.length} Needs Manual Match</div>
            </div>
          </div>

          {/* Payment Records Table & Filter Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Transaction Audit & Reconciliation Ledger ({filteredPayments.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Audit payment IDs, reconcile unmatched wire transfers, and confirm pending attendee settlements.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={paymentStatusFilter}
                  onChange={(e: any) => setPaymentStatusFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none font-semibold text-slate-700"
                >
                  <option value="ALL">All Statuses ({payments.length})</option>
                  <option value="SUCCESS">Verified / Paid ({successPayments.length})</option>
                  <option value="PENDING">Pending Verification ({pendingPayments.length})</option>
                  <option value="FAILED">Failed ({failedPayments.length})</option>
                  <option value="UNMATCHED">Unmatched Remittances ({unmatchedPayments.length})</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Transaction / Order ID</th>
                    <th className="py-3 px-4">Delegate / Sender</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment Status</th>
                    <th className="py-3 px-4">Reconciliation Details</th>
                    <th className="py-3 px-4 text-right">Reconcile Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <div>{p.order_id || p.id}</div>
                        {p.payment_id && (
                          <div className="text-[10px] text-slate-400 font-normal">{p.payment_id}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{p.delegate_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{p.delegate_email}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        ₹{(Number(p.amount) || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'SUCCESS' || p.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : p.status === 'FAILED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[11px] text-slate-600">
                        {p.status === 'SUCCESS' || p.status === 'PAID' ? (
                          <div>
                            <span className="text-emerald-700 font-medium">Reconciled</span>
                            {p.reconciled_by && (
                              <div className="text-[10px] text-slate-400">By: {p.reconciled_by}</div>
                            )}
                            {p.verified_at && (
                              <div className="text-[9px] text-slate-400 font-mono">
                                {new Date(p.verified_at).toLocaleTimeString()}
                              </div>
                            )}
                          </div>
                        ) : p.status === 'UNMATCHED' ? (
                          <span className="text-purple-700 font-medium">Unlinked Bank Remittance</span>
                        ) : p.status === 'PENDING' ? (
                          <span className="text-amber-700 font-medium">Pending Delegate Payment</span>
                        ) : (
                          <span className="text-rose-700 font-medium">Card/Bank Authentication Failed</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {p.status === 'SUCCESS' || p.status === 'PAID' ? (
                          <span className="text-emerald-600 font-semibold text-[11px] flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentToReconcile(p);
                              setReconcileRegId(p.registration_id || (registrations[0]?.id || ''));
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-2.5 py-1 rounded-lg text-[11px] transition shadow-2xs inline-flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Reconcile
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RECONCILE PAYMENT MODAL */}
      {paymentToReconcile && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Reconcile & Settle Payment</h3>
              </div>
              <button
                onClick={() => setPaymentToReconcile(null)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleReconcilePayment} className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction ID:</span>
                  <span className="font-mono font-bold text-slate-800">{paymentToReconcile.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Received:</span>
                  <span className="font-mono font-bold text-emerald-800">
                    ₹{paymentToReconcile.amount?.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Status:</span>
                  <span className="font-bold text-purple-800">{paymentToReconcile.status}</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Match to Delegate Registration *
                </label>
                <select
                  value={reconcileRegId}
                  onChange={(e) => setReconcileRegId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none text-slate-800 text-xs"
                >
                  {registrations.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.user_name} ({r.category}) — ₹{r.fee_amount} [{r.payment_status}]
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Selecting a delegate will mark their registration fee as fully paid and confirmed.
                </span>
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-[11px] leading-relaxed">
                By reconciling this payment, the transaction status will be updated to <strong>SUCCESS</strong> and an audit timestamp will be attached to the ledger.
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentToReconcile(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReconciling}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm flex items-center gap-1.5"
                >
                  {isReconciling ? 'Reconciling...' : 'Confirm Reconciliation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL (SANDBOX PAY) */}
      {selectedReg && checkoutOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Sandbox Payment Checkout</h3>
              </div>
              <button onClick={() => setSelectedReg(null)} className="text-slate-400 hover:text-slate-600 text-xs">
                &times;
              </button>
            </div>

            {paymentResult ? (
              <div className="p-4 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 text-xs space-y-2 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="font-bold text-sm">Payment Verified Successfully!</div>
                <div className="font-mono text-[11px]">Transaction ID: {paymentResult.payment_id}</div>
                <p className="text-emerald-800 text-[11px]">{paymentResult.message}</p>
                <button
                  onClick={() => setSelectedReg(null)}
                  className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg font-semibold"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleProcessSandboxPayment} className="space-y-3.5 text-xs">
                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Order Reference:</span>
                    <span className="font-mono font-bold text-blue-800">{checkoutOrder.order_id}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold">
                    <span>Total Amount Due:</span>
                    <span className="text-sm font-mono text-blue-900">₹{selectedReg.fee_amount.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Test Card Number</label>
                  <input
                    type="text"
                    required
                    value={testCard}
                    onChange={(e) => setTestCard(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Use standard 16-digit test card number</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      required
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Test CVV</label>
                    <input
                      type="text"
                      defaultValue="123"
                      maxLength={3}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedReg(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPaying}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-sm"
                  >
                    {isPaying ? 'Authorizing...' : `Authorize ₹${selectedReg.fee_amount.toLocaleString('en-IN')} (Sandbox)`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* NEW REGISTRATION MODAL WITH DYNAMIC EARLY-BIRD CALCULATOR */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3">
              Register Conference Delegate
            </h3>

            <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Dr. Kenji Sato"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="sato@u-tokyo.ac.jp"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Registration Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none text-slate-800 font-medium"
                >
                  {CATEGORY_RULES.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">{currentRule.description}</span>
              </div>

              {/* Early-Bird Rate Eligibility Toggle */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="font-bold text-amber-900 text-xs">Early-Bird Discount Eligibility</div>
                    <div className="text-[10px] text-amber-700">Valid for registrations completed before deadline</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isEarlyBird}
                    onChange={(e) => setIsEarlyBird(e.target.checked)}
                    className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                </label>
              </div>

              {category === 'AUTHOR' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Paper Title / Paper # (Optional)</label>
                  <input
                    type="text"
                    value={paperTitle}
                    onChange={(e) => setPaperTitle(e.target.value)}
                    placeholder="e.g. Paper #101: Autonomous Agent Architecture"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none"
                  />
                </div>
              )}

              {/* Dynamic Fee Calculation Display */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-blue-600">Applicable Fee</div>
                  <div className="text-xs text-slate-600">
                    {isEarlyBird ? 'Early-Bird Discount Applied' : 'Standard Regular Tier'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-extrabold text-blue-900 font-mono">
                    ₹{calculatedFee.toLocaleString('en-IN')}
                  </div>
                  {isEarlyBird && (
                    <div className="text-[10px] text-emerald-700 font-bold">
                      Saved ₹{(currentRule.regular_fee - currentRule.early_bird_fee).toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm"
                >
                  {isRegistering ? 'Registering...' : `Confirm & Pay ₹${calculatedFee.toLocaleString('en-IN')}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT VIEW MODAL */}
      {viewReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 sm:p-6 shadow-xl border border-slate-200 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="text-center pb-3 border-b border-slate-100">
              <Receipt className="w-8 h-8 text-emerald-600 mx-auto mb-1" />
              <h3 className="font-bold text-slate-900 text-sm">Official Payment Receipt</h3>
              <div className="text-[10px] text-slate-400 font-mono">{viewReceipt.id}</div>
            </div>

            <div className="space-y-2 py-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Attendee:</span>
                <span className="font-bold text-slate-800">{viewReceipt.delegate_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="font-mono text-slate-700">{viewReceipt.delegate_email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tier:</span>
                <span className="font-bold text-slate-800">{viewReceipt.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-mono font-bold text-emerald-700">₹{viewReceipt.amount?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Status:</span>
                <span className="font-bold text-emerald-700">CONFIRMED & VERIFIED</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setViewReceipt(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
