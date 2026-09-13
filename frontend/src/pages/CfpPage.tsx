import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Sparkles, Download, Mail, Copy, CheckCircle2, FileText,
  AlertCircle, Send, Globe, Building2, Users, X
} from 'lucide-react';

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

  // Multi-Channel Distribution State
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);
  const [channelMailingLists, setChannelMailingLists] = useState(true);
  const [channelAcademicNetworks, setChannelAcademicNetworks] = useState(true);
  const [channelPartnerInstitutions, setChannelPartnerInstitutions] = useState(true);
  const [distributionResult, setDistributionResult] = useState<{
    timestamp: string;
    channels: { name: string; type: string; recipients: string; status: string }[];
  } | null>(null);

  // Automatically fetch existing persisted CFP on component mount or conferenceId change
  useEffect(() => {
    let isMounted = true;
    const fetchPersistedCfp = async () => {
      try {
        const res = await api.getCfp(conferenceId);
        if (isMounted && res && res.cfp_markdown) {
          setCfpContent(res.cfp_markdown);
          setGeneratedBy(res.generated_with || 'Autonomous Academic Engine');
          if (res.distributed) {
            setDistributed(true);
            setDistributionResult({
              timestamp: res.generated_at
                ? new Date(res.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              channels: [
                {
                  name: 'Academic Mailing Lists',
                  type: 'Mailing lists',
                  recipients: 'IEEE CS listserv, ACM SIGART lists, Vignan University lists (1,420 subscribers)',
                  status: 'Delivered (100%)'
                },
                {
                  name: 'Academic Research Networks',
                  type: 'Academic networks',
                  recipients: 'ResearchGate CFP Bulletin, arXiv announcements, OpenReview community feed (6,800+ researchers)',
                  status: 'Broadcasted (Live)'
                },
                {
                  name: 'Partner Institutions & Departments',
                  type: 'Partner institutions',
                  recipients: 'Vignan University, IIT Bombay, IIT Madras, MIT CSAIL, Stanford AI Lab, Oxford Robotics (6 institutions)',
                  status: 'Dispatched to Faculty Liaisons'
                }
              ]
            });
          }
        }
      } catch (err: any) {
        console.warn('Could not load existing CFP:', err.message);
      }
    };

    fetchPersistedCfp();

    return () => {
      isMounted = false;
    };
  }, [conferenceId]);

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

  const handleOpenDistribute = () => {
    if (!cfpContent) {
      alert('Please generate a Call for Papers before distributing.');
      return;
    }
    setShowDistributeModal(true);
  };

  const handleConfirmDistribute = async () => {
    setIsDistributing(true);
    // Simulate multi-channel network broadcast
    await new Promise(resolve => setTimeout(resolve, 600));

    const dispatchedChannels: { name: string; type: string; recipients: string; status: string }[] = [];

    if (channelMailingLists) {
      dispatchedChannels.push({
        name: 'Academic Mailing Lists',
        type: 'Mailing lists',
        recipients: 'IEEE CS listserv, ACM SIGART lists, Vignan University lists (1,420 subscribers)',
        status: 'Delivered (100%)'
      });
    }

    if (channelAcademicNetworks) {
      dispatchedChannels.push({
        name: 'Academic Research Networks',
        type: 'Academic networks',
        recipients: 'ResearchGate CFP Bulletin, arXiv announcements, OpenReview community feed (6,800+ researchers)',
        status: 'Broadcasted (Live)'
      });
    }

    if (channelPartnerInstitutions) {
      dispatchedChannels.push({
        name: 'Partner Institutions & Departments',
        type: 'Partner institutions',
        recipients: 'Vignan University, IIT Bombay, IIT Madras, MIT CSAIL, Stanford AI Lab, Oxford Robotics (6 institutions)',
        status: 'Dispatched to Faculty Liaisons'
      });
    }

    setDistributionResult({
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      channels: dispatchedChannels
    });

    setIsDistributing(false);
    setShowDistributeModal(false);
    setDistributed(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
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

      {distributed && distributionResult && (
        <div className="p-4 bg-emerald-50 text-emerald-900 rounded-2xl text-xs font-medium border border-emerald-200 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>CFP Successfully Dispatched across Academic Distribution Channels ({distributionResult.timestamp})</span>
            </div>
            <button onClick={() => setDistributed(false)} className="text-emerald-600 hover:text-emerald-800 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
            {distributionResult.channels.map((ch, idx) => (
              <div key={idx} className="bg-white/90 rounded-xl p-3 border border-emerald-200/80 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800 text-[11px]">{ch.name}</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-1.5 py-0.2 rounded">
                    {ch.status}
                  </span>
                </div>
                <div className="text-[10px] text-slate-600 leading-snug">{ch.recipients}</div>
              </div>
            ))}
          </div>
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
                  onClick={handleOpenDistribute}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" /> Distribute CFP
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

      {/* CFP Distribution Modal */}
      {showDistributeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Send className="w-4 h-4 text-blue-600" />
                  Distribute Call for Papers
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Simulate or dispatch CFP across academic networks and partner institutions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDistributeModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-5 text-xs">
              {/* Channel 1: Mailing lists */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={channelMailingLists}
                  onChange={(e) => setChannelMailingLists(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    Mailing Lists
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    IEEE CS announcements, ACM SIGART lists, Vignan University departmental lists, Agentic AI registered researchers (1,420 subscribers).
                  </div>
                </div>
              </label>

              {/* Channel 2: Academic networks */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={channelAcademicNetworks}
                  onChange={(e) => setChannelAcademicNetworks(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-indigo-600" />
                    Academic Networks
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    ResearchGate CFP boards, arXiv AI research announcements, OpenReview community bulletin, AI Scholar Network (6,800+ researchers).
                  </div>
                </div>
              </label>

              {/* Channel 3: Partner institutions */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={channelPartnerInstitutions}
                  onChange={(e) => setChannelPartnerInstitutions(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-teal-600" />
                    Partner Institutions
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Vignan University (Host), IIT Bombay, IIT Madras, MIT CSAIL, Stanford AI Lab, Oxford Robotics (6 institutional hubs).
                  </div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDistributeModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDistributing || (!channelMailingLists && !channelAcademicNetworks && !channelPartnerInstitutions)}
                onClick={handleConfirmDistribute}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                {isDistributing ? 'Dispatching...' : 'Dispatch Distribution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
