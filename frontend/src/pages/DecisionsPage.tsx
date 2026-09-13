import React, { useState, useEffect } from 'react';
import { Submission, Decision, Review, Role } from '../types';
import { api } from '../services/api';
import { Award, Sparkles, CheckCircle2, AlertTriangle, Send, FileText, Check, Lock, ListOrdered, ChevronRight } from 'lucide-react';

interface DecisionsPageProps {
  submissions: Submission[];
  decisions: Decision[];
  reviews: Review[];
  currentRole?: Role;
  onRefresh: () => void;
}

export const DecisionsPage: React.FC<DecisionsPageProps> = ({
  submissions,
  decisions,
  reviews,
  currentRole = 'CHAIR',
  onRefresh
}) => {
  const [selectedSubId, setSelectedSubId] = useState(submissions[0]?.id || '');
  const [aiReport, setAiReport] = useState<any>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [chairDecision, setChairDecision] = useState<'ACCEPT' | 'MINOR_REVISION' | 'MAJOR_REVISION' | 'REJECT'>('ACCEPT');
  const [decisionLetter, setDecisionLetter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [summaryList, setSummaryList] = useState<any[]>([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const isAuthorizedChair = ['CHAIR', 'ORGANIZER', 'ADMIN'].includes(currentRole);

  const loadSummary = async () => {
    setIsLoadingSummary(true);
    try {
      const data = await api.getRecommendationsSummary();
      setSummaryList(data);
    } catch (err) {
      console.error('Failed to load recommendations summary:', err);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (isAuthorizedChair) {
      loadSummary();
    }
  }, [submissions, reviews, decisions, isAuthorizedChair]);

  const currentSub = submissions.find(s => s.id === selectedSubId);
  const currentReviews = reviews.filter(r => r.submission_id === selectedSubId);
  const existingDecision = decisions.find(d => d.submission_id === selectedSubId);

  const fetchAiRecommendation = async () => {
    if (!selectedSubId) return;
    setIsLoadingAi(true);
    try {
      const report = await api.getAiDecisionRecommendation(selectedSubId);
      setAiReport(report);
      if (report.ai_recommendation) {
        setChairDecision(report.ai_recommendation);
        setDecisionLetter(
          `Dear Authors,\n\nWe are writing to announce the official editorial decision regarding Paper #${report.paper_number}: "${report.title}".\n\nDecision: ${report.ai_recommendation}\n\nSynthesis of Reviewer Feedback:\n${report.ai_reasoning}\n\nCamera-ready papers are due December 10, 2026.\n\nWarm regards,\nDr. Radhika Sharma\nGeneral Chair, AGENTIC-AI-2026`
        );
      }
    } catch (err: any) {
      alert(`AI Recommendation failed: ${err.message}`);
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleConfirmDecision = async () => {
    if (!selectedSubId) return;
    setIsSubmitting(true);
    try {
      await api.submitDecision({
        submission_id: selectedSubId,
        final_decision: chairDecision,
        decision_letter: decisionLetter,
        decided_by: 'Dr. Radhika Sharma (General Chair)'
      });
      setActionNotice(`Decision of ${chairDecision} confirmed and saved for Paper #${currentSub?.paper_number}`);
      setTimeout(() => setActionNotice(null), 4000);
      onRefresh();
    } catch (err: any) {
      alert(`Decision submission failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthorizedChair) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Authorized Chair Access Required</h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
          Reviewer score breakdowns, confidential comments to the chair, score divergence arbitration, and final editorial decision authority are strictly restricted to authorized Conference Chairs and Administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            AI Decision Support & Chair Arbitration
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Aggregates reviewer scores, confidence, and detects divergence. Generates recommendation while ensuring the Conference Chair holds final binding authority.
          </p>
        </div>

        {/* Paper Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Select Paper:</label>
          <select
            value={selectedSubId}
            onChange={(e) => {
              setSelectedSubId(e.target.value);
              setAiReport(null);
            }}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 outline-none max-w-xs"
          >
            {submissions.map(s => (
              <option key={s.id} value={s.id}>
                #{s.paper_number}: {s.title.slice(0, 45)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {actionNotice && (
        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Decision Recommendations List Across All Submissions */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-blue-600" />
              Editorial Decision Recommendations List
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated score aggregation, divergence detection, and AI recommendations (Accept, Revise, Reject) across all submitted manuscripts.
            </p>
          </div>
          <button
            onClick={loadSummary}
            disabled={isLoadingSummary}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isLoadingSummary ? 'animate-spin' : ''}`} />
            {isLoadingSummary ? 'Updating List...' : 'Refresh List'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Paper</th>
                <th className="py-3 px-4">Track</th>
                <th className="py-3 px-4">Reviews</th>
                <th className="py-3 px-4">Avg Score</th>
                <th className="py-3 px-4">AI Recommended Outcome</th>
                <th className="py-3 px-4">Divergence</th>
                <th className="py-3 px-4">Binding Decision</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summaryList.map((item) => {
                const isSelected = item.submission_id === selectedSubId;
                return (
                  <tr
                    key={item.submission_id}
                    className={`hover:bg-slate-50/80 transition ${isSelected ? 'bg-blue-50/40' : ''}`}
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-blue-700 font-bold">#{item.paper_number}</span>
                        <span className="line-clamp-1 max-w-xs">{item.title}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-[11px]">{item.track_name}</td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      {item.total_reviews} reviews
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      {item.average_score !== null ? (
                        <span className={item.average_score >= 7.5 ? 'text-emerald-700' : item.average_score >= 5.5 ? 'text-blue-700' : 'text-rose-700'}>
                          {item.average_score}/10
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">Pending</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.ai_recommendation === 'ACCEPT' && (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          ACCEPT
                        </span>
                      )}
                      {item.ai_recommendation === 'MINOR_REVISION' && (
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          MINOR REVISION
                        </span>
                      )}
                      {item.ai_recommendation === 'MAJOR_REVISION' && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          MAJOR REVISION
                        </span>
                      )}
                      {item.ai_recommendation === 'REJECT' && (
                        <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          REJECT
                        </span>
                      )}
                      {item.ai_recommendation === 'PENDING_REVIEWS' && (
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-full">
                          Awaiting Reviews
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.divergence_flag ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          <AlertTriangle className="w-3 h-3 text-amber-600" /> Divergent
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.final_decision ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] font-bold">
                          <Check className="w-3.5 h-3.5" /> {item.final_decision}
                        </span>
                      ) : (
                        <span className="text-amber-600 text-[11px] font-medium">Pending Chair</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedSubId(item.submission_id);
                          setAiReport(null);
                        }}
                        className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition flex items-center gap-1 ml-auto ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        Inspect <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Target Paper Overview & Reviews Summary */}
      {currentSub && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: AI Synthesis & Chair Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Recommendation Engine Box */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  <span className="font-bold text-slate-800 text-sm">
                    AI Recommendation Synthesis
                  </span>
                </div>

                <button
                  onClick={fetchAiRecommendation}
                  disabled={isLoadingAi}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-2xs"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isLoadingAi ? 'animate-spin' : ''}`} />
                  {isLoadingAi ? 'Synthesizing...' : 'Generate AI Synthesis'}
                </button>
              </div>

              {aiReport ? (
                <div className="mt-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                    <div>
                      <span className="text-slate-500 font-medium">Suggested Verdict:</span>
                      <div className="font-extrabold text-base text-blue-900 mt-0.5">
                        {aiReport.ai_recommendation}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-500 font-medium">Average Review Score:</span>
                      <div className="font-mono font-bold text-sm text-slate-800 mt-0.5">
                        {aiReport.average_score}/10
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="font-bold text-slate-700 block mb-1">Reasoning Analysis:</span>
                    <p className="text-slate-600 leading-relaxed">{aiReport.ai_reasoning}</p>
                  </div>

                  {aiReport.divergence_detected && (
                    <div className="p-3 bg-amber-50 text-amber-900 rounded-xl border border-amber-200 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Divergent Review Alert:</strong> Reviewers gave polarized feedback on this paper. As General Chair, please inspect confidential chair comments before confirming.
                      </div>
                    </div>
                  )}

                  <div className="p-2.5 bg-slate-100 rounded-lg text-slate-500 text-[11px] italic">
                    ⚠️ {aiReport.chair_note}
                  </div>
                </div>
              ) : (
                <div className="mt-6 text-center py-6 text-slate-500 text-xs">
                  Click "Generate AI Synthesis" to aggregate reviewer scores, detect divergence, and synthesize recommendations for Paper #{currentSub.paper_number}.
                </div>
              )}
            </div>

            {/* Conference Chair Decision Confirmation */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-600" />
                  General Chair Binding Decision
                </h3>

                {existingDecision && (
                  <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3" /> Already Confirmed: {existingDecision.final_decision}
                  </span>
                )}
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Final Binding Decision *</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['ACCEPT', 'MINOR_REVISION', 'MAJOR_REVISION', 'REJECT'] as const).map((dec) => (
                      <button
                        key={dec}
                        type="button"
                        onClick={() => setChairDecision(dec)}
                        className={`py-2 px-1 text-center rounded-xl font-bold border transition ${
                          chairDecision === dec
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {dec}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Official Decision Letter *</label>
                  <textarea
                    rows={6}
                    value={decisionLetter}
                    onChange={(e) => setDecisionLetter(e.target.value)}
                    placeholder="Decision letter to authors..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-mono outline-none focus:bg-white focus:border-blue-500 leading-relaxed"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleConfirmDecision}
                    disabled={isSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSubmitting ? 'Recording...' : 'Confirm Decision & Dispatch Letter'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: Reviewer Peer Feedback on this Paper */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm h-fit space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              Peer Reviews for Paper #{currentSub.paper_number} ({currentReviews.length})
            </h3>

            {currentReviews.length > 0 ? (
              <div className="space-y-3">
                {currentReviews.map((rev) => (
                  <div key={rev.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-800">{rev.reviewer_name}</span>
                      <span className="font-mono text-blue-700">{rev.overall_score}/10</span>
                    </div>

                    <div className="text-[11px] text-slate-500 font-medium">
                      Verdict: <strong>{rev.recommendation}</strong> · Confidence: {rev.confidence}/5
                    </div>

                    <div className="text-slate-600 text-[11px] line-clamp-3 italic pt-1 border-t border-slate-200">
                      "{rev.comments_to_author}"
                    </div>

                    {rev.confidential_comments_to_chair && (
                      <div className="text-[10px] bg-amber-50 text-amber-800 p-1.5 rounded border border-amber-200 mt-1">
                        <strong>Confidential to Chair:</strong> {rev.confidential_comments_to_chair}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                No reviews completed for this paper yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
