import React, { useState } from 'react';
import { Conference } from '../types';
import { api } from '../services/api';
import { Calendar, MapPin, Globe, Shield, BookOpen, Clock, CheckCircle2, Edit3, Save } from 'lucide-react';

interface OverviewPageProps {
  conference: Conference | null;
  onRefresh: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ conference, onRefresh }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Conference>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

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
      review_model: conference.review_model,
      acceptance_policy: conference.acceptance_policy
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await api.updateConference(conference.id, formData);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to update conference: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
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
            <h2 className="text-2xl font-extrabold text-slate-900 mt-2">{conference.name}</h2>
            <p className="text-slate-600 text-sm mt-1">{conference.theme}</p>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm"
              >
                <Save className="w-4 h-4" /> Save Configuration
              </button>
            ) : (
              <button
                onClick={handleEdit}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 rounded-xl transition"
              >
                <Edit3 className="w-4 h-4" /> Edit Configuration
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
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
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
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
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
    </div>
  );
};
