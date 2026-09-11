import React, { useState } from 'react';
import { Submission, Decision, Review } from '../types';
import { api } from '../services/api';
import { Award, Sparkles, CheckCircle2, AlertTriangle, Send, FileText, Check } from 'lucide-react';

interface DecisionsPageProps {
  submissions: Submission[];
  decisions: Decision[];
  reviews: Review[];
  onRefresh: () => void;
}

export const DecisionsPage: React.FC<DecisionsPageProps> = ({
  submissions,
  decisions,
  reviews,
  onRefresh
}) => {
  const [selectedSubId, setSelectedSubId] = useState(submissions[0]?.id || '');
  const [aiReport, setAiReport] = useState<any>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [chairDecision, setChairDecision] = useState<'ACCEPT' | 'MINOR_REVISION' | 'MAJOR_REVISION' | 'REJECT'>('ACCEPT');
  const [decisionLetter, setDecisionLetter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

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
