import React, { useState } from 'react';
import { SessionSchedule } from '../types';
import { api } from '../services/api';
import { CalendarDays, Sparkles, MapPin, User, Clock, CheckCircle2, RefreshCw } from 'lucide-react';

interface ProgrammeSchedulerPageProps {
  sessions: SessionSchedule[];
  onRefresh: () => void;
}

export const ProgrammeSchedulerPage: React.FC<ProgrammeSchedulerPageProps> = ({
  sessions,
  onRefresh
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>('ALL');

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await api.generateSchedule();
      setNotice(`Generated ${res.count} conflict-free sessions across tracks and rooms!`);
      setTimeout(() => setNotice(null), 4000);
      onRefresh();
    } catch (err: any) {
      alert(`Schedule generation failed: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const dates = Array.from(new Set(sessions.map(s => s.session_date)));
  const filteredSessions = selectedDay === 'ALL' ? sessions : sessions.filter(s => s.session_date === selectedDay);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-600" />
            AI-Assisted Programme Scheduler & Timetable
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Constraint-satisfaction scheduling: enforces speaker conflict avoidance, track grouping, room capacity balancing, and session chair allocations.
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
        >
          <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Computing Schedule...' : 'Auto-Generate Schedule'}
        </button>
      </div>

      {notice && (
        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{notice}</span>
        </div>
      )}

      {/* Filter Tabs by Day */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSelectedDay('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
            selectedDay === 'ALL'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          All Days ({sessions.length} Sessions)
        </button>
        {dates.map((date) => (
          <button
            key={date}
            onClick={() => setSelectedDay(date)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedDay === date
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {date}
          </button>
        ))}
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredSessions.map((sess) => (
          <div
            key={sess.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 hover:border-blue-300 transition"
          >
            {/* Top Bar: Room & Time */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="bg-blue-50 text-blue-800 font-mono font-bold text-[11px] px-2 py-0.5 rounded">
                  {sess.track_name?.split('&')[0]?.trim() || 'Track'}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1.5">{sess.title}</h3>
              </div>

              <div className="text-right text-xs">
                <div className="flex items-center justify-end gap-1 text-slate-800 font-bold font-mono">
                  <Clock className="w-3.5 h-3.5 text-blue-600" /> {sess.start_time} - {sess.end_time}
                </div>
                <div className="text-slate-400 text-[10px] mt-0.5">{sess.session_date}</div>
              </div>
            </div>

            {/* Room & Session Chair */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-rose-600" /> Room
                </div>
                <div className="font-bold text-slate-800 mt-0.5 truncate">{sess.room}</div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <User className="w-3.5 h-3.5 text-blue-600" /> Session Chair
                </div>
                <div className="font-bold text-slate-800 mt-0.5 truncate">{sess.session_chair.name}</div>
              </div>
            </div>

            {/* Scheduled Presentation Papers */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Scheduled Presentations ({sess.papers.length})
              </span>

              {sess.papers.map((p, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-blue-50/40 rounded-xl border border-blue-100/70 text-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="font-mono font-bold text-blue-700 bg-white px-1.5 py-0.5 rounded border border-blue-200">
                      #{p.paper_number}
                    </span>
                    <span className="font-medium text-slate-800 truncate">{p.title}</span>
                  </div>
                  <span className="text-slate-500 font-mono text-[11px] whitespace-nowrap">
                    {p.presenter_name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
