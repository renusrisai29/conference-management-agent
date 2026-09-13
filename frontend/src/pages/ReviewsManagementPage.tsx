import React, { useState } from 'react';
import { Review, ReviewerAssignment, Submission, Role } from '../types';
import { api } from '../services/api';
import {
  ClipboardList, AlertTriangle, CheckCircle2, MessageSquare, Star, Plus,
  Bell, Clock, UserCheck, ShieldAlert, RefreshCw, AlertOctagon, Lock, UserX
} from 'lucide-react';

interface ReviewsManagementPageProps {
  submissions: Submission[];
  assignments: ReviewerAssignment[];
  reviews: Review[];
  currentRole?: Role;
  onRefresh: () => void;
}

export const ReviewsManagementPage: React.FC<ReviewsManagementPageProps> = ({
  submissions,
  assignments,
  reviews,
  currentRole = 'CHAIR',
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

  // Review Cycle Action States
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [reassigningAssignment, setReassigningAssignment] = useState<ReviewerAssignment | null>(null);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [selectedNewReviewerId, setSelectedNewReviewerId] = useState<string>('');
  const [isReassigning, setIsReassigning] = useState(false);
  const [reassignError, setReassignError] = useState<string | null>(null);

  const isChairOrAdmin = ['CHAIR', 'ORGANIZER', 'ADMIN'].includes(currentRole);

  const isAssignmentOverdue = (a: ReviewerAssignment) => {
    if (a.status === 'COMPLETED' || a.status === 'DECLINED') return false;
    return new Date(a.due_date) < new Date();
  };

  const totalAssigned = assignments.length;
  const completedAssignments = assignments.filter(a => a.status === 'COMPLETED').length;
  const overdueAssignments = assignments.filter(a => isAssignmentOverdue(a));
  const pendingAssignments = assignments.filter(a => a.status === 'ASSIGNED' && !isAssignmentOverdue(a));

  const handleSendReminder = async (assignment: ReviewerAssignment) => {
    setRemindingId(assignment.id);
    try {
      const res = await api.sendReviewReminder(assignment.id);
      setActionNotice(`Reminder simulated & dispatched to ${assignment.reviewer_name} (Status: ${res.delivery_status})`);
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      alert(`Failed to send reminder: ${err.message}`);
    } finally {
      setRemindingId(null);
    }
  };

  const openReassignModal = async (assignment: ReviewerAssignment) => {
    setReassigningAssignment(assignment);
    setReassignError(null);
    try {
      const res = await api.getFacultyResearchers();
      setFacultyList(res.researchers || []);
      const eligible = (res.researchers || []).filter((r: any) => r.researcher_id !== assignment.reviewer_id);
      if (eligible.length > 0) {
        setSelectedNewReviewerId(eligible[0].researcher_id);
      }
    } catch (err: any) {
      console.error('Failed to load faculty researchers:', err);
    }
  };

  const handleConfirmReassign = async () => {
    if (!reassigningAssignment || !selectedNewReviewerId) return;
    setIsReassigning(true);
    setReassignError(null);
    try {
      const chosen = facultyList.find(f => f.researcher_id === selectedNewReviewerId);
      const res = await api.reassignReviewer(reassigningAssignment.id, {
        new_reviewer_id: selectedNewReviewerId,
        new_reviewer_name: chosen?.name,
        new_reviewer_institution: chosen?.institution
      });

      setActionNotice(res.message);
      setTimeout(() => setActionNotice(null), 5000);
      setReassigningAssignment(null);
      onRefresh();
    } catch (err: any) {
      setReassignError(err.message);
    } finally {
      setIsReassigning(false);
    }
  };

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

  // If user is Author or Participant, enforce double-blind confidentiality
  if (!isChairOrAdmin && currentRole !== 'REVIEWER') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Double-Blind Peer Review Confidentiality</h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
          Active review cycle assignments, reviewer identities, and evaluation scores are strictly blinded to authors and participants. Consolidated anonymous reviews and official editorial decisions will be transmitted upon chair confirmation.
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
            <ClipboardList className="w-5 h-5 text-blue-600" />
            Review Management & Review-Cycle Tracking
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Tracks peer evaluations, monitors overdue submissions, simulates automated reminders, and enables conflict-checked reviewer reassignments.
          </p>
        </div>

        <button
          onClick={() => setShowSubmitModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Submit Peer Review
        </button>
      </div>

      {actionNotice && (
        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Review Cycle Monitoring Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Assignments</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{totalAssigned}</div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Peer reviewers tasked</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">Completed Reviews</span>
          <div className="text-xl font-extrabold text-emerald-700 mt-1">{completedAssignments}</div>
          <span className="text-[10px] text-emerald-600/80 mt-0.5 block">Submitted & verified</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">In Progress</span>
          <div className="text-xl font-extrabold text-blue-700 mt-1">{pendingAssignments.length}</div>
          <span className="text-[10px] text-blue-600/80 mt-0.5 block">Within deadline window</span>
        </div>

        <div className={`p-4 rounded-xl border shadow-2xs ${
          overdueAssignments.length > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'
        }`}>
          <span className={`text-[11px] font-semibold uppercase tracking-wider block ${
            overdueAssignments.length > 0 ? 'text-rose-800' : 'text-slate-500'
          }`}>
            Overdue / Missing
          </span>
          <div className={`text-xl font-extrabold mt-1 ${
            overdueAssignments.length > 0 ? 'text-rose-700' : 'text-slate-900'
          }`}>
            {overdueAssignments.length}
          </div>
          <span className={`text-[10px] mt-0.5 block ${
            overdueAssignments.length > 0 ? 'text-rose-600' : 'text-slate-400'
          }`}>
            Requires chair action
          </span>
        </div>
      </div>

      {/* Reviewer Assignments Monitoring Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Assigned Reviewers & Review-Cycle Monitor ({assignments.length})
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Monitor active deadlines, dispatch review reminders, or reassign defaulting reviewers.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Target Paper</th>
                <th className="py-3 px-4">Assigned Reviewer</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Review Status</th>
                <th className="py-3 px-4 text-right">Chair Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignments.map((asgn) => {
                const sub = submissions.find(s => s.id === asgn.submission_id);
                const overdue = isAssignmentOverdue(asgn);

                return (
                  <tr key={asgn.id} className={`hover:bg-slate-50/70 transition ${overdue ? 'bg-rose-50/30' : ''}`}>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">Paper #{sub?.paper_number || 'N/A'}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 max-w-xs">{sub?.title}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{asgn.reviewer_name}</div>
                      <div className="text-[11px] text-slate-500">{asgn.reviewer_institution}</div>
                      <div className="mt-1">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          asgn.assignment_source === 'AUTOMATIC' || asgn.match_details?.assignment_source === 'AUTOMATIC'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {asgn.assignment_source === 'AUTOMATIC' || asgn.match_details?.assignment_source === 'AUTOMATIC'
                            ? `🤖 Automatically assigned by agent at ${asgn.match_details?.trigger_time_ist || asgn.assigned_at}`
                            : `✋ Manual chair assignment at ${asgn.match_details?.trigger_time_ist || asgn.assigned_at}`}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {asgn.due_date}
                    </td>

                    <td className="py-3.5 px-4">
                      {asgn.status === 'COMPLETED' ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> COMPLETED
                        </span>
                      ) : overdue ? (
                        <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" /> OVERDUE / LATE
                        </span>
                      ) : asgn.status === 'DECLINED' ? (
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <UserX className="w-3 h-3" /> DEFAULTED / REASSIGNED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" /> PENDING
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {asgn.status !== 'COMPLETED' && asgn.status !== 'DECLINED' && (
                          <>
                            <button
                              onClick={() => handleSendReminder(asgn)}
                              disabled={remindingId === asgn.id}
                              title="Simulate/dispatch review deadline reminder"
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition flex items-center gap-1"
                            >
                              <Bell className="w-3 h-3 text-blue-600" />
                              {remindingId === asgn.id ? 'Sending...' : 'Send Reminder'}
                            </button>

                            <button
                              onClick={() => openReassignModal(asgn)}
                              title="Reassign paper to an eligible reviewer"
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-semibold transition flex items-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Reassign
                            </button>
                          </>
                        )}
                        {asgn.status === 'COMPLETED' && (
                          <span className="text-emerald-700 text-[11px] font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Reviewed
                          </span>
                        )}
                        {asgn.status === 'DECLINED' && (
                          <span className="text-slate-400 text-[11px] italic">Reassigned</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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

                {isChairOrAdmin && rev.confidential_comments_to_chair && (
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 mt-2">
                    <strong>Confidential to Chair:</strong> {rev.confidential_comments_to_chair}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Review Reassignment Modal with COI Protection */}
      {reassigningAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <RefreshCw className="w-5 h-5 text-rose-600" />
              <h3 className="text-base font-bold text-slate-900">
                Reassign Reviewer with COI Verification
              </h3>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div>
                <strong>Original Reviewer:</strong> {reassigningAssignment.reviewer_name} ({reassigningAssignment.reviewer_institution})
              </div>
              <div>
                <strong>Due Date:</strong> {reassigningAssignment.due_date} (
                {isAssignmentOverdue(reassigningAssignment) ? 'Defaulted / Overdue' : 'Pending'}
                )
              </div>
            </div>

            {reassignError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Reassignment Blocked:</strong>
                  <p className="mt-0.5">{reassignError}</p>
                </div>
              </div>
            )}

            <div className="text-xs space-y-2">
              <label className="font-semibold text-slate-700 block">Select Replacement Reviewer *</label>
              <select
                value={selectedNewReviewerId}
                onChange={(e) => setSelectedNewReviewerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
              >
                {facultyList
                  .filter(f => f.researcher_id !== reassigningAssignment.reviewer_id)
                  .map(f => (
                    <option key={f.researcher_id} value={f.researcher_id}>
                      {f.name} — {f.department}, {f.institution} (h-index: {f.h_index})
                    </option>
                  ))}
              </select>
              <span className="text-[11px] text-slate-500 block">
                The system automatically evaluates institutional affiliation and recent 36-month co-authorship rules before confirming reassignment.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReassigningAssignment(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReassign}
                disabled={isReassigning}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isReassigning ? 'animate-spin' : ''}`} />
                {isReassigning ? 'Verifying COI...' : 'Confirm Reassignment'}
              </button>
            </div>
          </div>
        </div>
      )}

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
