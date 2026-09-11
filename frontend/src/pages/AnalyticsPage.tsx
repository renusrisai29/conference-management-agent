import React, { useState, useEffect } from 'react';
import { ConferenceAnalytics } from '../types';
import { api } from '../services/api';
import { BarChart3, TrendingUp, Users, DollarSign, Award, BookOpen, Download, CheckCircle2 } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<ConferenceAnalytics | null>(null);
  const [downloadReport, setDownloadReport] = useState(false);

  useEffect(() => {
    api.getAnalytics().then(setAnalytics).catch(console.error);
  }, []);

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
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
    </div>
  );
};
