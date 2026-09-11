import React, { useState } from 'react';
import { ProceedingsRecord } from '../types';
import { api } from '../services/api';
import { BookMarked, Sparkles, CheckCircle2, AlertCircle, Save, FileText } from 'lucide-react';

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
    </div>
  );
};
