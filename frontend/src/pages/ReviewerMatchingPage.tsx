import React, { useState, useEffect } from 'react';
import { Submission, ReviewerMatchScore } from '../types';
import { api } from '../services/api';
import { Users, Search, AlertOctagon, CheckCircle2, Sliders, ShieldAlert, BookOpen, Award, UserPlus } from 'lucide-react';

interface ReviewerMatchingPageProps {
  submissions: Submission[];
  selectedPaperNumber?: number;
  onRefresh: () => void;
}

export const ReviewerMatchingPage: React.FC<ReviewerMatchingPageProps> = ({
  submissions,
  selectedPaperNumber,
  onRefresh
}) => {
  const [selectedSubId, setSelectedSubId] = useState<string>(
    submissions.find(s => s.paper_number === selectedPaperNumber)?.id || submissions[0]?.id || ''
  );
  const [rankedReviewers, setRankedReviewers] = useState<ReviewerMatchScore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [providerSource, setProviderSource] = useState('Agent 17 Mock Provider');
  const [filterConflicts, setFilterConflicts] = useState(false);
  const [assignedSuccess, setAssignedSuccess] = useState<string | null>(null);

  // Matching Weights
  const [weights, setWeights] = useState({
    expertise: 0.50,
    keywords: 0.20,
    researchArea: 0.15,
    workload: 0.10,
    suitability: 0.05
  });

  const currentSub = submissions.find(s => s.id === selectedSubId);

  const runMatching = async () => {
    if (!selectedSubId) return;
    setIsLoading(true);
    try {
      const res = await api.matchReviewers(selectedSubId, weights, filterConflicts);
      setRankedReviewers(res.ranked_reviewers);
      setProviderSource(res.provider_source);
    } catch (err: any) {
      alert(`Reviewer Matching Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSubId) {
      runMatching();
    }
  }, [selectedSubId, filterConflicts]);

  const handleAssign = async (match: ReviewerMatchScore) => {
    if (match.coi_status.has_conflict) {
      const confirmOverride = window.confirm(
        `WARNING: This reviewer has active Conflict of Interest flags:\n- ${match.coi_status.reasons.join('\n- ')}\n\nAssigning this reviewer may compromise double-blind peer review integrity. Do you wish to override?`
      );
      if (!confirmOverride) return;
    }

    try {
      await api.assignReviewer({
        submission_id: currentSub!.id,
        reviewer_id: match.reviewer.researcher_id,
        reviewer_name: match.reviewer.name,
        reviewer_institution: match.reviewer.institution,
        match_score: match.total_score
      });
      setAssignedSuccess(`Assigned ${match.reviewer.name} to Paper #${currentSub!.paper_number}`);
      setTimeout(() => setAssignedSuccess(null), 4000);
      onRefresh();
    } catch (err: any) {
      alert(`Assignment failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Data Source: {providerSource}
              </span>
              <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2 py-0.5 rounded-full">
                18 Faculty · 120+ Verified Publications
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-2">
              AI Reviewer Recommendation & Conflict of Interest Engine
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Computes weighted multi-factor match scores against faculty publication profiles while strictly enforcing COI detection.
            </p>
          </div>

          {/* Paper Selector Dropdown */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-600">Select Paper:</label>
            <select
              value={selectedSubId}
              onChange={(e) => setSelectedSubId(e.target.value)}
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

        {assignedSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{assignedSuccess}</span>
          </div>
        )}

        {/* Paper Summary Card */}
        {currentSub && (
          <div className="mt-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-col sm:flex-row items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider font-mono">
                Target Paper #{currentSub.paper_number} · {currentSub.track_name}
              </span>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">{currentSub.title}</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {currentSub.keywords.map((k, idx) => (
                  <span key={idx} className="bg-white border border-blue-200 text-blue-800 text-[10px] px-2 py-0.5 rounded-md font-medium">
                    {k}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filterConflicts}
                  onChange={(e) => setFilterConflicts(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Hide Conflicted Reviewers</span>
              </label>
              <button
                onClick={runMatching}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
              >
                {isLoading ? 'Recalculating...' : 'Re-run Matching'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ranked Reviewers List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-600 px-1">
          <span className="font-bold uppercase tracking-wider">
            Ranked Reviewers ({rankedReviewers.length} Evaluated)
          </span>
          <span className="text-slate-400">Formula: 50% Expertise + 20% Keywords + 15% Track + 10% Workload + 5% Signals</span>
        </div>

        {rankedReviewers.map((match) => {
          const hasConflict = match.coi_status.has_conflict;

          return (
            <div
              key={match.reviewer.researcher_id}
              className={`bg-white rounded-2xl border p-5 transition shadow-2xs ${
                hasConflict
                  ? 'border-rose-200 bg-rose-50/20'
                  : match.total_score >= 75
                  ? 'border-emerald-200 hover:border-emerald-300'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                
                {/* Left: Reviewer Metadata */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-bold text-slate-900">{match.reviewer.name}</h4>
                    <span className="text-xs text-slate-500 font-mono font-medium">({match.reviewer.researcher_id})</span>
                    
                    {/* Recommendation Badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        hasConflict
                          ? 'bg-rose-100 text-rose-800'
                          : match.recommendation === 'HIGHLY_RECOMMENDED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {hasConflict ? 'CONFLICT OF INTEREST' : match.recommendation.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 mt-1">
                    {match.reviewer.department} · <strong>{match.reviewer.institution}</strong>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 font-mono">
                    <span>Scopus: <strong>{match.reviewer.scopus_author_id}</strong></span>
                    <span>h-index: <strong>{match.reviewer.h_index}</strong></span>
                    <span>Citations: <strong>{match.reviewer.total_citations}</strong></span>
                    <span>Workload: <strong>{match.reviewer.current_workload}/{match.reviewer.max_workload}</strong></span>
                  </div>

                  {/* COI Warning Callout */}
                  {hasConflict && (
                    <div className="mt-3 p-2.5 bg-rose-100/70 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2">
                      <AlertOctagon className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Conflict Reasons Detected:</strong>
                        <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                          {match.coi_status.reasons.map((r, rIdx) => (
                            <li key={rIdx}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* Center: Score Breakdown Bars */}
                <div className="w-full lg:w-72 bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-700">Overall Match:</span>
                    <span className={`text-sm font-mono ${hasConflict ? 'text-rose-700' : 'text-blue-700'}`}>
                      {match.total_score}%
                    </span>
                  </div>

                  <div className="space-y-1 text-[10px] text-slate-600">
                    <div className="flex justify-between">
                      <span>Expertise (50%)</span>
                      <span className="font-mono">{match.expertise_score}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: `${match.expertise_score}%` }}></div>
                    </div>

                    <div className="flex justify-between">
                      <span>Keywords (20%)</span>
                      <span className="font-mono">{match.keyword_score}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${match.keyword_score}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Right: Assign Button */}
                <div className="flex items-center lg:flex-col justify-end gap-2">
                  <button
                    onClick={() => handleAssign(match)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs ${
                      hasConflict
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {hasConflict ? 'Override & Assign' : 'Assign Reviewer'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
