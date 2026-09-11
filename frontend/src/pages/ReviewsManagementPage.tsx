import React, { useState } from 'react';
import { Review, ReviewerAssignment, Submission } from '../types';
import { api } from '../services/api';
import { ClipboardList, AlertTriangle, CheckCircle2, MessageSquare, Star, Plus } from 'lucide-react';

interface ReviewsManagementPageProps {
  submissions: Submission[];
  assignments: ReviewerAssignment[];
  reviews: Review[];
  onRefresh: () => void;
}

export const ReviewsManagementPage: React.FC<ReviewsManagementPageProps> = ({
  submissions,
  assignments,
  reviews,
  onRefresh
}) => {
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState(submissions[0]?.id || '');
  const [overallScore, setOverallScore] = useState(8);
  const [confidence, setConfidence] = useState(4);
  const [recommendation, setRecommendation] = useState<'ACCEPT' | 'MINOR_REVISION' | 'MAJOR_REVISION' | 'REJECT'>('ACCEPT');
  const [strengths, setStrengths] = useState('');
  const [weaknesses, setWeaknesses] = useState('');
  const [commentsToAuthor, setCommentsToAuthor] = useState('');
  const [chairComments, setChairComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Divergent reviews detection: find submissions with score delta >= 4
  const paperReviewsMap: { [subId: string]: Review[] } = {};
  for (const r of reviews) {
    if (!paperReviewsMap[r.submission_id]) paperReviewsMap[r.submission_id] = [];
    paperReviewsMap[r.submission_id].push(r);
  }

  const divergentSubmissions = Object.entries(paperReviewsMap).filter(([_, revs]) => {
    if (revs.length < 2) return false;
    const scores = revs.map(r => r.overall_score);
    return Math.max(...scores) - Math.min(...scores) >= 4;
  });

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.submitReview({
        submission_id: selectedSubId,
        reviewer_id: 'u-rev-05',
        reviewer_name: 'Dr. Marcus Holloway',
        overall_score: Number(overallScore),
        confidence: Number(confidence),
        soundness_score: 4,
        originality_score: 4,
        presentation_score: 4,
        recommendation,
        strengths,
        weaknesses,
        comments_to_author: commentsToAuthor,
        confidential_comments_to_chair: chairComments
      });

      setShowSubmitModal(false);
      setStrengths('');
      setWeaknesses('');
      setCommentsToAuthor('');
      onRefresh();
    } catch (err: any) {
      alert(`Failed to submit review: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            Review Management & Score Aggregation
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Tracks peer evaluations, scores, and automatically flags divergent reviews where score variance triggers Chair arbitration.
          </p>
        </div>

        <button
          onClick={() => setShowSubmitModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Submit Peer Review
        </button>
      </div>

      {/* Divergent Review Alert Banner */}
      {divergentSubmissions.length > 0 && (
        <div className="p-5 bg-amber-50 border border-amber-300 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span>Divergent Review Detection Alert ({divergentSubmissions.length} Case Flagged)</span>
          </div>
          <p className="text-xs text-amber-800">
            A significant score divergence (delta ≥ 4 points) was detected on the following submission(s). The system recommends Conference Chair discussion or assigning a 3rd meta-reviewer.
          </p>

          <div className="space-y-2 mt-2">
            {divergentSubmissions.map(([subId, revs]) => {
              const sub = submissions.find(s => s.id === subId);
              const scores = revs.map(r => r.overall_score);
              return (
                <div key={subId} className="p-3 bg-white rounded-xl border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-900">
                      Paper #{sub?.paper_number || subId}: {sub?.title}
                    </span>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Reviewer Scores: {revs.map(r => `${r.reviewer_name} (${r.overall_score}/10, ${r.recommendation})`).join(' vs ')}
                    </div>
                  </div>
                  <span className="bg-amber-100 text-amber-800 font-mono font-bold px-2.5 py-1 rounded-lg">
                    Score Delta: {Math.max(...scores) - Math.min(...scores)} pts
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reviews Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Completed Peer Reviews ({reviews.length})</h3>
        </div>

        <div className="divide-y divide-slate-100">
          {reviews.map((rev) => {
            const sub = submissions.find(s => s.id === rev.submission_id);

            return (
              <div key={rev.id} className="p-5 hover:bg-slate-50/70 transition space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-700 text-xs">
                      Paper #{sub?.paper_number || '101'}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {sub?.title || 'Academic Manuscript'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        rev.recommendation === 'ACCEPT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rev.recommendation === 'REJECT'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {rev.recommendation}
                    </span>
                    <span className="bg-slate-100 text-slate-800 font-mono font-bold px-2 py-0.5 rounded text-xs">
                      {rev.overall_score}/10
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  Reviewer: <strong>{rev.reviewer_name}</strong> · Confidence: {rev.confidence}/5 · Submitted: {new Date(rev.submitted_at).toLocaleDateString()}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                    <span className="font-bold text-emerald-800 block mb-1">Key Strengths:</span>
                    <p className="text-slate-700">{rev.strengths}</p>
                  </div>
                  <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                    <span className="font-bold text-amber-800 block mb-1">Key Weaknesses:</span>
                    <p className="text-slate-700">{rev.weaknesses}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review Submission Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3">
              Submit Double-Blind Peer Review
            </h3>

            <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Submission *</label>
                <select
                  value={selectedSubId}
                  onChange={(e) => setSelectedSubId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none text-slate-800"
                >
                  {submissions.map(s => (
                    <option key={s.id} value={s.id}>
                      #{s.paper_number}: {s.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Overall Score (1-10) *</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={overallScore}
                    onChange={(e) => setOverallScore(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Confidence (1-5) *</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={confidence}
                    onChange={(e) => setConfidence(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Recommendation *</label>
                  <select
                    value={recommendation}
                    onChange={(e) => setRecommendation(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none font-bold text-slate-800"
                  >
                    <option value="ACCEPT">ACCEPT</option>
                    <option value="MINOR_REVISION">MINOR REVISION</option>
                    <option value="MAJOR_REVISION">MAJOR REVISION</option>
                    <option value="REJECT">REJECT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Paper Strengths *</label>
                <textarea
                  rows={2}
                  required
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  placeholder="Theoretical originality, thorough empirical comparisons..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none resize-y"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Paper Weaknesses *</label>
                <textarea
                  rows={2}
                  required
                  value={weaknesses}
                  onChange={(e) => setWeaknesses(e.target.value)}
                  placeholder="Assumptions about latency bounds, missing baseline citations..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none resize-y"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Comments to Authors *</label>
                <textarea
                  rows={3}
                  required
                  value={commentsToAuthor}
                  onChange={(e) => setCommentsToAuthor(e.target.value)}
                  placeholder="Constructive feedback for authors..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none resize-y"
                />
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
                  {isSubmitting ? 'Submitting...' : 'Confirm Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
