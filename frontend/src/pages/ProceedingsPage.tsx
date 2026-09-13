import React, { useState, useEffect } from 'react';
import { ProceedingsRecord, EventArchiveRecord } from '../types';
import { api } from '../services/api';
import { BookMarked, Sparkles, CheckCircle2, AlertCircle, Save, FileText, Archive, Download, ShieldCheck, Database, Layers } from 'lucide-react';

interface ProceedingsPageProps {
  proceedings: ProceedingsRecord | null;
  onRefresh: () => void;
}

export const ProceedingsPage: React.FC<ProceedingsPageProps> = ({
  proceedings,
  onRefresh
}) => {
  const [isbnInput, setIsbnInput] = useState(proceedings?.isbn || 'ISBN pending');
  const [isCompiling, setIsCompiling] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Event Archive state
  const [archives, setArchives] = useState<EventArchiveRecord[]>([]);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveNotice, setArchiveNotice] = useState<string | null>(null);

  useEffect(() => {
    api.getEventArchives().then(setArchives).catch(console.error);
  }, []);

  const handleCreateArchive = async () => {
    setIsArchiving(true);
    try {
      const res = await api.createEventArchive({ archived_by: 'Dr. Radhika Sharma (General Chair)' });
      setArchiveNotice(`Event archive #${res.archive.id} created with SHA-256 integrity checksum: ${res.archive.checksum.slice(0, 12)}...`);
      setTimeout(() => setArchiveNotice(null), 6000);
      const updated = await api.getEventArchives();
      setArchives(updated);
    } catch (err: any) {
      alert(`Archive creation failed: ${err.message}`);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleCompile = async () => {
    setIsCompiling(true);
    try {
      await api.compileProceedings(isbnInput);
      setNotice('Proceedings successfully compiled with updated Table of Contents and pagination.');
      setTimeout(() => setNotice(null), 4000);
      onRefresh();
    } catch (err: any) {
      alert(`Compilation failed: ${err.message}`);
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-blue-600" />
            Official Conference Proceedings & Indexing
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Aggregates all accepted & camera-ready manuscripts into an indexed conference proceedings volume with track groupings.
          </p>
        </div>

        <button
          onClick={handleCompile}
          disabled={isCompiling}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
        >
          <Sparkles className={`w-4 h-4 ${isCompiling ? 'animate-spin' : ''}`} />
          {isCompiling ? 'Compiling Volume...' : 'Re-Compile Proceedings'}
        </button>
      </div>

      {notice && (
        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{notice}</span>
        </div>
      )}

      {/* ISBN Administrative Control Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">ISBN Publication Registry Status</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Under strict academic compliance, an ISBN is never faked or claimed automatically. If unassigned, it displays "ISBN pending".
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={isbnInput}
              onChange={(e) => setIsbnInput(e.target.value)}
              placeholder="e.g. 978-3-031-89102-4 or 'ISBN pending'"
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:border-blue-500 w-full sm:w-64"
            />
            <button
              onClick={handleCompile}
              className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" /> Update ISBN
            </button>
          </div>
        </div>
      </div>

      {/* Volume Summary & Table of Contents */}
      {proceedings ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
              ISBN: {proceedings.isbn}
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-2">{proceedings.title}</h3>
            <p className="text-xs text-slate-600 mt-0.5">{proceedings.theme}</p>

            <div className="flex items-center gap-4 text-xs font-mono text-slate-500 mt-3">
              <span>Total Papers: <strong>{proceedings.total_papers}</strong></span>
              <span>Total Pages: <strong>{proceedings.total_pages}</strong></span>
              <span>Compiled: <strong>{new Date(proceedings.compiled_at).toLocaleDateString()}</strong></span>
            </div>
          </div>

          {/* Table of Contents */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Table of Contents (By Track)
            </h4>

            {proceedings.table_of_contents && proceedings.table_of_contents.length > 0 ? (
              <div className="space-y-4">
                {proceedings.table_of_contents.map((trackBlock, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="text-xs font-bold text-blue-800 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {trackBlock.track_name}
                    </div>

                    <div className="divide-y divide-slate-100 pl-2">
                      {trackBlock.papers.map((paper, pIdx) => (
                        <div key={pIdx} className="py-2.5 flex items-center justify-between text-xs gap-4">
                          <div>
                            <span className="font-bold text-slate-800 font-mono mr-2">
                              #{paper.paper_number}
                            </span>
                            <span className="font-semibold text-slate-900">{paper.title}</span>
                            <div className="text-[11px] text-slate-500 mt-0.5">{paper.authors}</div>
                          </div>
                          <span className="font-mono text-slate-500 text-xs font-semibold whitespace-nowrap">
                            {paper.page_range}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                No accepted papers compiled yet.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500 text-xs">
          Loading proceedings metadata...
        </div>
      )}
      {/* Full Event Archive & Academic Record Preservation Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Archive className="w-4 h-4 text-indigo-600" />
              Event Archive & Academic Preservation Record
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Generates an immutable snapshot of all conference configuration, tracks, papers, peer reviews, decisions, timetable, registrations, payments, and certificates.
            </p>
          </div>

          <button
            onClick={handleCreateArchive}
            disabled={isArchiving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm whitespace-nowrap"
          >
            <Database className={`w-3.5 h-3.5 ${isArchiving ? 'animate-spin' : ''}`} />
            {isArchiving ? 'Archiving Event...' : 'Create Archive Snapshot'}
          </button>
        </div>

        {archiveNotice && (
          <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">{archiveNotice}</span>
          </div>
        )}

        {/* List of Archived Snapshots */}
        {archives.length > 0 ? (
          <div className="space-y-3">
            {archives.map((arch) => (
              <div
                key={arch.id}
                className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 font-mono">{arch.id}</span>
                    <span className="font-semibold text-slate-800">{arch.archive_title}</span>
                    <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                      AY {arch.academic_year}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3">
                    <span>Archived: <strong>{new Date(arch.archived_at).toLocaleString()}</strong></span>
                    <span>By: <strong>{arch.archived_by}</strong></span>
                    <span className="font-mono text-slate-400">SHA-256: {arch.checksum.slice(0, 16)}...</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] font-mono text-slate-600">
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Papers: {arch.summary.total_papers}</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Reviews: {arch.summary.total_reviews}</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Sessions: {arch.summary.total_sessions}</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Registrations: {arch.summary.total_registrations}</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Certificates: {arch.summary.total_certificates}</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200">ISBN: {arch.summary.isbn}</span>
                  </div>
                </div>

                <a
                  href={api.getArchiveDownloadUrl(arch.id)}
                  download
                  className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-xl transition border border-slate-200 shadow-2xs whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" /> Download JSON Archive
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            No event archive snapshots created yet. Click "Create Archive Snapshot" to freeze and preserve the full event record.
          </div>
        )}
      </div>
    </div>
  );
};
