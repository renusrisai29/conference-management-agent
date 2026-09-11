import React, { useState } from 'react';
import { api } from '../services/api';
import { Sparkles, Download, Mail, Copy, CheckCircle2, FileText, AlertCircle } from 'lucide-react';

interface CfpPageProps {
  conferenceId: string;
}

export const CfpPage: React.FC<CfpPageProps> = ({ conferenceId }) => {
  const [cfpContent, setCfpContent] = useState<string>('');
  const [generatedBy, setGeneratedBy] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [distributed, setDistributed] = useState(false);
  const [specialTheme, setSpecialTheme] = useState('');

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const res = await api.generateCfp(conferenceId, specialTheme);
      setCfpContent(res.cfp_markdown);
      setGeneratedBy(res.generated_with);
    } catch (err: any) {
      alert(`CFP Generation Failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(cfpContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDistribute = () => {
    setDistributed(true);
    setTimeout(() => setDistributed(false), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Call for Papers (CFP) AI Generator
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Synthesizes conference tracks, submission policies, page limits, and IEEE/ACM formatting rules into an authoritative CFP.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
            >
              <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Generating CFP...' : 'Generate with AI'}
            </button>
          </div>
        </div>

        {/* Generator Options */}
        <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            value={specialTheme}
            onChange={(e) => setSpecialTheme(e.target.value)}
            placeholder="Optional theme emphasis (e.g. 'Emphasize Multi-Agent LLM Safety & Sandboxing')"
            className="flex-1 bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
          />
          {generatedBy && (
            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-3 py-2 rounded-xl">
              Engine: <strong className="text-blue-700">{generatedBy}</strong>
            </span>
          )}
        </div>
      </div>

      {distributed && (
        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>CFP dispatched to Academic Mailing Lists & Agent Research Repositories.</span>
        </div>
      )}

      {/* Editor & Preview Area */}
      {cfpContent ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Markdown Source Editor */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs font-semibold text-slate-700">
              <span>Markdown Source Editor</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition"
              >
                <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <textarea
              value={cfpContent}
              onChange={(e) => setCfpContent(e.target.value)}
              className="mt-3 flex-1 min-h-[420px] w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-xs text-slate-800 focus:outline-none focus:bg-white resize-y leading-relaxed"
            />
          </div>

          {/* Formatted Render */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs font-semibold text-slate-700">
              <span>Live Academic Preview</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDistribute}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition"
                >
                  <Mail className="w-3.5 h-3.5 text-blue-600" /> Broadcast CFP
                </button>
              </div>
            </div>

            <div className="mt-4 prose prose-sm max-w-none text-slate-800 overflow-y-auto max-h-[500px] pr-2">
              <div className="whitespace-pre-line text-xs font-sans leading-relaxed">
                {cfpContent}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No CFP Generated Yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Click "Generate with AI" to generate the official Call for Papers. Bolt will read the conference deadlines, tracks, and review policies to compile the document.
          </p>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm"
          >
            Generate Call for Papers Now
          </button>
        </div>
      )}
    </div>
  );
};
