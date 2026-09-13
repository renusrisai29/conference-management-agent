import React, { useState } from 'react';
import { CertificateRecord } from '../types';
import { api } from '../services/api';
import { Award, ShieldCheck, Download, Search, CheckCircle2, Plus, Eye, ExternalLink, Sparkles } from 'lucide-react';

interface CertificatesPageProps {
  certificates: CertificateRecord[];
  onRefresh: () => void;
}

export const CertificatesPage: React.FC<CertificatesPageProps> = ({
  certificates,
  onRefresh
}) => {
  const [searchCertId, setSearchCertId] = useState('');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);

  // New Certificate Form
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [role, setRole] = useState<'AUTHOR' | 'PRESENTER' | 'REVIEWER' | 'SESSION_CHAIR' | 'PARTICIPANT'>('PARTICIPANT');
  const [paperTitle, setPaperTitle] = useState('');
  const [isIssuing, setIsIssuing] = useState(false);
  const [isBatchIssuing, setIsBatchIssuing] = useState(false);
  const [batchNotice, setBatchNotice] = useState<string | null>(null);
  const [previewCert, setPreviewCert] = useState<CertificateRecord | null>(null);

  const handleBatchIssue = async () => {
    setIsBatchIssuing(true);
    try {
      const res = await api.batchGenerateCertificates();
      setBatchNotice(res.message);
      setTimeout(() => setBatchNotice(null), 5000);
      onRefresh();
    } catch (err: any) {
      alert(`Batch certificate generation failed: ${err.message}`);
    } finally {
      setIsBatchIssuing(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCertId.trim()) return;
    setIsVerifying(true);
    try {
      const res = await api.verifyCertificate(searchCertId.trim());
      setVerificationResult(res);
    } catch (err: any) {
      alert(`Verification error: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsIssuing(true);
    try {
      const res = await api.generateCertificate({
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        role,
        paper_title: paperTitle || undefined
      });
      setShowIssueModal(false);
      setRecipientName('');
      setRecipientEmail('');
      setPaperTitle('');
      onRefresh();
      setPreviewCert(res.certificate);
    } catch (err: any) {
      alert(`Certificate issue error: ${err.message}`);
    } finally {
      setIsIssuing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            Verifiable Academic Certificates & Digital Signatures
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Issues tamper-evident digital certificates anchored by SHA-256 cryptographic verification hashes and PDF generation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleBatchIssue}
            disabled={isBatchIssuing}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition border border-slate-200 shadow-2xs"
            title="Auto-issue certificates for all accepted authors, presenters, reviewers, session chairs, and participants"
          >
            <Sparkles className={`w-4 h-4 text-amber-600 ${isBatchIssuing ? 'animate-spin' : ''}`} />
            {isBatchIssuing ? 'Issuing All Roles...' : 'Auto-Issue All Roles'}
          </button>
          <button
            onClick={() => setShowIssueModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Issue Certificate
          </button>
        </div>
      </div>

      {batchNotice && (
        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{batchNotice}</span>
        </div>
      )}

      {/* Public Verification Search Box */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/80 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          Public Certificate Authenticity Verification
        </h3>
        <p className="text-xs text-slate-600 mb-4">
          Enter any certificate ID (e.g. <span className="font-mono font-bold text-blue-700">VIGNAN-CONF2026-CERT-88492</span>) to verify its cryptographic validity in our database.
        </p>

        <form onSubmit={handleVerify} className="flex gap-2 max-w-xl">
          <input
            type="text"
            required
            value={searchCertId}
            onChange={(e) => setSearchCertId(e.target.value)}
            placeholder="VIGNAN-CONF2026-CERT-XXXXXX"
            className="flex-1 bg-white border border-slate-300 focus:border-blue-500 rounded-xl px-4 py-2 text-xs font-mono outline-none shadow-2xs"
          />
          <button
            type="submit"
            disabled={isVerifying}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-5 py-2 rounded-xl transition shadow-sm"
          >
            {isVerifying ? 'Verifying...' : 'Verify Now'}
          </button>
        </form>

        {/* Verification Report Result */}
        {verificationResult && (
          <div className="mt-4 p-4 rounded-xl border bg-white shadow-2xs text-xs space-y-2">
            <div className="flex items-center gap-2">
              {verificationResult.valid ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-rose-600" />
              )}
              <span className={`font-bold text-sm ${verificationResult.valid ? 'text-emerald-800' : 'text-rose-800'}`}>
                {verificationResult.valid ? 'Authentic Certificate Confirmed' : 'Verification Unsuccessful'}
              </span>
            </div>

            <p className="text-slate-700">{verificationResult.verification_message}</p>

            {verificationResult.certificate && (
              <div className="mt-2 pt-2 border-t border-slate-100 font-mono text-[11px] text-slate-500 space-y-0.5">
                <div>Hash: <strong className="text-slate-800">{verificationResult.certificate.verification_hash}</strong></div>
                <div>Issued To: <strong className="text-slate-800">{verificationResult.certificate.recipient_name} ({verificationResult.certificate.role})</strong></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Certificates Database Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">
            Registered Certificates ({certificates.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Certificate ID</th>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Paper Reference</th>
                <th className="py-3 px-4">SHA-256 Hash</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {certificates.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                    {c.certificate_number}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{c.recipient_name}</div>
                    <div className="text-slate-500 text-[10px]">{c.recipient_email}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                      {c.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 max-w-xs truncate text-slate-600">
                    {c.paper_title || 'N/A (Attendee Participation)'}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400">
                    {c.verification_hash.slice(0, 16)}...
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => setPreviewCert(c)}
                      className="text-blue-600 hover:text-blue-800 font-semibold text-xs p-1"
                      title="Preview Certificate"
                    >
                      <Eye className="w-4 h-4 inline" />
                    </button>
                    <a
                      href={`/api/certificates/${c.certificate_number}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 text-xs p-1"
                      title="Download Official PDF"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Certificate Preview Modal */}
      {previewCert && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border-4 border-[#0E2A47] relative">
            <button
              onClick={() => setPreviewCert(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>

            {/* Certificate Canvas UI */}
            <div className="text-center space-y-4 border-2 border-[#E31B23] p-8 rounded-2xl bg-gradient-to-b from-white to-slate-50">
              <div className="text-xs font-black tracking-widest text-[#E31B23] uppercase">
                VIGNAN'S FOUNDATION FOR SCIENCE, TECHNOLOGY & RESEARCH
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                (Deemed to be University) · Estd. u/s 3 of UGC Act 1956 · NAAC A+
              </div>

              <div className="text-xl font-extrabold text-[#0E2A47] tracking-tight pt-2">
                CERTIFICATE OF ACADEMIC RECOGNITION
              </div>

              <div className="text-xs text-slate-500 italic">
                This certificate is proudly conferred upon
              </div>

              <div className="text-2xl font-black text-blue-700 tracking-wide">
                {previewCert.recipient_name}
              </div>

              <div className="text-xs text-slate-700 max-w-lg mx-auto">
                in grateful recognition of valuable contribution as <strong>{previewCert.role}</strong> at the
                <div className="font-bold text-slate-900 mt-1">
                  International Conference on Agentic AI & Autonomous Systems (AGENTIC-AI-2026)
                </div>
              </div>

              {previewCert.paper_title && (
                <div className="text-xs text-slate-600 italic bg-blue-50/50 p-2 rounded-lg">
                  Paper: "{previewCert.paper_title}"
                </div>
              )}

              <div className="pt-6 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-200">
                <div className="text-left font-mono">
                  <div>ID: <strong>{previewCert.certificate_number}</strong></div>
                  <div>Hash: {previewCert.verification_hash.slice(0, 20)}...</div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-slate-800 text-xs">Dr. Radhika Sharma</div>
                  <div>General Chair, AGENTIC-AI-2026</div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <a
                href={`/api/certificates/${previewCert.certificate_number}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-4 h-4" /> Download Official PDF
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Issue Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Issue Academic Certificate
            </h3>

            <form onSubmit={handleIssue} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Recipient Full Name *</label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Prof. Elena Rostova"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Recipient Email *</label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="author@university.edu"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none text-slate-800"
                >
                  <option value="AUTHOR">AUTHOR</option>
                  <option value="PRESENTER">PRESENTER</option>
                  <option value="REVIEWER">REVIEWER</option>
                  <option value="SESSION_CHAIR">SESSION CHAIR</option>
                  <option value="PARTICIPANT">PARTICIPANT</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Associated Paper Title (optional)</label>
                <input
                  type="text"
                  value={paperTitle}
                  onChange={(e) => setPaperTitle(e.target.value)}
                  placeholder="Title of paper if applicable"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isIssuing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm"
                >
                  {isIssuing ? 'Generating...' : 'Confirm & Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
