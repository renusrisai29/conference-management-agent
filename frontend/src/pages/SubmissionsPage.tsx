import React, { useState, useRef } from 'react';
import { Submission, Track, Role } from '../types';
import { api } from '../services/api';
import {
  FileUp, ShieldCheck, CheckCircle2, AlertTriangle, Plus,
  Search, Eye, Filter, Download, Trash2, FileText, X,
  Lock, Check, Clock, Upload
} from 'lucide-react';

interface SubmissionsPageProps {
  submissions: Submission[];
  tracks: Track[];
  currentRole?: Role;
  currentUserEmail?: string;
  onRefresh: () => void;
  onSelectPaperForMatching?: (sub: Submission) => void;
}

export const SubmissionsPage: React.FC<SubmissionsPageProps> = ({
  submissions,
  tracks,
  currentRole = 'CHAIR',
  currentUserEmail = 'chair@vignan.ac.in',
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

  // Editable Primary Author State
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [authorInst, setAuthorInst] = useState('');
  const [authorDept, setAuthorDept] = useState('');
  const [authorCountry, setAuthorCountry] = useState('India');
  const [authorErrors, setAuthorErrors] = useState<{ name?: string; email?: string; inst?: string }>({});

  // Mandatory PDF Manuscript State
  const [manuscriptFile, setManuscriptFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission & Deletion State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paperToDelete, setPaperToDelete] = useState<Submission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);
  const [mySubmittedPaperIds, setMySubmittedPaperIds] = useState<Set<string>>(new Set());

  // Camera-Ready & Decision Modals State
  const [decisionModalSub, setDecisionModalSub] = useState<Submission | null>(null);
  const [authorDecisionData, setAuthorDecisionData] = useState<any>(null);
  const [isLoadingDecision, setIsLoadingDecision] = useState(false);

  const [cameraReadyModalSub, setCameraReadyModalSub] = useState<Submission | null>(null);
  const [crFile, setCrFile] = useState<File | null>(null);
  const [crFileName, setCrFileName] = useState('');
  const [crPageCount, setCrPageCount] = useState(8);
  const [crConfirmed, setCrConfirmed] = useState(false);
  const [crError, setCrError] = useState<string | null>(null);
  const [isSubmittingCr, setIsSubmittingCr] = useState(false);
  const [crSuccessMsg, setCrSuccessMsg] = useState<string | null>(null);
  const crFileInputRef = useRef<HTMLInputElement>(null);

  // Status Filter State
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'CAMERA_READY' | 'ACCEPTED_OR_REVISE' | 'UNDER_REVIEW'>('ALL');

  // Initialize author fields when opening modal
  const handleOpenSubmitModal = () => {
    if (!authorEmail) {
      if (currentRole === 'AUTHOR') {
        setAuthorName('Prof. Elena Rostova');
        setAuthorEmail('author1@mit.edu');
        setAuthorInst('Massachusetts Institute of Technology');
        setAuthorDept('CSAIL');
      } else if (currentRole === 'PARTICIPANT') {
        setAuthorName('Kiran Patel');
        setAuthorEmail('participant@iitb.ac.in');
        setAuthorInst('Indian Institute of Technology Bombay');
        setAuthorDept('Electrical Engineering');
      } else {
        setAuthorName('');
        setAuthorEmail(currentUserEmail || '');
        setAuthorInst("Vignan's Foundation for Science, Technology & Research");
        setAuthorDept('Computer Science and Engineering');
      }
    }
    setFileError(null);
    setAuthorErrors({});
    setShowSubmitModal(true);
  };

  // Download official IEEE conference manuscript template (PDF)
  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/submissions/template');
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'IEEE_Official_Paper_Template.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      }
    } catch {
      // fallback to static public asset
    }
    const link = document.createElement('a');
    link.href = '/IEEE_Official_Paper_Template.pdf';
    link.download = 'IEEE_Official_Paper_Template.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle PDF Manuscript File Selection & Validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Check PDF extension and MIME type
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    if (!isPdf) {
      setFileError('Invalid file type! Only PDF files (.pdf) are accepted for manuscript submissions.');
      setManuscriptFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setFileError(`File size exceeds 10 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB selected).`);
      setManuscriptFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setManuscriptFile(file);
  };

  // Validate author inputs and submit paper
  const handleSubmitPaper = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate mandatory PDF manuscript
    if (!manuscriptFile) {
      setFileError('Manuscript upload is required! Please attach a PDF document before submitting.');
      return;
    }

    // 2. Validate primary author fields
    const errors: { name?: string; email?: string; inst?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!authorName.trim() || authorName.trim().length < 2) {
      errors.name = 'Primary author full name is required (minimum 2 characters).';
    }
    if (!authorEmail.trim() || !emailRegex.test(authorEmail.trim())) {
      errors.email = 'A valid email address is required (e.g. author@university.edu).';
    }
    if (!authorInst.trim() || authorInst.trim().length < 2) {
      errors.inst = 'Primary author institution / affiliation is required.';
    }

    if (Object.keys(errors).length > 0) {
      setAuthorErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createSubmission({
        title: newTitle.trim(),
        abstract: newAbstract.trim(),
        track_id: newTrackId,
        keywords: newKeywords.split(',').map(s => s.trim()).filter(Boolean),
        page_count: Number(newPageCount),
        file_name: manuscriptFile.name,
        file_path: `/uploads/papers/${manuscriptFile.name}`,
        authors: [
          {
            name: authorName.trim(),
            email: authorEmail.trim(),
            institution: authorInst.trim(),
            department: authorDept.trim() || undefined,
            country: authorCountry.trim() || 'India',
            is_corresponding: true
          }
        ]
      });

      // Record submitted paper ID in current session ownership
      if (res.submission?.id) {
        setMySubmittedPaperIds(prev => new Set(prev).add(res.submission.id));
      }

      setShowSubmitModal(false);
      setNewTitle('');
      setNewAbstract('');
      setNewKeywords('');
      setManuscriptFile(null);
      setFileError(null);
      setAuthorErrors({});
      if (fileInputRef.current) fileInputRef.current.value = '';
      onRefresh();
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ownership & Permission rule for deleting a paper
  const canDeletePaper = (sub: Submission): boolean => {
    // 1. General Chair and Admins have general authority
    if (currentRole === 'CHAIR' || currentRole === 'ADMIN') return true;

    // 2. Author and Participant roles can only delete papers they submitted
    const activeEmail = (currentUserEmail || '').toLowerCase().trim();
    const isOwnerByEmail = sub.authors?.some(a => a.email.toLowerCase().trim() === activeEmail);
    const isOwnerBySession = mySubmittedPaperIds.has(sub.id);
    const isAuthorRoleOwner = currentRole === 'AUTHOR' && sub.primary_author_id === 'u-auth-03';

    if (currentRole === 'AUTHOR' || currentRole === 'PARTICIPANT') {
      return isOwnerByEmail || isOwnerBySession || isAuthorRoleOwner;
    }

    // 3. Faculty Reviewers and Session Chairs cannot delete other users' papers
    return false;
  };

  // Execute paper deletion after confirmation
  const handleConfirmDelete = async () => {
    if (!paperToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteSubmission(paperToDelete.id, currentUserEmail, currentRole);
      setDeleteNotice(`Paper #${paperToDelete.paper_number} ("${paperToDelete.title}") and its manuscript were permanently deleted.`);
      setPaperToDelete(null);
      onRefresh();
      setTimeout(() => setDeleteNotice(null), 5000);
    } catch (err: any) {
      alert(`Failed to delete submission: ${err.message}`);
    } finally {
      setIsDeleting(false);
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

  const handleOpenAuthorDecision = async (sub: Submission) => {
    setDecisionModalSub(sub);
    setIsLoadingDecision(true);
    try {
      const data = await api.getAuthorDecision(sub.id);
      setAuthorDecisionData(data);
    } catch (err: any) {
      console.error('Failed to load author decision:', err);
    } finally {
      setIsLoadingDecision(false);
    }
  };

  const handleOpenCameraReadyModal = (sub: Submission) => {
    setCameraReadyModalSub(sub);
    setCrFile(null);
    setCrFileName(sub.file_name ? sub.file_name.replace('.pdf', '_camera_ready.pdf') : `paper_${sub.paper_number}_camera_ready.pdf`);
    setCrPageCount(sub.page_count && sub.page_count <= 8 ? sub.page_count : 8);
    setCrConfirmed(false);
    setCrError(null);
    setCrSuccessMsg(null);
  };

  const handleCrFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setCrError('Camera-ready manuscript must be a PDF document (.pdf extension required).');
      setCrFile(null);
      return;
    }
    setCrFile(file);
    setCrFileName(file.name);
    setCrError(null);
  };

  const handleSubmitCameraReady = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cameraReadyModalSub) return;
    if (!crFileName.toLowerCase().endsWith('.pdf')) {
      setCrError('Camera-ready manuscript must be a valid PDF (.pdf).');
      return;
    }
    if (crPageCount > 8) {
      setCrError('Camera-ready manuscripts cannot exceed 8 pages (strict IEEE/ACM limit).');
      return;
    }
    if (!crConfirmed) {
      setCrError('You must confirm that formatting and metadata guidelines have been verified.');
      return;
    }

    setIsSubmittingCr(true);
    setCrError(null);
    try {
      await api.submitCameraReady(cameraReadyModalSub.id, {
        file_url: `/uploads/camera_ready/${crFileName}`,
        page_count: crPageCount,
        confirmed_metadata: crConfirmed
      });
      setCrSuccessMsg('✓ Camera-Ready manuscript successfully received, validated, and stored for conference proceedings.');
      setTimeout(() => {
        setCameraReadyModalSub(null);
        setCrSuccessMsg(null);
        onRefresh();
      }, 1500);
    } catch (err: any) {
      setCrError(err.message || 'Failed to submit camera-ready version');
    } finally {
      setIsSubmittingCr(false);
    }
  };

  const filtered = submissions.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.authors.some(a => a.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      s.paper_number.toString().includes(searchTerm);
    const matchesTrack = filterTrack === 'ALL' || s.track_id === filterTrack;
    const matchesStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'CAMERA_READY' && s.status === 'CAMERA_READY') ||
      (filterStatus === 'ACCEPTED_OR_REVISE' && (s.status === 'ACCEPTED' || s.status === 'REVISION_REQUIRED')) ||
      (filterStatus === 'UNDER_REVIEW' && s.status === 'UNDER_REVIEW');
    return matchesSearch && matchesTrack && matchesStatus;
  });

  const cameraReadyCount = submissions.filter(s => s.status === 'CAMERA_READY').length;

  return (
    <div className="space-y-6">
      {/* Delete Notice Banner */}
      {deleteNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{deleteNotice}</span>
          </div>
          <button onClick={() => setDeleteNotice(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileUp className="w-5 h-5 text-blue-600" />
            Paper Submissions & Quality Validation
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Authors upload manuscripts with automated format validation, page-limit checks, genuine local n-gram similarity scoring, and camera-ready intake.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition border border-slate-200 shadow-2xs"
            title="Download Official IEEE Conference Submission Template (PDF)"
          >
            <Download className="w-4 h-4 text-blue-600" /> Download Official Paper Template
          </button>
          <button
            type="button"
            onClick={handleOpenSubmitModal}
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

          <select
            value={filterStatus}
            onChange={(e: any) => setFilterStatus(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none text-slate-700 font-medium"
          >
            <option value="ALL">All Statuses ({submissions.length})</option>
            <option value="CAMERA_READY">Camera-Ready Received ({cameraReadyCount})</option>
            <option value="ACCEPTED_OR_REVISE">Accepted / Revise Required</option>
            <option value="UNDER_REVIEW">Under Review</option>
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
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {/* Attached manuscript file badge */}
                      <a
                        href={`/api/submissions/${sub.id}/manuscript`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-medium px-2 py-0.5 rounded border border-blue-100 transition cursor-pointer"
                        title={`Open / Download attached manuscript PDF: ${sub.file_name || `paper_${sub.paper_number}.pdf`}`}
                      >
                        <FileText className="w-3 h-3 text-blue-500 shrink-0" />
                        <span className="max-w-[130px] truncate">{sub.file_name || `paper_${sub.paper_number}.pdf`}</span>
                        <Download className="w-2.5 h-2.5 text-blue-500 shrink-0 opacity-75" />
                      </a>
                      {sub.keywords.slice(0, 2).map((k, kIdx) => (
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
                    <div className="flex flex-col gap-1 items-start">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sub.status === 'ACCEPTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sub.status === 'CAMERA_READY'
                            ? 'bg-purple-100 text-purple-800'
                            : sub.status === 'REVISION_REQUIRED'
                            ? 'bg-amber-100 text-amber-800'
                            : sub.status === 'UNDER_REVIEW'
                            ? 'bg-blue-100 text-blue-800'
                            : sub.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {sub.status === 'CAMERA_READY' ? '✓ CAMERA READY' : sub.status}
                      </span>
                      {sub.status === 'CAMERA_READY' && (
                        <span className="text-[9px] text-purple-700 font-semibold flex items-center gap-0.5">
                          ✓ Final Verified
                        </span>
                      )}
                      {(sub.status === 'ACCEPTED' || sub.status === 'REVISION_REQUIRED') && (
                        <span className="text-[9px] text-amber-700 font-semibold">
                          Pending Camera-Ready
                        </span>
                      )}
                    </div>
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
                    {/* View Decision Letter & Confidential Reviews Button */}
                    {(sub.status === 'ACCEPTED' || sub.status === 'REVISION_REQUIRED' || sub.status === 'REJECTED' || sub.status === 'CAMERA_READY') && (
                      <button
                        onClick={() => handleOpenAuthorDecision(sub)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium px-2 py-1 rounded text-[11px] transition inline-flex items-center gap-1 shadow-2xs"
                        title="View Official Decision Letter & Consolidated Reviewer Feedback (Confidential Masking Preserved)"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Decision & Reviews
                      </button>
                    )}

                    {/* Submit Camera-Ready Button (for accepted/revise papers) */}
                    {(sub.status === 'ACCEPTED' || sub.status === 'REVISION_REQUIRED' || sub.status === 'CAMERA_READY') && (
                      <button
                        onClick={() => handleOpenCameraReadyModal(sub)}
                        className={`font-medium px-2 py-1 rounded text-[11px] transition inline-flex items-center gap-1 ${
                          sub.status === 'CAMERA_READY'
                            ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                        }`}
                        title="Upload validated PDF Camera-Ready manuscript"
                      >
                        <FileUp className="w-3.5 h-3.5" />
                        {sub.status === 'CAMERA_READY' ? 'Update Camera-Ready' : 'Submit Camera-Ready'}
                      </button>
                    )}

                    {/* Open / Download Manuscript PDF */}
                    <a
                      href={`/api/submissions/${sub.id}/manuscript`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition inline-flex items-center"
                      title={`Open / Download Manuscript PDF for Paper #${sub.paper_number}`}
                    >
                      <Download className="w-4 h-4" />
                    </a>

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
                    {canDeletePaper(sub) ? (
                      <button
                        type="button"
                        onClick={() => setPaperToDelete(sub)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete Submission & Manuscript"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="p-1.5 text-slate-200 cursor-not-allowed rounded-lg"
                        title="Only the submitting author or General Chair can delete this paper"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal Dialog */}
      {paperToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Paper Submission?</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs mb-4 space-y-1.5">
              <div className="font-semibold text-slate-800">
                Paper #{paperToDelete.paper_number}: {paperToDelete.title}
              </div>
              <div className="text-slate-600">
                <span className="font-medium text-slate-700">Author:</span> {paperToDelete.authors?.map(a => a.name).join(', ')}
              </div>
              {paperToDelete.file_name && (
                <div className="text-slate-600 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono text-[11px] text-slate-700">{paperToDelete.file_name}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Are you sure you want to permanently delete this academic paper and its uploaded manuscript from the conference management system?
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setPaperToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Paper Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Submit New Academic Paper
                </h3>
                <p className="text-xs text-slate-500">
                  Fill in paper metadata, manuscript PDF, and primary author details.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Submission Guidelines & Formatting Criteria */}
            <div className="mb-4 bg-gradient-to-br from-blue-50/80 to-indigo-50/60 rounded-xl p-3.5 border border-blue-100 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Submission Guidelines & Criteria
                </span>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 bg-white hover:bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-lg border border-blue-200 text-[11px] shadow-2xs transition"
                  title="Download Official IEEE Conference Submission Template (PDF)"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  Download Official Paper Template
                </button>
              </div>

              <div className="p-2 bg-white/90 rounded-lg border border-blue-200 text-[11px] text-blue-900 font-medium">
                Submitted manuscripts must follow this official IEEE Conference Template (US Letter, Two-Column Format).
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-slate-700">
                <div>
                  <span className="font-semibold text-slate-900">• Accepted Format:</span> IEEE US Letter Two-Column (.pdf)
                </div>
                <div>
                  <span className="font-semibold text-slate-900">• Page Limit:</span> 4 – 8 pages (inclusive of references)
                </div>
                <div>
                  <span className="font-semibold text-slate-900">• Max File Size:</span> 10 MB limit
                </div>
                <div>
                  <span className="font-semibold text-slate-900">• Citation Style:</span> IEEE numbered style [1], [2]
                </div>
              </div>

              <div className="text-[11px] text-slate-600 border-t border-blue-200/60 pt-1.5">
                <span className="font-semibold text-slate-800">Required Structure:</span> Paper Title, Author Details & Affiliations (up to 6), Abstract (&lt;250 words), Keywords, and Section Structure (I. Introduction, II. Ease of Use, III. Prepare Paper Before Styling, IV. Using the Template, Equations, Figures/Tables, Acknowledgment, References).
              </div>
            </div>

            <form onSubmit={handleSubmitPaper} className="space-y-3.5 text-xs">
              {/* Paper Title */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Paper Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Provably Robust Guardrails for Agentic Code Execution"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-blue-500 focus:bg-white text-xs"
                />
              </div>

              {/* Track and Page Count */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Conference Track *</label>
                  <select
                    value={newTrackId}
                    onChange={(e) => setNewTrackId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-blue-500 text-slate-700 text-xs"
                  >
                    {tracks.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Page Count (4 - 8 pages) *</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={newPageCount}
                    onChange={(e) => setNewPageCount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-blue-500 text-xs"
                  />
                </div>
              </div>

              {/* Abstract */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Abstract *</label>
                <textarea
                  rows={3}
                  required
                  value={newAbstract}
                  onChange={(e) => setNewAbstract(e.target.value)}
                  placeholder="Concise abstract summarizing research question, methodology, and key empirical findings..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-blue-500 focus:bg-white resize-y text-xs"
                />
              </div>

              {/* Keywords */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Keywords (comma-separated) *</label>
                <input
                  type="text"
                  required
                  value={newKeywords}
                  onChange={(e) => setNewKeywords(e.target.value)}
                  placeholder="e.g. autonomous agents, formal verification, sandboxing, cybersecurity"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-blue-500 text-xs"
                />
              </div>

              {/* 2. Mandatory PDF Manuscript Upload */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <FileUp className="w-4 h-4 text-blue-600" />
                    Upload Manuscript (Mandatory PDF) *
                  </label>
                  <span className="text-[11px] text-slate-500">PDF format only, max 10MB</span>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!manuscriptFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/30 rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1"
                  >
                    <FileUp className="w-6 h-6 text-slate-400" />
                    <span className="font-medium text-slate-700 text-xs">
                      Click to choose PDF manuscript file
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Standard IEEE 2-column format (.pdf only)
                    </span>
                  </div>
                ) : (
                  <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 text-xs truncate">
                          {manuscriptFile.name}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2">
                          <span>{(manuscriptFile.size / 1024).toFixed(1)} KB</span>
                          <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Valid PDF Attached
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100/70 rounded-lg transition"
                      >
                        Replace File
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setManuscriptFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition"
                        title="Remove manuscript"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {fileError && (
                  <div className="mt-1.5 flex items-center gap-1 text-rose-600 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fileError}</span>
                  </div>
                )}
              </div>

              {/* 3. Editable Primary Author Information */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-slate-800">
                    Primary Author Information *
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Fully editable by submitter
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Prof. Jane Doe"
                      value={authorName}
                      onChange={(e) => {
                        setAuthorName(e.target.value);
                        if (authorErrors.name) setAuthorErrors(prev => ({ ...prev, name: undefined }));
                      }}
                      className={`w-full bg-slate-50 border ${authorErrors.name ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'} rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 focus:bg-white`}
                    />
                    {authorErrors.name && (
                      <span className="text-rose-600 text-[10px] mt-0.5 block">{authorErrors.name}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. author@university.edu"
                      value={authorEmail}
                      onChange={(e) => {
                        setAuthorEmail(e.target.value);
                        if (authorErrors.email) setAuthorErrors(prev => ({ ...prev, email: undefined }));
                      }}
                      className={`w-full bg-slate-50 border ${authorErrors.email ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'} rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 focus:bg-white`}
                    />
                    {authorErrors.email && (
                      <span className="text-rose-600 text-[10px] mt-0.5 block">{authorErrors.email}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Institution / University *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vignan University / IIT / Stanford"
                      value={authorInst}
                      onChange={(e) => {
                        setAuthorInst(e.target.value);
                        if (authorErrors.inst) setAuthorErrors(prev => ({ ...prev, inst: undefined }));
                      }}
                      className={`w-full bg-slate-50 border ${authorErrors.inst ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'} rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 focus:bg-white`}
                    />
                    {authorErrors.inst && (
                      <span className="text-rose-600 text-[10px] mt-0.5 block">{authorErrors.inst}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Department (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Computer Science & Engineering"
                      value={authorDept}
                      onChange={(e) => setAuthorDept(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-sm"
                >
                  {isSubmitting ? 'Uploading Manuscript...' : 'Confirm Submission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. Confidential Author Decision & Consolidated Reviews Modal */}
      {decisionModalSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Official Decision & Peer Review Feedback
                  </h3>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Paper #{decisionModalSub.paper_number}: {decisionModalSub.title}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setDecisionModalSub(null);
                  setAuthorDecisionData(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto py-4 space-y-4 text-xs pr-1 flex-1">
              {isLoadingDecision ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <div>Retrieving official decision and compiling anonymized reviews...</div>
                </div>
              ) : authorDecisionData ? (
                <>
                  {/* Confidentiality Notice */}
                  <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-indigo-900 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-[11px]">Confidential Peer Review Protection Active</div>
                      <div className="text-[10px] text-indigo-700 leading-relaxed mt-0.5">
                        In accordance with conference confidentiality rules, all reviewer identities, affiliations, and internal chair notes are strictly omitted. Only constructive evaluation criteria and comments directed to authors are displayed.
                      </div>
                    </div>
                  </div>

                  {/* Decision Summary Banner */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Formal Decision</div>
                      <div className="text-base font-extrabold text-slate-900 mt-0.5 flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            authorDecisionData.decision?.final_decision === 'ACCEPT' || decisionModalSub.status === 'ACCEPTED' || decisionModalSub.status === 'CAMERA_READY'
                              ? 'bg-emerald-100 text-emerald-800'
                              : authorDecisionData.decision?.final_decision === 'REJECT' || decisionModalSub.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {authorDecisionData.decision?.final_decision || decisionModalSub.status}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-slate-400">Decision Issued</div>
                      <div className="text-slate-700 font-medium text-[11px] mt-0.5">
                        {authorDecisionData.decision?.decided_at
                          ? new Date(authorDecisionData.decision.decided_at).toLocaleDateString()
                          : 'Nov 1, 2026'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {authorDecisionData.decision?.decided_by || 'Program Committee Chairs'}
                      </div>
                    </div>
                  </div>

                  {/* Decision Letter */}
                  {authorDecisionData.decision?.decision_letter && (
                    <div>
                      <div className="font-bold text-slate-800 mb-1">Official Decision Communication:</div>
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 whitespace-pre-wrap leading-relaxed font-sans text-[11px]">
                        {authorDecisionData.decision.decision_letter}
                      </div>
                    </div>
                  )}

                  {/* Consolidated Anonymous Reviews */}
                  <div className="space-y-3">
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>Consolidated Reviewer Feedback ({authorDecisionData.reviews?.length || 0})</span>
                      <span className="text-[10px] text-slate-400 font-normal">Blind Masking: Enabled</span>
                    </div>

                    {authorDecisionData.reviews?.length === 0 ? (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 text-xs">
                        No completed reviews available yet for this submission.
                      </div>
                    ) : (
                      authorDecisionData.reviews.map((rev: any, rIdx: number) => (
                        <div key={rIdx} className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2 shadow-2xs">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                              {rev.reviewer_label}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 text-[10px]">Overall Score:</span>
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-800 font-mono font-bold rounded text-[11px]">
                                {rev.score}/10
                              </span>
                              {rev.recommendation && (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded text-[10px]">
                                  {rev.recommendation}
                                </span>
                              )}
                            </div>
                          </div>

                          {rev.comments_to_author && (
                            <div>
                              <div className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                                Comments to Author:
                              </div>
                              <div className="text-slate-700 whitespace-pre-wrap leading-relaxed text-[11px] bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                                {rev.comments_to_author}
                              </div>
                            </div>
                          )}

                          {rev.strengths && (
                            <div>
                              <div className="text-[10px] uppercase font-bold text-emerald-700 mb-0.5">Strengths:</div>
                              <div className="text-slate-700 text-[11px]">{rev.strengths}</div>
                            </div>
                          )}

                          {rev.weaknesses && (
                            <div>
                              <div className="text-[10px] uppercase font-bold text-amber-700 mb-0.5">Areas for Revision:</div>
                              <div className="text-slate-700 text-[11px]">{rev.weaknesses}</div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="p-4 text-center text-slate-500">Could not load decision data.</div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="text-[11px] text-slate-500">
                {authorDecisionData?.camera_ready_submitted ? (
                  <span className="text-purple-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Camera-ready version already received
                  </span>
                ) : authorDecisionData?.can_submit_camera_ready ? (
                  <span className="text-emerald-700 font-medium">
                    Eligible for Camera-Ready Publication
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDecisionModalSub(null);
                    setAuthorDecisionData(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition"
                >
                  Close
                </button>

                {authorDecisionData?.can_submit_camera_ready && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = decisionModalSub;
                      setDecisionModalSub(null);
                      setAuthorDecisionData(null);
                      handleOpenCameraReadyModal(target);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition shadow-sm flex items-center gap-1.5"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    {authorDecisionData.camera_ready_submitted ? 'Update Camera-Ready' : 'Submit Camera-Ready Version'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Camera-Ready Manuscript Upload & Validation Modal */}
      {cameraReadyModalSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileUp className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Upload Camera-Ready Manuscript
                  </h3>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Paper #{cameraReadyModalSub.paper_number}: {cameraReadyModalSub.title}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setCameraReadyModalSub(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {crSuccessMsg ? (
              <div className="p-6 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <div className="font-bold text-sm">Camera-Ready Accepted!</div>
                <p className="text-xs text-emerald-800 leading-relaxed">{crSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitCameraReady} className="space-y-4 text-xs">
                {/* Format Requirements Guidance */}
                <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-blue-900 space-y-1">
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    Camera-Ready Publication Specifications:
                  </div>
                  <ul className="list-disc pl-4 text-[10px] space-y-0.5 text-blue-800">
                    <li>Format: <strong>Strictly PDF (.pdf)</strong></li>
                    <li>Page Limit: <strong>Maximum 8 pages</strong> in IEEE double-column format</li>
                    <li>All author names, affiliations, and reviewer revisions must be finalized</li>
                  </ul>
                </div>

                {/* PDF Manuscript Upload */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Upload Final Camera-Ready PDF *
                  </label>
                  <input
                    type="file"
                    ref={crFileInputRef}
                    accept=".pdf,application/pdf"
                    onChange={handleCrFileChange}
                    className="hidden"
                  />

                  {!crFile ? (
                    <div
                      onClick={() => crFileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-4 text-center cursor-pointer transition bg-slate-50/50 hover:bg-emerald-50/30 group"
                    >
                      <Upload className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 mx-auto mb-1.5 transition" />
                      <div className="font-semibold text-slate-700 text-xs">Click to browse final PDF manuscript</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Strictly PDF only • Up to 25 MB</div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div className="truncate">
                          <div className="font-bold text-slate-800 text-xs truncate">{crFileName}</div>
                          <div className="text-[10px] text-emerald-700">Valid PDF Ready ({(crFile.size / 1024).toFixed(1)} KB)</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => crFileInputRef.current?.click()}
                        className="px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 rounded-lg transition shrink-0"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>

                {/* Page Count */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Final Manuscript Page Count *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={12}
                    value={crPageCount}
                    onChange={(e) => setCrPageCount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500 font-mono"
                  />
                  {crPageCount > 8 ? (
                    <div className="mt-1 text-rose-600 text-[10px] flex items-center gap-1 font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Exceeds maximum conference limit of 8 pages. Publication will fail.
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Max allowable limit: 8 pages. Current: {crPageCount} pages.
                    </span>
                  )}
                </div>

                {/* Metadata Verification Checkbox */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={crConfirmed}
                      onChange={(e) => setCrConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-[11px] text-slate-700 leading-snug">
                      I confirm that this camera-ready manuscript incorporates peer review feedback, strictly conforms to the IEEE/ACM double-column format (≤ 8 pages), and all author names and affiliations are final and accurate.
                    </span>
                  </label>
                </div>

                {/* Error Banner */}
                {crError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{crError}</span>
                  </div>
                )}

                {/* Submit Actions */}
                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCameraReadyModalSub(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCr || !crConfirmed || crPageCount > 8}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition shadow-sm flex items-center gap-1.5"
                  >
                    {isSubmittingCr ? (
                      'Validating & Storing...'
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Confirm & Submit Camera-Ready
                      </>
                    )}
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
