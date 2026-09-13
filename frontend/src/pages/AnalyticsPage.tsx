import React, { useState, useEffect } from 'react';
import { ConferenceAnalytics, FeedbackSummary, ConferenceFeedback } from '../types';
import { api } from '../services/api';
import { BarChart3, TrendingUp, Users, DollarSign, Award, BookOpen, Download, CheckCircle2, Star, MessageSquare, Plus, X, Heart } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<ConferenceAnalytics | null>(null);
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummary | null>(null);
  const [downloadReport, setDownloadReport] = useState(false);

  // Feedback Submission Modal State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [fbName, setFbName] = useState('');
  const [fbEmail, setFbEmail] = useState('');
  const [fbRole, setFbRole] = useState<'AUTHOR' | 'PRESENTER' | 'REVIEWER' | 'SESSION_CHAIR' | 'PARTICIPANT'>('PARTICIPANT');
  const [fbOverall, setFbOverall] = useState(5);
  const [fbSession, setFbSession] = useState(5);
  const [fbOrg, setFbOrg] = useState(5);
  const [fbVenue, setFbVenue] = useState(5);
  const [fbHighlights, setFbHighlights] = useState('');
  const [fbSuggestions, setFbSuggestions] = useState('');
  const [isSubmittingFb, setIsSubmittingFb] = useState(false);
  const [fbSuccessMsg, setFbSuccessMsg] = useState<string | null>(null);

  const loadData = () => {
    api.getAnalytics().then(setAnalytics).catch(console.error);
    api.getFeedbackSummary().then(setFeedbackSummary).catch(console.error);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingFb(true);
    try {
      await api.submitFeedback({
        user_name: fbName || undefined,
        user_email: fbEmail || undefined,
        role: fbRole,
        overall_rating: fbOverall,
        session_quality_rating: fbSession,
        organization_rating: fbOrg,
        venue_platform_rating: fbVenue,
        highlights: fbHighlights,
        suggestions: fbSuggestions
      });
      setFbSuccessMsg('Thank you! Your feedback has been recorded and incorporated into the post-event evaluation analysis.');
      setTimeout(() => {
        setFbSuccessMsg(null);
        setShowFeedbackModal(false);
        setFbHighlights('');
        setFbSuggestions('');
      }, 3000);
      loadData();
    } catch (err: any) {
      alert(`Feedback submission failed: ${err.message}`);
    } finally {
      setIsSubmittingFb(false);
    }
  };

  if (!analytics) {
    return <div className="p-8 text-center text-slate-500 text-xs">Computing live conference analytics...</div>;
  }

  const handleExport = () => {
    const reportData = {
      conference: 'AGENTIC-AI-2026',
      generated_at: new Date().toISOString(),
      metrics: analytics
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conference_analytics_report_${Date.now()}.json`;
    a.click();
    setDownloadReport(true);
    setTimeout(() => setDownloadReport(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Conference Intelligence & Post-Event Analytics
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Real-time metrics tracking submissions, peer review completion velocity, registration revenue, and accreditation reporting.
          </p>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
        >
          <Download className="w-4 h-4" /> Export Audit Report (JSON)
        </button>
      </div>

      {downloadReport && (
        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Audit report downloaded successfully.</span>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Submissions Received</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">{analytics.total_submissions}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            {analytics.accepted} Accepted ({analytics.acceptance_rate}% acceptance rate)
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Peer Reviews Completed</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">{analytics.reviews_completed}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            {analytics.reviews_pending} pending · {analytics.divergent_reviews_count} divergent case
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Total Registered Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            ₹{analytics.total_revenue.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            {analytics.total_registrations} verified registrations
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Certificates & Sessions</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">{analytics.certificates_issued}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            Across {analytics.total_sessions} conflict-free sessions
          </div>
        </div>
      </div>

      {/* Submissions by Track Chart / Progress Representation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Submissions by Academic Track</h3>

        <div className="space-y-3">
          {analytics.submissions_by_track.map((item, idx) => {
            const pct = Math.round((item.count / Math.max(1, analytics.total_submissions)) * 100);
            return (
              <div key={idx} className="space-y-1 text-xs">
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>{item.track}</span>
                  <span className="font-mono text-blue-700">{item.count} paper(s) ({pct}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feedback Analysis & Participant Experience Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              Conference Feedback Analysis & Participant Experience
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Aggregated evaluation metrics and qualitative feedback collected from authors, presenters, reviewers, chairs, and attendees.
            </p>
          </div>

          <button
            onClick={() => setShowFeedbackModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" /> Submit Delegate Feedback
          </button>
        </div>

        {feedbackSummary && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <div className="text-2xl font-black text-slate-900 font-mono flex items-center justify-center gap-1">
                  <span>{feedbackSummary.average_overall}</span>
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500 inline" />
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Overall Experience</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <div className="text-2xl font-black text-slate-900 font-mono flex items-center justify-center gap-1">
                  <span>{feedbackSummary.average_session_quality}</span>
                  <span className="text-xs text-slate-400">/ 5</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Session Quality</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <div className="text-2xl font-black text-slate-900 font-mono flex items-center justify-center gap-1">
                  <span>{feedbackSummary.average_organization}</span>
                  <span className="text-xs text-slate-400">/ 5</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Organization & Flow</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <div className="text-2xl font-black text-emerald-700 font-mono">
                  {feedbackSummary.satisfaction_percentage}%
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Satisfaction Rating</div>
              </div>
            </div>

            {/* Dimensional Ratings Progress */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Evaluation Dimensions</h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-600 font-medium mb-1">
                      <span>Overall Academic Experience</span>
                      <span className="font-mono font-bold text-slate-800">{feedbackSummary.average_overall} / 5.0</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(feedbackSummary.average_overall / 5) * 100}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-600 font-medium mb-1">
                      <span>Paper Presentation & Technical Depth</span>
                      <span className="font-mono font-bold text-slate-800">{feedbackSummary.average_session_quality} / 5.0</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: `${(feedbackSummary.average_session_quality / 5) * 100}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-600 font-medium mb-1">
                      <span>Timetable & Session Organization</span>
                      <span className="font-mono font-bold text-slate-800">{feedbackSummary.average_organization} / 5.0</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${(feedbackSummary.average_organization / 5) * 100}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-600 font-medium mb-1">
                      <span>Venue & Technical Facilities</span>
                      <span className="font-mono font-bold text-slate-800">{feedbackSummary.average_venue_platform} / 5.0</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${(feedbackSummary.average_venue_platform / 5) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Roles Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Responses by Delegate Role</h4>
                <div className="flex flex-wrap gap-2 pt-1">
                  {Object.entries(feedbackSummary.role_breakdown).map(([r, count]) => (
                    <div key={r} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center gap-2">
                      <span className="font-semibold text-slate-700">{r}</span>
                      <span className="bg-white px-2 py-0.5 rounded font-mono font-bold text-blue-700 border border-slate-200 text-[11px]">
                        {count} response(s)
                      </span>
                    </div>
                  ))}
                </div>
                <div className="text-[11px] text-slate-500 pt-2">
                  Total Responses: <strong className="text-slate-800">{feedbackSummary.total_responses}</strong> verified conference participants.
                </div>
              </div>
            </div>

            {/* Qualitative Feedback Quotes */}
            {feedbackSummary.recent_feedback.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Recent Participant Comments & Constructive Suggestions
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {feedbackSummary.recent_feedback.slice(0, 4).map((f) => (
                    <div key={f.id} className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-slate-800">{f.user_name}</div>
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                          {f.role}
                        </span>
                      </div>
                      {f.highlights && (
                        <p className="text-slate-700 italic text-[11px]">"{f.highlights}"</p>
                      )}
                      {f.suggestions && (
                        <div className="text-[11px] text-slate-500">
                          <strong>Suggestion:</strong> {f.suggestions}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feedback Submission Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                Submit Conference Feedback
              </h3>
              <button onClick={() => setShowFeedbackModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {fbSuccessMsg ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{fbSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleSubmitFeedback} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Your Name</label>
                    <input
                      type="text"
                      value={fbName}
                      onChange={(e) => setFbName(e.target.value)}
                      placeholder="e.g. Dr. A. Sharma"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Role in Conference</label>
                    <select
                      value={fbRole}
                      onChange={(e) => setFbRole(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
                    >
                      <option value="AUTHOR">Author</option>
                      <option value="PRESENTER">Presenter</option>
                      <option value="REVIEWER">Reviewer</option>
                      <option value="SESSION_CHAIR">Session Chair</option>
                      <option value="PARTICIPANT">Participant / Delegate</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Overall Experience (1-5)</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={fbOverall}
                      onChange={(e) => setFbOverall(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Technical Sessions (1-5)</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={fbSession}
                      onChange={(e) => setFbSession(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Highlights & Positive Experiences</label>
                  <textarea
                    rows={2}
                    value={fbHighlights}
                    onChange={(e) => setFbHighlights(e.target.value)}
                    placeholder="What went well? (e.g. insightful keynotes, rigorous peer review, smooth schedule)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Constructive Suggestions for Next Edition</label>
                  <textarea
                    rows={2}
                    value={fbSuggestions}
                    onChange={(e) => setFbSuggestions(e.target.value)}
                    placeholder="Suggestions for improvements..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowFeedbackModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingFb}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-sm"
                  >
                    {isSubmittingFb ? 'Submitting...' : 'Submit Evaluation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
