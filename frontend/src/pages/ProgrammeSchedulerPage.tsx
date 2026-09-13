import React, { useState, useEffect } from 'react';
import { SessionSchedule } from '../types';
import { api } from '../services/api';
import {
  CalendarDays, Sparkles, MapPin, User, Clock, CheckCircle2,
  Filter, Calendar, CheckCircle
} from 'lucide-react';

interface ProgrammeSchedulerPageProps {
  sessions: SessionSchedule[];
  onRefresh: () => void;
}

export type SessionStatus = 'ONGOING' | 'UPCOMING' | 'PAST' | 'COMPLETED';

/**
 * Calculates session status dynamically from the actual current date and time in IST (Asia/Kolkata).
 * Does not hardcode "Ongoing".
 * Session on 15 September 2026 shows Ongoing only while actual IST time is between start_time and end_time.
 */
export function getSessionStatus(session: SessionSchedule, referenceTime: Date = new Date()): SessionStatus {
  try {
    const nowMs = referenceTime.getTime();

    const parseTimeTo24h = (tStr: string) => {
      const clean = (tStr || '').trim();
      if (clean.includes('AM') || clean.includes('PM')) {
        const [timePart, modifier] = clean.split(/\s+/);
        let [hours, minutes = '00', seconds = '00'] = timePart.split(':');
        let h = parseInt(hours, 10);
        if (modifier.toUpperCase() === 'PM' && h < 12) h += 12;
        if (modifier.toUpperCase() === 'AM' && h === 12) h = 0;
        return `${String(h).padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
      }
      const parts = clean.split(':');
      const h = (parts[0] || '00').padStart(2, '0');
      const m = (parts[1] || '00').padStart(2, '0');
      const s = (parts[2] || '00').padStart(2, '0');
      return `${h}:${m}:${s}`;
    };

    const start24 = parseTimeTo24h(session.start_time);
    const end24 = parseTimeTo24h(session.end_time);

    const dateStr = session.session_date.trim();
    const startIso = `${dateStr}T${start24}+05:30`;
    const endIso = `${dateStr}T${end24}+05:30`;

    const startMs = new Date(startIso).getTime();
    const endMs = new Date(endIso).getTime();

    if (isNaN(startMs) || isNaN(endMs)) {
      return 'UPCOMING';
    }

    if (nowMs < startMs) {
      return 'UPCOMING';
    } else if (nowMs > endMs) {
      return 'PAST';
    } else {
      return 'ONGOING';
    }
  } catch {
    return 'UPCOMING';
  }
}

export const ProgrammeSchedulerPage: React.FC<ProgrammeSchedulerPageProps> = ({
  sessions,
  onRefresh
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Live IST Clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

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

  const currentIstString = currentTime.toLocaleString('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const dates = Array.from(new Set(sessions.map(s => s.session_date))).sort();

  // Compute status for all sessions dynamically using live IST
  const sessionStatusMap = new Map<string, SessionStatus>();
  sessions.forEach(s => {
    sessionStatusMap.set(s.id, getSessionStatus(s, currentTime));
  });

  const ongoingCount = sessions.filter(s => sessionStatusMap.get(s.id) === 'ONGOING').length;
  const upcomingCount = sessions.filter(s => sessionStatusMap.get(s.id) === 'UPCOMING').length;
  const pastCount = sessions.filter(s => sessionStatusMap.get(s.id) === 'PAST' || sessionStatusMap.get(s.id) === 'COMPLETED').length;

  const filteredSessions = sessions.filter(s => {
    const matchesDay = selectedDay === 'ALL' || s.session_date === selectedDay;
    const st = sessionStatusMap.get(s.id);
    const matchesStatus =
      selectedStatus === 'ALL' ||
      st === selectedStatus ||
      (selectedStatus === 'PAST' && st === 'COMPLETED') ||
      (selectedStatus === 'COMPLETED' && st === 'PAST');
    return matchesDay && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-600" />
            Conference Programme & Timetable
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Complete schedule view across tracks, venues, session chairs, and accepted papers with live IST dynamic status tracking.
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

      {/* Live Conference Clock & Status Summary */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-slate-300">Live Conference Clock (IST · Asia/Kolkata):</span>
          <span className="font-mono font-bold text-emerald-400 text-sm">{currentIstString}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 px-2.5 py-1 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <strong>{ongoingCount}</strong> Ongoing
          </span>
          <span className="flex items-center gap-1.5 bg-blue-950/80 text-blue-300 border border-blue-700/60 px-2.5 py-1 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <strong>{upcomingCount}</strong> Upcoming
          </span>
          <span className="flex items-center gap-1.5 bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            <strong>{pastCount}</strong> Past
          </span>
        </div>
      </div>

      {notice && (
        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{notice}</span>
        </div>
      )}

      {/* Filter Controls: Status Tabs & Day Tabs */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Status:
          </span>
          <button
            onClick={() => setSelectedStatus('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedStatus === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            All ({sessions.length})
          </button>
          <button
            onClick={() => setSelectedStatus('ONGOING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              selectedStatus === 'ONGOING'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Ongoing ({ongoingCount})
          </button>
          <button
            onClick={() => setSelectedStatus('UPCOMING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              selectedStatus === 'UPCOMING'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200'
            }`}
          >
            <Clock className="w-3 h-3" />
            Upcoming ({upcomingCount})
          </button>
          <button
            onClick={() => setSelectedStatus('PAST')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              selectedStatus === 'PAST'
                ? 'bg-slate-600 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <CheckCircle className="w-3 h-3" />
            Past ({pastCount})
          </button>
        </div>

        {/* Day Filter Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Date:
          </span>
          <button
            onClick={() => setSelectedDay('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedDay === 'ALL'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            All Dates
          </button>
          {dates.map((date) => (
            <button
              key={date}
              onClick={() => setSelectedDay(date)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedDay === date
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {date}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredSessions.map((sess) => {
          const status = sessionStatusMap.get(sess.id) || 'UPCOMING';

          return (
            <div
              key={sess.id}
              className={`bg-white rounded-2xl border p-5 shadow-sm space-y-4 transition ${
                status === 'ONGOING'
                  ? 'border-emerald-300 ring-2 ring-emerald-100/80 shadow-emerald-50'
                  : status === 'UPCOMING'
                  ? 'border-blue-200 hover:border-blue-300'
                  : 'border-slate-200 opacity-90'
              }`}
            >
              {/* Top Bar: Room, Track, Status, and Time */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-blue-50 text-blue-800 font-semibold text-[11px] px-2.5 py-0.5 rounded-lg border border-blue-200">
                      {sess.track_name || 'General Track'}
                    </span>

                    {/* Dynamic Status Badge (calculated live in IST) */}
                    {status === 'ONGOING' && (
                      <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                        ONGOING (Live Now)
                      </span>
                    )}
                    {status === 'UPCOMING' && (
                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                        <Clock className="w-3 h-3 text-blue-600" />
                        UPCOMING
                      </span>
                    )}
                    {(status === 'PAST' || status === 'COMPLETED') && (
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-slate-200">
                        <CheckCircle2 className="w-3 h-3 text-slate-400" />
                        COMPLETED (Past)
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{sess.title}</h3>
                </div>

                <div className="text-right text-xs shrink-0 pl-2">
                  <div className="flex items-center justify-end gap-1 text-slate-900 font-bold font-mono">
                    <Clock className="w-3.5 h-3.5 text-blue-600" /> {sess.start_time} - {sess.end_time} IST
                  </div>
                  <div className="text-slate-500 font-medium text-[11px] mt-0.5">
                    {sess.session_date}
                  </div>
                </div>
              </div>

              {/* Room & Session Chair */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" /> Room / Venue
                  </div>
                  <div className="font-bold text-slate-800 mt-0.5 truncate">{sess.room}</div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px]">
                    <User className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Session Chair
                  </div>
                  <div className="font-bold text-slate-800 mt-0.5 truncate">{sess.session_chair.name}</div>
                  {sess.session_chair.institution && (
                    <div className="text-slate-400 text-[10px] truncate">{sess.session_chair.institution}</div>
                  )}
                </div>
              </div>

              {/* Scheduled Presentation Papers */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Scheduled Presentations ({sess.papers.length} {sess.papers.length === 1 ? 'Paper' : 'Papers'})</span>
                  <span className="text-[10px] text-blue-600 font-normal">All times in IST (Asia/Kolkata)</span>
                </div>

                {sess.papers.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50/80 hover:bg-blue-50/50 rounded-xl border border-slate-200/80 transition space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200 text-xs shrink-0">
                          #{p.paper_number}
                        </span>
                        <span className="font-bold text-slate-900 text-xs">{p.title}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100/80 text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-500">Presenter:</span>
                        <span className="font-semibold text-slate-800">{p.presenter_name}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="text-slate-500">Slot:</span>
                        <span className="font-bold text-blue-700">{p.start_time} - {p.end_time} IST</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {filteredSessions.length === 0 && (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          No sessions found matching the selected filter criteria.
        </div>
      )}
    </div>
  );
};
