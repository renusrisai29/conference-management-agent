import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Role } from '../types';
import {
  Shield, ShieldCheck, Lock, CheckCircle2, AlertTriangle, FileText,
  Clock, Download, Eye, EyeOff, Star, Check, ArrowRight, UserCheck, RefreshCw,
  Search, ChevronLeft, ChevronRight, X, BookOpen, AlertOctagon, FileCheck, Key
} from 'lucide-react';

interface ReviewerWorkspacePageProps {
  currentRole?: Role;
  currentUserEmail?: string;
  onRefresh?: () => void;
  onRoleChange?: (role: Role) => void;
}

interface ReviewerAccount {
  id: string;
  email: string;
  full_name: string;
  institution: string;
  department?: string;
  designation?: string;
  role: string;
  scopus_id?: string;
  orcid_id?: string;
  initials?: string;
}

// Institutional color gradients based on reviewer index or initials
const AVATAR_GRADIENTS = [
  'from-blue-700 to-indigo-900',
  'from-emerald-700 to-teal-900',
  'from-amber-600 to-orange-900',
  'from-rose-700 to-red-950',
  'from-purple-700 to-indigo-950',
  'from-cyan-700 to-blue-900'
];

export const ReviewerWorkspacePage: React.FC<ReviewerWorkspacePageProps> = ({
  currentRole = 'REVIEWER',
  currentUserEmail = 'reviewer1@oxford.ac.uk',
  onRefresh,
  onRoleChange
}) => {
  // Authentication State
  const [activeReviewerEmail, setActiveReviewerEmail] = useState<string>(() => {
    if (currentRole === 'REVIEWER' && currentUserEmail) {
      return currentUserEmail;
    }
    return '';
  });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(currentRole === 'REVIEWER');
  
  // Login Form State
  const [loginEmailInput, setLoginEmailInput] = useState<string>(() => {
    if (currentRole === 'REVIEWER' && currentUserEmail) {
      return currentUserEmail;
    }
    return '';
  });
  const [loginPasswordInput, setLoginPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  // Reviewer Directory State (Search & Pagination for all approved REVIEWER users)
  const [reviewerAccounts, setReviewerAccounts] = useState<ReviewerAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 4;

  // Reviewer Profile & Workspace Data
  const [reviewerProfile, setReviewerProfile] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState<boolean>(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  // Active Review Form Modal State
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [overallScore, setOverallScore] = useState<number>(8);
  const [confidence, setConfidence] = useState<number>(4);
  const [soundnessScore, setSoundnessScore] = useState<number>(4);
  const [originalityScore, setOriginalityScore] = useState<number>(4);
  const [presentationScore, setPresentationScore] = useState<number>(4);
  const [recommendation, setRecommendation] = useState<'ACCEPT' | 'MINOR_REVISION' | 'MAJOR_REVISION' | 'REJECT'>('ACCEPT');
  const [strengths, setStrengths] = useState<string>('');
  const [weaknesses, setWeaknesses] = useState<string>('');
  const [commentsToAuthor, setCommentsToAuthor] = useState<string>('');
  const [chairComments, setChairComments] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [isSubmittingFinal, setIsSubmittingFinal] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 1. Fetch All Approved Reviewer Accounts for Directory
  const loadReviewerAccounts = async () => {
    setIsLoadingAccounts(true);
    try {
      const res = await api.getReviewerAccounts();
      if (res.success && Array.isArray(res.reviewers)) {
        setReviewerAccounts(res.reviewers);
      }
    } catch (err) {
      console.warn('Could not load reviewer accounts directory:', err);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  useEffect(() => {
    loadReviewerAccounts();
  }, []);

  // 2. Load Reviewer Profile & Assignments for active reviewer
  const loadReviewerWorkspace = async (email: string) => {
    if (!email) return;
    setIsLoadingWorkspace(true);
    setWorkspaceError(null);
    try {
      // Fetch Profile with backend role verification
      const profRes = await api.getReviewerProfile(email);
      setReviewerProfile(profRes.user);

      // Fetch Assigned Papers for this reviewer only
      const asgnsRes = await api.getReviewerWorkspaceAssignments(email);
      setAssignments(asgnsRes.assignments || []);
      setIsLoggedIn(true);
    } catch (err: any) {
      setWorkspaceError(err.message || 'Failed to load reviewer workspace.');
      setIsLoggedIn(false);
    } finally {
      setIsLoadingWorkspace(false);
    }
  };

  useEffect(() => {
    if (activeReviewerEmail && currentRole === 'REVIEWER') {
      loadReviewerWorkspace(activeReviewerEmail);
    } else if (currentRole !== 'REVIEWER') {
      setIsLoggedIn(false);
    }
  }, [activeReviewerEmail, currentRole]);

  // Handle Reviewer Sign-In Submission
  const handleReviewerSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError(null);

    const email = loginEmailInput.trim();
    const password = loginPasswordInput.trim();

    // Required fields validation
    if (!email) {
      setLoginError('Please enter or select an authorized reviewer email address.');
      return;
    }

    if (!password) {
      setLoginError('Password is required. (Demo credential: Enter your Scopus ID).');
      return;
    }

    setIsAuthenticating(true);

    try {
      // Backend validates matching reviewer account and Scopus ID password
      const res = await api.reviewerLogin(email, password);
      if (res.success && res.user) {
        setActiveReviewerEmail(email);
        setReviewerProfile(res.user);
        setIsLoggedIn(true);
        setLoginPasswordInput(''); // Clear password from state after login
        if (onRoleChange) {
          onRoleChange('REVIEWER');
        }
        await loadReviewerWorkspace(email);
      }
    } catch (err: any) {
      // Do not expose, leak, or include the Scopus ID in error messages
      setLoginError(err.message || 'Authentication failed: Invalid credentials. Please check your email and password.');
      setIsLoggedIn(false);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Card Selection: Prefills email only, NEVER logs in automatically
  const handleSelectReviewerCard = (account: ReviewerAccount) => {
    setLoginEmailInput(account.email);
    setLoginPasswordInput('');
    setLoginError(null);
  };

  // Filtered & Paginated Reviewer Directory Accounts
  const filteredAccounts = reviewerAccounts.filter(acc => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      acc.full_name?.toLowerCase().includes(q) ||
      acc.institution?.toLowerCase().includes(q) ||
      acc.department?.toLowerCase().includes(q) ||
      acc.email?.toLowerCase().includes(q) ||
      acc.scopus_id?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredAccounts.length / pageSize) || 1;
  const paginatedAccounts = filteredAccounts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Open Review Form for an Assignment
  const handleOpenReviewForm = (assignmentItem: any) => {
    setSelectedAssignment(assignmentItem);
    setFormErrors({});
    setActionNotice(null);

    const existingReview = assignmentItem.review;
    if (existingReview) {
      setOverallScore(existingReview.overall_score || 8);
      setConfidence(existingReview.confidence || 4);
      setSoundnessScore(existingReview.soundness_score || 4);
      setOriginalityScore(existingReview.originality_score || 4);
      setPresentationScore(existingReview.presentation_score || 4);
      setRecommendation(existingReview.recommendation || 'ACCEPT');
      setStrengths(existingReview.strengths || '');
      setWeaknesses(existingReview.weaknesses || '');
      setCommentsToAuthor(existingReview.comments_to_author || '');
      setChairComments(existingReview.confidential_comments_to_chair || '');
    } else {
      setOverallScore(8);
      setConfidence(4);
      setSoundnessScore(4);
      setOriginalityScore(4);
      setPresentationScore(4);
      setRecommendation('ACCEPT');
      setStrengths('');
      setWeaknesses('');
      setCommentsToAuthor('');
      setChairComments('');
    }
  };

  // Save Review Draft
  const handleSaveDraft = async () => {
    if (!selectedAssignment) return;
    setIsSavingDraft(true);
    setFormErrors({});

    try {
      const payload = {
        is_draft: true,
        overall_score: overallScore,
        confidence,
        soundness_score: soundnessScore,
        originality_score: originalityScore,
        presentation_score: presentationScore,
        recommendation,
        strengths,
        weaknesses,
        comments_to_author: commentsToAuthor,
        confidential_comments_to_chair: chairComments
      };

      const res = await api.submitReviewerWorkspaceReview(
        selectedAssignment.assignment_id,
        payload,
        activeReviewerEmail
      );

      setActionNotice({ type: 'success', message: res.message || 'Draft saved successfully!' });
      await loadReviewerWorkspace(activeReviewerEmail);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Failed to save draft review.' });
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Submit Final Review
  const handleSubmitFinalReview = async () => {
    if (!selectedAssignment) return;

    // Validate Required Fields
    const errors: Record<string, string> = {};
    if (!strengths.trim() || strengths.trim().length < 5) {
      errors.strengths = 'Strengths assessment is required (minimum 5 characters).';
    }
    if (!weaknesses.trim() || weaknesses.trim().length < 5) {
      errors.weaknesses = 'Weaknesses assessment is required (minimum 5 characters).';
    }
    if (!commentsToAuthor.trim() || commentsToAuthor.trim().length < 5) {
      errors.commentsToAuthor = 'Comments to author are required (minimum 5 characters).';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmittingFinal(true);
    setFormErrors({});

    try {
      const payload = {
        is_draft: false,
        overall_score: overallScore,
        confidence,
        soundness_score: soundnessScore,
        originality_score: originalityScore,
        presentation_score: presentationScore,
        recommendation,
        strengths: strengths.trim(),
        weaknesses: weaknesses.trim(),
        comments_to_author: commentsToAuthor.trim(),
        confidential_comments_to_chair: chairComments.trim()
      };

      const res = await api.submitReviewerWorkspaceReview(
        selectedAssignment.assignment_id,
        payload,
        activeReviewerEmail
      );

      setActionNotice({
        type: 'success',
        message: res.message || 'Final review submitted successfully and locked from further edits.'
      });

      await loadReviewerWorkspace(activeReviewerEmail);
      if (onRefresh) onRefresh();

      setTimeout(() => {
        setSelectedAssignment(null);
        setActionNotice(null);
      }, 1800);
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Failed to submit final review.' });
    } finally {
      setIsSubmittingFinal(false);
    }
  };

  // Helper: Reviewer Initials Avatar Card
  const reviewerInitials = reviewerProfile?.full_name
    ? reviewerProfile.full_name
        .split(' ')
        .filter((p: string) => !['Dr.', 'Prof.', 'Mr.', 'Ms.'].includes(p))
        .map((p: string) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'RV';

  // ============================================================
  // VIEW 1: REVIEWER LOGIN GATE & DIRECTORY
  // ============================================================
  if (!isLoggedIn || currentRole !== 'REVIEWER') {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-4">
        {/* Header Banner */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-50 rounded-full blur-2xl pointer-events-none"></div>

          <div className="w-14 h-14 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-xs">
            <Lock className="w-7 h-7" />
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Peer Reviewer Portal Sign In
          </h2>
          <p className="text-sm text-slate-600 max-w-lg mx-auto mt-2 leading-relaxed">
            Authorized sign-in for accredited peer reviewers. Access is strictly scoped to your active assigned manuscripts with double-blind confidentiality.
          </p>

          {/* Role Check Warning (if non-reviewer role tries to enter) */}
          {currentRole && currentRole !== 'REVIEWER' && (
            <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl max-w-lg mx-auto flex items-start gap-2.5 text-left text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Active Role: {currentRole}</strong>
                <p className="text-amber-800 text-[11px] mt-0.5">
                  Authors, participants, session chairs, and organizers cannot access reviewer workspaces.
                  Sign in with an approved reviewer account below to enter.
                </p>
              </div>
            </div>
          )}

          {loginError && (
            <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl max-w-lg mx-auto flex items-center gap-2 text-xs text-rose-800 font-medium text-left">
              <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}
        </div>

        {/* 1. Reviewer Sign-In Form */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-600" />
              Reviewer Sign In Form
            </h3>
            <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Demo Credential: Scopus ID
            </span>
          </div>

          <form onSubmit={handleReviewerSignIn} className="space-y-4 text-xs">
            {/* Reviewer Institutional Email Input */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">
                Reviewer Institutional Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                placeholder="e.g. reviewer1@oxford.ac.uk, vrao@iitm.ac.in..."
                value={loginEmailInput}
                onChange={(e) => {
                  setLoginEmailInput(e.target.value);
                  setLoginError(null);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <p className="text-[11px] text-slate-500">
                Enter your reviewer account email or click any approved reviewer card from the directory below to populate.
              </p>
            </div>

            {/* Password Input (Validated against Scopus ID) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 block">
                  Password <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  Demo credential: Enter your Scopus ID
                </span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your Scopus ID password..."
                  value={loginPasswordInput}
                  onChange={(e) => {
                    setLoginPasswordInput(e.target.value);
                    setLoginError(null);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-xs text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Note: For this evaluation demo, sign-in validates against the reviewer's registered Scopus ID. Another reviewer's Scopus ID will fail authentication.
              </p>
            </div>

            {/* Sign In Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 rounded-xl shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials & Session...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Reviewer Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* 2. Approved Reviewer Directory (Search & Paginated List of All Approved Reviewers) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                Approved Reviewer Directory
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing all {filteredAccounts.length} approved users with the <span className="font-mono font-semibold text-blue-700">REVIEWER</span> role. Click a card to select and prefill their email.
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, institution, or Scopus..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset to first page on new search
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {isLoadingAccounts ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
              <p className="text-xs">Loading approved reviewer directory...</p>
            </div>
          ) : paginatedAccounts.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No reviewer accounts matched your search query.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginatedAccounts.map((acc, index) => {
                const isSelected = loginEmailInput.toLowerCase() === acc.email.toLowerCase();
                const gradient = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];

                return (
                  <div
                    key={acc.id || acc.email}
                    onClick={() => handleSelectReviewerCard(acc)}
                    className={`cursor-pointer text-left p-4 rounded-2xl border transition flex items-start gap-3.5 relative ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-blue-400 hover:shadow-xs bg-slate-50/40 hover:bg-white'
                    }`}
                  >
                    {/* Academic Avatar Monogram */}
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0 select-none`}>
                      {acc.initials || 'RV'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 text-sm truncate">
                          {acc.full_name}
                        </h4>
                        {isSelected && (
                          <span className="bg-blue-600 text-white p-0.5 rounded-full">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 truncate mt-0.5">{acc.institution}</p>
                      <p className="text-[11px] text-slate-500 truncate">{acc.department}</p>

                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-500 font-mono">
                        <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-semibold">
                          Scopus ID: {acc.scopus_id}
                        </span>
                        <span>•</span>
                        <span className="text-blue-700 font-bold">Select Account</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing page <strong className="text-slate-800">{currentPage}</strong> of <strong className="text-slate-800">{totalPages}</strong> ({filteredAccounts.length} reviewers)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // VIEW 2: LOGGED-IN REVIEWER WORKSPACE
  // ============================================================
  return (
    <div className="space-y-6">
      {/* 1. Reviewer Profile Banner with Academic Monogram & Verified Info */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {/* Reviewer Academic Display Picture / Monogram */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-900 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0 ring-4 ring-slate-50 select-none">
              {reviewerInitials}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {reviewerProfile?.full_name || 'Dr. Peer Reviewer'}
                </h2>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Verified Reviewer
                </span>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  ROLE: REVIEWER
                </span>
              </div>

              <p className="text-xs text-slate-600 font-medium mt-0.5">
                {reviewerProfile?.designation ? `${reviewerProfile.designation}, ` : ''}
                {reviewerProfile?.department || ''}
              </p>
              <p className="text-xs text-slate-500">
                {reviewerProfile?.institution || 'Academic Institution'} • <span className="font-mono">{reviewerProfile?.email}</span>
              </p>

              {/* Verified Registry Identifiers */}
              <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 font-mono">
                {reviewerProfile?.orcid_id && (
                  <span className="flex items-center gap-1">
                    <strong className="text-slate-700">ORCID:</strong> {reviewerProfile.orcid_id}
                  </span>
                )}
                {reviewerProfile?.scopus_id && (
                  <span className="flex items-center gap-1">
                    <strong className="text-slate-700">Scopus:</strong> {reviewerProfile.scopus_id}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions & Session Switcher */}
          <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
            <button
              onClick={() => loadReviewerWorkspace(activeReviewerEmail)}
              disabled={isLoadingWorkspace}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition border border-slate-200"
              title="Refresh Workspace"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingWorkspace ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <button
              onClick={() => {
                setIsLoggedIn(false);
                setLoginPasswordInput('');
                if (onRoleChange) onRoleChange('CHAIR');
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Sign Out / Switch Reviewer
            </button>
          </div>
        </div>

        {/* Double-Blind Protocol Shield Banner */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-2 text-blue-900 bg-blue-50/80 px-3.5 py-1.5 rounded-xl border border-blue-100">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-semibold">
              Double-Blind Peer Review Policy Enforced:
            </span>
            <span className="text-blue-800 text-[11px]">
              Author names, affiliations, email addresses, and reviewer identities are strictly anonymized and masked.
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
            <span>Assigned to You: <strong className="text-slate-900 font-bold">{assignments.length}</strong> papers</span>
            <span>Submitted: <strong className="text-emerald-700 font-bold">{assignments.filter(a => a.status === 'Submitted').length}</strong></span>
            <span>Pending: <strong className="text-amber-700 font-bold">{assignments.filter(a => a.status !== 'Submitted').length}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. Error Display */}
      {workspaceError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{workspaceError}</span>
        </div>
      )}

      {/* 3. Assigned Papers List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 text-base tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Your Assigned Manuscripts for Review
          </h3>
          <span className="text-xs text-slate-500">
            {assignments.length === 1 ? '1 manuscript active' : `${assignments.length} manuscripts active`}
          </span>
        </div>

        {isLoadingWorkspace ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 space-y-3 shadow-sm">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="text-xs font-semibold">Loading assigned manuscripts & review states...</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-600 space-y-3 shadow-sm">
            <FileText className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="font-bold text-slate-800 text-sm">No Active Manuscripts Assigned</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              There are currently no manuscripts assigned to your reviewer profile.
              You will be notified automatically when new papers matching your research expertise are allocated.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {assignments.map((item) => {
              const p = item.paper;
              const hasReview = Boolean(item.review);
              const isSubmitted = item.status === 'Submitted';

              return (
                <div
                  key={item.assignment_id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:border-blue-300 transition space-y-4"
                >
                  {/* Top Bar: Paper Number, Track, Status Pill */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-extrabold bg-slate-900 text-white px-2.5 py-1 rounded-lg">
                        Paper #{p?.paper_number || '---'}
                      </span>
                      <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                        {p?.track_name || 'General Track'}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        Match Affinity: {Number(item.match_score).toFixed(1)}%
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      {item.status === 'Submitted' && (
                        <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Submitted
                        </span>
                      )}
                      {item.status === 'In Progress' && (
                        <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          In Progress
                        </span>
                      )}
                      {item.status === 'Assigned' && (
                        <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          Assigned
                        </span>
                      )}
                      {item.status === 'Overdue' && (
                        <span className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-800 text-xs font-bold px-3 py-1 rounded-full shadow-2xs">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          Overdue
                        </span>
                      )}
                      {item.status === 'Reassigned' && (
                        <span className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1 rounded-full shadow-2xs">
                          Reassigned
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Anonymized Author Notice */}
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base leading-snug">
                      {p?.title || 'Untitled Manuscript'}
                    </h4>

                    {/* Double-Blind Author Anonymity Notice */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1">
                      <Shield className="w-3.5 h-3.5 text-slate-400" />
                      <span>Authors:</span>
                      <span className="italic text-slate-600 font-serif">
                        [Anonymized under Double-Blind Review Protocol]
                      </span>
                    </div>
                  </div>

                  {/* Abstract */}
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                    <strong className="text-slate-800">Abstract: </strong>
                    {p?.abstract || 'No abstract text available.'}
                  </p>

                  {/* Keywords */}
                  {p?.keywords && p.keywords.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-semibold text-slate-500">Keywords:</span>
                      {p.keywords.map((kw: string, i: number) => (
                        <span
                          key={i}
                          className="bg-slate-100 text-slate-700 text-[10px] font-medium px-2 py-0.5 rounded-md"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Deadlines & Review Summary */}
                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
                      <span>Assigned: {item.assigned_at?.slice(0, 10)}</span>
                      <span>•</span>
                      <span className={item.status === 'Overdue' ? 'text-rose-600 font-bold' : ''}>
                        Deadline: {item.due_date}
                      </span>
                    </div>

                    {/* Action Buttons: Open PDF & Review Form */}
                    <div className="flex items-center gap-2.5">
                      {/* Secure PDF Download/View */}
                      <a
                        href={api.getReviewerManuscriptUrl(p?.id, activeReviewerEmail)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-xl transition shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-600" />
                        <span>Download Manuscript PDF</span>
                      </a>

                      {/* Review Form Button */}
                      <button
                        onClick={() => handleOpenReviewForm(item)}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition shadow-xs ${
                          isSubmitted
                            ? 'bg-slate-800 hover:bg-slate-900 text-white'
                            : item.status === 'In Progress'
                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isSubmitted ? (
                          <>
                            <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>View Submitted Review</span>
                          </>
                        ) : item.status === 'In Progress' ? (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            <span>Continue Review</span>
                          </>
                        ) : (
                          <>
                            <Star className="w-3.5 h-3.5" />
                            <span>Start Review</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* If Review Submitted: Show Quick Summary */}
                  {hasReview && item.review.is_submitted && (
                    <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between text-xs text-emerald-900">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          <strong>Submitted Score:</strong> {item.review.overall_score}/10 •{' '}
                          <strong>Recommendation:</strong> {item.review.recommendation}
                        </span>
                      </div>
                      <span className="text-[11px] text-emerald-800 font-mono">
                        Locked • Submitted {item.review.submitted_at?.slice(0, 10)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. REVIEW FORM MODAL (Draft & Final Review Submission) */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-4 sm:p-8 shadow-2xl space-y-4 sm:space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-extrabold bg-blue-600 text-white px-2 py-0.5 rounded">
                    Paper #{selectedAssignment.paper?.paper_number}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {selectedAssignment.paper?.track_name}
                  </span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight mt-1">
                  Peer Review Evaluation Form
                </h3>
                <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                  {selectedAssignment.paper?.title}
                </p>
              </div>

              <button
                onClick={() => setSelectedAssignment(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification Banner */}
            {actionNotice && (
              <div
                className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 ${
                  actionNotice.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}
              >
                {actionNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="font-medium">{actionNotice.message}</span>
              </div>
            )}

            {/* Locked Notice (if review already finalized) */}
            {selectedAssignment.is_locked && (
              <div className="p-4 bg-slate-100 border border-slate-300 rounded-2xl text-xs text-slate-800 flex items-start gap-3">
                <Lock className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-slate-900">Review Finalized & Locked</strong>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    This evaluation has been committed to the conference database. Further modifications are locked to preserve review integrity. If changes are necessary, please contact the General Program Chair.
                  </p>
                </div>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-5 text-xs">
              {/* Overall Score (1 to 10) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs">
                    Overall Scientific Merit Score (1 – 10) <span className="text-rose-500">*</span>
                  </label>
                  <span className="font-extrabold text-sm text-blue-700 font-mono">
                    {overallScore} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  disabled={selectedAssignment.is_locked}
                  value={overallScore}
                  onChange={(e) => setOverallScore(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer disabled:opacity-50"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>1 (Definite Reject)</span>
                  <span>5 (Borderline)</span>
                  <span>8 (Strong Accept)</span>
                  <span>10 (Best Paper Nominee)</span>
                </div>
              </div>

              {/* Recommendation */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 text-xs">
                  Recommendation <span className="text-rose-500">*</span>
                </label>
                <select
                  disabled={selectedAssignment.is_locked}
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                >
                  <option value="ACCEPT">ACCEPT — Paper meets high quality bar with sound methodology</option>
                  <option value="MINOR_REVISION">MINOR_REVISION — Good contribution; requires minor clarifications</option>
                  <option value="MAJOR_REVISION">MAJOR_REVISION — Promising topic but requires significant restructuring</option>
                  <option value="REJECT">REJECT — Does not meet scientific rigor or scope requirements</option>
                </select>
              </div>

              {/* Strengths */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 text-xs flex items-center justify-between">
                  <span>Paper Strengths & Merits <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] font-normal text-slate-400">Required for final submission</span>
                </label>
                <textarea
                  rows={3}
                  disabled={selectedAssignment.is_locked}
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  placeholder="Outline key technical contributions, clarity of theorems, experimental evaluation on benchmarks..."
                  className={`w-full bg-slate-50 border rounded-xl p-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${
                    formErrors.strengths ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200'
                  }`}
                />
                {formErrors.strengths && (
                  <p className="text-[11px] text-rose-600 font-medium">{formErrors.strengths}</p>
                )}
              </div>

              {/* Weaknesses */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 text-xs flex items-center justify-between">
                  <span>Paper Weaknesses & Limitations <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] font-normal text-slate-400">Required for final submission</span>
                </label>
                <textarea
                  rows={3}
                  disabled={selectedAssignment.is_locked}
                  value={weaknesses}
                  onChange={(e) => setWeaknesses(e.target.value)}
                  placeholder="Note missing comparison baselines, unaddressed edge cases, questionable assumptions, or typos..."
                  className={`w-full bg-slate-50 border rounded-xl p-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${
                    formErrors.weaknesses ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200'
                  }`}
                />
                {formErrors.weaknesses && (
                  <p className="text-[11px] text-rose-600 font-medium">{formErrors.weaknesses}</p>
                )}
              </div>

              {/* Comments to Author */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs">
                    Detailed Comments to Author <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded">
                    Author-Visible upon decision
                  </span>
                </div>
                <textarea
                  rows={4}
                  disabled={selectedAssignment.is_locked}
                  value={commentsToAuthor}
                  onChange={(e) => setCommentsToAuthor(e.target.value)}
                  placeholder="Constructive feedback to help authors improve their manuscript. Do NOT include your name or affiliation."
                  className={`w-full bg-slate-50 border rounded-xl p-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${
                    formErrors.commentsToAuthor ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200'
                  }`}
                />
                {formErrors.commentsToAuthor && (
                  <p className="text-[11px] text-rose-600 font-medium">{formErrors.commentsToAuthor}</p>
                )}
              </div>

              {/* Confidential Comments to Chair */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Confidential Comments to General / Track Chairs</span>
                  </label>
                  <span className="text-[10px] text-amber-800 font-medium bg-amber-50 px-2 py-0.5 rounded">
                    Chair-Only • Never shown to authors
                  </span>
                </div>
                <textarea
                  rows={2}
                  disabled={selectedAssignment.is_locked}
                  value={chairComments}
                  onChange={(e) => setChairComments(e.target.value)}
                  placeholder="Private remarks for the Program Committee (e.g. best paper nomination, ethical/integrity concerns)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
              <button
                onClick={() => setSelectedAssignment(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Close
              </button>

              {!selectedAssignment.is_locked && (
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleSaveDraft}
                    disabled={isSavingDraft || isSubmittingFinal}
                    className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition border border-slate-300 disabled:opacity-50"
                  >
                    {isSavingDraft ? 'Saving Draft...' : 'Save Draft'}
                  </button>

                  <button
                    onClick={handleSubmitFinalReview}
                    disabled={isSavingDraft || isSubmittingFinal}
                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmittingFinal ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Submit Final Review</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
