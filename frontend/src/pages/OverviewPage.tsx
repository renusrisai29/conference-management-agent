import React, { useState } from 'react';
import { Conference, Track, Role } from '../types';
import { api } from '../services/api';
import {
  Calendar, MapPin, Globe, Shield, BookOpen, Clock,
  CheckCircle2, Edit3, Save, X, Plus, Layers, FileCheck, Lock
} from 'lucide-react';

interface OverviewPageProps {
  conference: Conference | null;
  currentRole?: Role;
  onRefresh: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ conference, currentRole = 'CHAIR', onRefresh }) => {
  const isAuthorized = currentRole === 'ADMIN' || currentRole === 'CHAIR' || currentRole === 'ORGANIZER';
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Conference>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Add track sub-form state
  const [newTrackName, setNewTrackName] = useState('');
  const [newTrackCode, setNewTrackCode] = useState('');
  const [newTrackTopics, setNewTrackTopics] = useState('');
  const [showAddTrack, setShowAddTrack] = useState(false);

  if (!conference) {
    return <div className="p-8 text-center text-slate-500">Loading conference parameters...</div>;
  }

  const handleEdit = () => {
    setFormData({
      name: conference.name,
      acronym: conference.acronym,
      theme: conference.theme,
      venue: conference.venue,
      mode: conference.mode,
      max_pages: conference.max_pages,
      submission_format: conference.submission_format,
      review_model: conference.review_model,
      acceptance_policy: conference.acceptance_policy,
      dates: conference.dates ? { ...conference.dates } : undefined,
      tracks: conference.tracks ? [...conference.tracks] : []
    });
    setIsEditing(true);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateConference(conference.id, formData, currentRole);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to update conference: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTrack = () => {
    if (!newTrackName.trim() || !newTrackCode.trim()) return;
    const newTrack: Track = {
      id: `trk-custom-${Date.now().toString().slice(-4)}`,
      conference_id: conference.id,
      name: newTrackName.trim(),
      code: newTrackCode.trim().toUpperCase(),
      description: `Track focused on ${newTrackName.trim()}`,
      topics: newTrackTopics.split(',').map(t => t.trim()).filter(Boolean)
    };
    setFormData(prev => ({
      ...prev,
      tracks: [...(prev.tracks || []), newTrack]
    }));
    setNewTrackName('');
    setNewTrackCode('');
    setNewTrackTopics('');
    setShowAddTrack(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {conference.acronym}
              </span>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Status: {conference.status}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">{conference.name}</h2>
            <p className="text-slate-600 text-sm mt-1">{conference.theme}</p>
          </div>

          <div className="flex items-center gap-2">
            {isAuthorized ? (
              <button
                onClick={handleEdit}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm"
              >
                <Edit3 className="w-4 h-4" /> Configure Conference
              </button>
            ) : (
              <button
                disabled
                className="flex items-center gap-1.5 bg-slate-100 text-slate-400 text-xs font-semibold px-4 py-2 rounded-xl cursor-not-allowed"
                title="Only Administrators, Chairs, or Organizers can configure conference parameters"
              >
                <Lock className="w-4 h-4" /> Configure Conference (Admin Only)
              </button>
            )}
          </div>
        </div>

        {saveSuccess && (
          <div className="mt-3 p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-200">
            Conference configuration saved and synced with PostgreSQL.
          </div>
        )}

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <div className="text-xs text-slate-500 font-medium">Institution & Venue</div>
              <div className="text-sm font-semibold text-slate-800">{conference.institution}</div>
              <div className="text-xs text-slate-600 mt-0.5">{conference.venue} ({conference.mode})</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <Shield className="w-5 h-5 text-indigo-600 mt-0.5" />
            <div>
              <div className="text-xs text-slate-500 font-medium">Review Model & Limits</div>
              <div className="text-sm font-semibold text-slate-800">{conference.review_model} Review</div>
              <div className="text-xs text-slate-600 mt-0.5">Max {conference.max_pages} pages ({conference.submission_format})</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <Globe className="w-5 h-5 text-teal-600 mt-0.5" />
            <div>
              <div className="text-xs text-slate-500 font-medium">Portal & Proceedings</div>
              <a href={conference.website_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-600 hover:underline">
                vignan.ac.in/agentic-ai-2026
              </a>
              <div className="text-xs text-slate-600 mt-0.5">ISBN: <span className="font-mono">{conference.isbn || 'ISBN pending'}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Important Dates Timeline */}
      {conference.dates && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-blue-600" />
            Author & Reviewer Deadlines
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'CFP Open', date: conference.dates.cfp_open_date, highlight: false },
              { label: 'Submissions Due', date: conference.dates.submission_deadline, highlight: true },
              { label: 'Reviews Due', date: conference.dates.review_deadline, highlight: false },
              { label: 'Notifications', date: conference.dates.notification_date, highlight: true },
              { label: 'Camera Ready', date: conference.dates.camera_ready_deadline, highlight: false },
              { label: 'Conference Days', date: `${conference.dates.conference_start_date}`, highlight: true }
            ].map((item, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-center ${
                  item.highlight
                    ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="text-[11px] font-semibold text-slate-500">{item.label}</div>
                <div className="text-xs sm:text-sm font-bold mt-1 font-mono">{item.date}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conference Tracks */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-blue-600" />
          Configured Academic Tracks
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(conference.tracks || []).map((track) => (
            <div key={track.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-700 font-mono bg-blue-50 px-2 py-0.5 rounded">
                  {track.code}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 mt-2">{track.name}</h4>
              <p className="text-xs text-slate-600 mt-1">{track.description}</p>
              
              <div className="mt-3 flex flex-wrap gap-1.5">
                {track.topics.map((top, tIdx) => (
                  <span key={tIdx} className="text-[11px] bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                    {top}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conference Configuration Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Conference Configuration & Policies
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure tracks, deadlines, submission guidelines, review model, and acceptance policy.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Section 1: Review Model & Acceptance Policy */}
              <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/80 space-y-3">
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  Review Model & Acceptance Policy
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Review Model *
                    </label>
                    <select
                      value={formData.review_model || 'DOUBLE_BLIND'}
                      onChange={(e) => setFormData(prev => ({ ...prev, review_model: e.target.value as any }))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-blue-500 text-slate-800 text-xs"
                    >
                      <option value="DOUBLE_BLIND">Double-Blind (Authors & Reviewers anonymized)</option>
                      <option value="SINGLE_BLIND">Single-Blind (Reviewers know Author identities)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Enforces academic blind review protocol for reviewer matching.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Acceptance Policy *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.acceptance_policy || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, acceptance_policy: e.target.value }))}
                      placeholder="e.g. MIN_2_ACCEPT_NO_REJECT"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-blue-500 text-slate-800 text-xs"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Rule for automated decision recommendations.
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Submission Format Requirements & Guidelines */}
              <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/80 space-y-3">
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-blue-600" />
                  Submission Format Requirements & Guidelines
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Submission Format *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.submission_format || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, submission_format: e.target.value }))}
                      placeholder="e.g. IEEE Double Column PDF"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-blue-500 text-slate-800 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Max Page Limit (pages) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      required
                      value={formData.max_pages || 8}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_pages: Number(e.target.value) }))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-blue-500 text-slate-800 text-xs"
                    />
                  </div>
                </div>

                <div className="bg-blue-50/60 rounded-lg p-2.5 border border-blue-200/70 text-[11px] text-blue-950">
                  <span className="font-bold">Guidelines & Template:</span> Standard IEEE 2-column format, 4–8 pages, mandatory PDF manuscript upload, IEEE numeric citations [1], [2], structured sections.
                </div>
              </div>

              {/* Section 3: Important Dates */}
              <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/80 space-y-3">
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  Important Deadlines
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">CFP Open Date</label>
                    <input
                      type="date"
                      value={formData.dates?.cfp_open_date || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        dates: { ...(prev.dates as any), cfp_open_date: e.target.value }
                      }))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 outline-none focus:border-blue-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">Submissions Due</label>
                    <input
                      type="date"
                      value={formData.dates?.submission_deadline || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        dates: { ...(prev.dates as any), submission_deadline: e.target.value }
                      }))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 outline-none focus:border-blue-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">Reviews Due</label>
                    <input
                      type="date"
                      value={formData.dates?.review_deadline || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        dates: { ...(prev.dates as any), review_deadline: e.target.value }
                      }))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 outline-none focus:border-blue-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">Notification Date</label>
                    <input
                      type="date"
                      value={formData.dates?.notification_date || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        dates: { ...(prev.dates as any), notification_date: e.target.value }
                      }))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 outline-none focus:border-blue-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">Camera Ready Due</label>
                    <input
                      type="date"
                      value={formData.dates?.camera_ready_deadline || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        dates: { ...(prev.dates as any), camera_ready_deadline: e.target.value }
                      }))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 outline-none focus:border-blue-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">Conference Start</label>
                    <input
                      type="date"
                      value={formData.dates?.conference_start_date || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        dates: { ...(prev.dates as any), conference_start_date: e.target.value }
                      }))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 outline-none focus:border-blue-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Conference Tracks */}
              <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Conference Tracks ({(formData.tracks || []).length} active)
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddTrack(!showAddTrack)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Track
                  </button>
                </div>

                {showAddTrack && (
                  <div className="bg-white p-3 rounded-xl border border-blue-200 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Track Code (e.g. TRK-07)"
                        value={newTrackCode}
                        onChange={(e) => setNewTrackCode(e.target.value)}
                        className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Track Name"
                        value={newTrackName}
                        onChange={(e) => setNewTrackName(e.target.value)}
                        className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-500"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Topics (comma separated)"
                      value={newTrackTopics}
                      onChange={(e) => setNewTrackTopics(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddTrack(false)}
                        className="px-2.5 py-1 text-slate-500 text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddTrack}
                        className="px-3 py-1 bg-blue-600 text-white font-semibold rounded-lg text-xs"
                      >
                        Add to Tracks
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {(formData.tracks || []).map((t, idx) => (
                    <span key={idx} className="bg-white border border-slate-200 text-slate-700 text-[11px] px-2 py-0.5 rounded font-medium">
                      <strong>{t.code}:</strong> {t.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving Configuration...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
