import React, { useState } from 'react';
import { Submission, Track } from '../types';
import { api } from '../services/api';
import { FileUp, ShieldCheck, CheckCircle2, AlertTriangle, Plus, Search, Eye, Filter } from 'lucide-react';

interface SubmissionsPageProps {
  submissions: Submission[];
  tracks: Track[];
  onRefresh: () => void;
  onSelectPaperForMatching?: (sub: Submission) => void;
}

export const SubmissionsPage: React.FC<SubmissionsPageProps> = ({
  submissions,
  tracks,
  onRefresh,
  onSelectPaperForMatching
}) => {
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [similarityResult, setSimilarityResult] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTrack, setFilterTrack] = useState('ALL');

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newAbstract, setNewAbstract] = useState('');
  const [newTrackId, setNewTrackId] = useState(tracks[0]?.id || 'trk-01');
  const [newKeywords, setNewKeywords] = useState('');
  const [newPageCount, setNewPageCount] = useState(7);
  const [authorName, setAuthorName] = useState('Dr. Priya Venkatesh');
  const [authorEmail, setAuthorEmail] = useState('pvenkatesh@cmu.edu');
  const [authorInst, setAuthorInst] = useState('Carnegie Mellon University');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createSubmission({
        title: newTitle,
        abstract: newAbstract,
        track_id: newTrackId,
        keywords: newKeywords.split(',').map(s => s.trim()),
        page_count: Number(newPageCount),
        authors: [
          {
            name: authorName,
            email: authorEmail,
            institution: authorInst,
            country: 'USA'
          }
        ]
      });
      setShowSubmitModal(false);
      setNewTitle('');
      setNewAbstract('');
      setNewKeywords('');
      onRefresh();
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidate = async (sub: Submission) => {
    try {
      const res = await api.validateSubmission(sub.id);
      setValidationResult(res);
      setSelectedSub(sub);
      setSimilarityResult(null);
    } catch (err: any) {
      alert(`Validation error: ${err.message}`);
    }
  };

  const handleSimilarityCheck = async (sub: Submission) => {
    try {
      const res = await api.checkSimilarity(sub.id);
      setSimilarityResult(res);
      setSelectedSub(sub);
      setValidationResult(null);
      onRefresh();
    } catch (err: any) {
      alert(`Similarity check error: ${err.message}`);
    }
  };

  const filtered = submissions.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.authors.some(a => a.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      s.paper_number.toString().includes(searchTerm);
    const matchesTrack = filterTrack === 'ALL' || s.track_id === filterTrack;
    return matchesSearch && matchesTrack;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileUp className="w-5 h-5 text-blue-600" />
            Paper Submissions & Quality Validation
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Authors upload manuscripts with automated format validation, page-limit checks, and genuine local n-gram similarity scoring.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Submit New Paper
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search submissions by title, author, or paper number..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 outline-none focus:bg-white focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterTrack}
            onChange={(e) => setFilterTrack(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none text-slate-700"
          >
            <option value="ALL">All Tracks</option>
            {tracks.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Validation or Similarity Diagnostics Banner */}
      {selectedSub && (validationResult || similarityResult) && (
        <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-800">
              Diagnostics Report for Paper #{selectedSub.paper_number}: {selectedSub.title}
            </span>
            <button
              onClick={() => {
                setValidationResult(null);
                setSimilarityResult(null);
                setSelectedSub(null);
              }}
              className="text-slate-400 hover:text-slate-600 text-xs"
            >
              Close
            </button>
          </div>

          {validationResult && (
            <div className="text-xs space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Format Integrity:</span>
                <span className={`px-2 py-0.5 rounded font-bold ${validationResult.status === 'VALID' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {validationResult.status}
                </span>
                <span className="text-slate-500 font-mono">({validationResult.page_count} / {validationResult.max_allowed} pages)</span>
              </div>
              {validationResult.issues.length > 0 ? (
                <ul className="list-disc list-inside text-rose-700 space-y-1">
                  {validationResult.issues.map((iss: string, idx: number) => (
                    <li key={idx}>{iss}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> All format requirements, page limits, and required metadata verified.
                </div>
              )}
            </div>
          )}

          {similarityResult && (
            <div className="text-xs space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Corpus Similarity Score:</span>
                <span className={`px-2 py-0.5 rounded font-bold ${similarityResult.status === 'PASSED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {similarityResult.similarity_score}% ({similarityResult.status})
                </span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Computed via n-gram tokenization and Jaccard comparison across all active submissions.
              </p>
              {similarityResult.matched_documents && similarityResult.matched_documents.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="font-semibold text-slate-700">Top Document Overlaps:</div>
                  {similarityResult.matched_documents.map((match: any, idx: number) => (
                    <div key={idx} className="p-2 bg-slate-50 rounded border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-700">Paper #{match.paper_number}: {match.title}</span>
                      <span className="font-mono font-bold text-slate-600">{match.similarity}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Submissions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">#</th>
                <th className="py-3.5 px-4">Title & Abstract</th>
                <th className="py-3.5 px-4">Track</th>
                <th className="py-3.5 px-4">Authors</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Similarity</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                    #{sub.paper_number}
                  </td>
                  <td className="py-3.5 px-4 max-w-sm">
                    <div className="font-bold text-slate-900 line-clamp-1">{sub.title}</div>
                    <div className="text-slate-500 text-[11px] line-clamp-2 mt-0.5">{sub.abstract}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {sub.keywords.slice(0, 3).map((k, kIdx) => (
                        <span key={kIdx} className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.2 rounded">
                          {k}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded text-[11px] whitespace-nowrap">
                      {sub.track_name || 'General'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-800">
                      {sub.authors.map(a => a.name).join(', ')}
                    </div>
                    <div className="text-slate-400 text-[10px] mt-0.5">
                      {sub.authors[0]?.institution}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        sub.status === 'ACCEPTED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : sub.status === 'UNDER_REVIEW'
                          ? 'bg-blue-100 text-blue-800'
                          : sub.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        sub.similarity_score >= 20
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {sub.similarity_score}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => handleValidate(sub)}
                      className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Run Format & Page Limits Validation"
                    >
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSimilarityCheck(sub)}
                      className="p-1.5 text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                      title="Run Similarity Check"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {onSelectPaperForMatching && (
                      <button
                        onClick={() => onSelectPaperForMatching(sub)}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium px-2 py-1 rounded text-[11px] transition"
                      >
                        Match Reviewers
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Paper Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3">
              Submit New Academic Paper
            </h3>

            <form onSubmit={handleSubmitPaper} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Paper Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Provably Robust Guardrails for Agentic Code Execution"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Conference Track *</label>
                  <select
                    value={newTrackId}
                    onChange={(e) => setNewTrackId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-blue-500 text-slate-700"
                  >
                    {tracks.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Page Count *</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={newPageCount}
                    onChange={(e) => setNewPageCount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Abstract *</label>
                <textarea
                  rows={3}
                  required
                  value={newAbstract}
                  onChange={(e) => setNewAbstract(e.target.value)}
                  placeholder="Detailed academic abstract..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-blue-500 focus:bg-white resize-y"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Keywords (comma-separated) *</label>
                <input
                  type="text"
                  required
                  value={newKeywords}
                  onChange={(e) => setNewKeywords(e.target.value)}
                  placeholder="e.g. autonomous agents, formal verification, sandboxing, cybersecurity"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

              <div className="border-t border-slate-100 pt-3">
                <div className="font-semibold text-slate-800 mb-2">Primary Author Information</div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs outline-none"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Email"
                    value={authorEmail}
                    onChange={(e) => setAuthorEmail(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs outline-none"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Institution"
                    value={authorInst}
                    onChange={(e) => setAuthorInst(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                >
                  {isSubmitting ? 'Uploading...' : 'Confirm Submission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
