import React, { useState } from 'react';
import { Registration, PaymentRecord } from '../types';
import { api } from '../services/api';
import { CreditCard, CheckCircle2, ShieldCheck, Plus, Receipt, AlertCircle } from 'lucide-react';

interface RegistrationPaymentPageProps {
  registrations: Registration[];
  onRefresh: () => void;
}

const CATEGORIES = [
  { id: 'STUDENT', name: 'Student (Undergraduate/Postgraduate)', fee: 3500 },
  { id: 'RESEARCH_SCHOLAR', name: 'PhD Research Scholar', fee: 5500 },
  { id: 'FACULTY', name: 'Faculty & Academic Staff', fee: 8000 },
  { id: 'INDUSTRY', name: 'Industry Pioneer & Corporate', fee: 15000 },
  { id: 'AUTHOR', name: 'Author (Paper Presentation)', fee: 12000 },
  { id: 'PARTICIPANT', name: 'General Participant', fee: 4000 }
];

export const RegistrationPaymentPage: React.FC<RegistrationPaymentPageProps> = ({
  registrations,
  onRefresh
}) => {
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<any>(null);

  // Registration Form
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [category, setCategory] = useState('PARTICIPANT');
  const [isRegistering, setIsRegistering] = useState(false);

  // Sandbox Payment Form
  const [testCard, setTestCard] = useState('4242 4242 4242 4242');
  const [cardHolder, setCardHolder] = useState('Prof. Elena Rostova');
  const [isPaying, setIsPaying] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    const cat = CATEGORIES.find(c => c.id === category) || CATEGORIES[5];
    try {
      const res = await api.createRegistration({
        user_name: userName,
        user_email: userEmail,
        category: cat.id,
        fee_amount: cat.fee
      });
      setShowRegisterModal(false);
      setUserName('');
      setUserEmail('');
      onRefresh();
      // Open checkout for new registration
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
    } catch (err: any) {
      alert(`Payment authorization failed: ${err.message}`);
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Real Sandbox Payment Gateway Active
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-2">
            Conference Registration & Fee Processing
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Category-based tiers with automated payment verification, instant digital receipts, and zero real money risk during testing.
          </p>
        </div>

        <button
          onClick={() => setShowRegisterModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Attendee Registration
        </button>
      </div>

      {/* Category Fee Tiers Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {CATEGORIES.map((cat) => (
          <div key={cat.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs text-center">
            <div className="text-[10px] font-bold text-slate-500 uppercase">{cat.name.split('(')[0].trim()}</div>
            <div className="text-base font-extrabold text-blue-700 font-mono mt-1">₹{cat.fee.toLocaleString('en-IN')}</div>
            <div className="text-[9px] text-slate-400 mt-0.5">INR + 0% tax</div>
          </div>
        ))}
      </div>

      {/* Registrations List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">
            Registered Attendees & Delegates ({registrations.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Delegate Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Fee Amount</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registrations.map((reg) => (
                <tr key={reg.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{reg.user_name}</td>
                  <td className="py-3.5 px-4 text-slate-600 font-mono">{reg.user_email}</td>
                  <td className="py-3.5 px-4">
                    <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-medium text-[11px]">
                      {reg.category}
                    </span>
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
                      {reg.payment_status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {reg.payment_status === 'SUCCESS' ? (
                      <span className="text-emerald-600 font-semibold text-[11px] flex items-center justify-end gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                      </span>
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

      {/* Checkout Modal */}
      {selectedReg && checkoutOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Sandbox Payment Checkout</h3>
              </div>
              <button onClick={() => setSelectedReg(null)} className="text-slate-400 hover:text-slate-600 text-xs">
                Close
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
                    <span className="text-sm font-mono">₹{selectedReg.fee_amount.toLocaleString('en-IN')}</span>
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

      {/* New Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3">
              Register New Attendee
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none text-slate-800"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} — ₹{c.fee.toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
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
                  {isRegistering ? 'Registering...' : 'Proceed to Checkout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
