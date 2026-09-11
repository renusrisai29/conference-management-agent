import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BoltAvatar } from './components/BoltAvatar';
import { BoltChat } from './components/BoltChat';
import { OverviewPage } from './pages/OverviewPage';
import { CfpPage } from './pages/CfpPage';
import { SubmissionsPage } from './pages/SubmissionsPage';
import { ReviewerMatchingPage } from './pages/ReviewerMatchingPage';
import { ReviewsManagementPage } from './pages/ReviewsManagementPage';
import { DecisionsPage } from './pages/DecisionsPage';
import { RegistrationPaymentPage } from './pages/RegistrationPaymentPage';
import { ProgrammeSchedulerPage } from './pages/ProgrammeSchedulerPage';
import { CertificatesPage } from './pages/CertificatesPage';
import { ProceedingsPage } from './pages/ProceedingsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { api } from './services/api';
import {
  Conference, Submission, ReviewerAssignment, Review,
  Decision, Registration, SessionSchedule, CertificateRecord,
  ProceedingsRecord, Role
} from './types';
import {
  LayoutDashboard, FileText, FileUp, Users, ClipboardList,
  Award, CreditCard, CalendarDays, BookMarked, BarChart3, Activity
} from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('ASSISTANT');
  const [currentRole, setCurrentRole] = useState<Role>('CHAIR');
  const [showIntegrationsModal, setShowIntegrationsModal] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [selectedPaperForMatching, setSelectedPaperForMatching] = useState<number | undefined>(undefined);

  // Data states
  const [conference, setConference] = useState<Conference | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [assignments, setAssignments] = useState<ReviewerAssignment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [sessions, setSessions] = useState<SessionSchedule[]>([]);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [proceedings, setProceedings] = useState<ProceedingsRecord | null>(null);

  const loadAllData = async () => {
    try {
      const [
        confData, subsData, asgnsData, revsData,
        decsData, regsData, sessData, certsData, procsData
      ] = await Promise.all([
        api.getConference(),
        api.getSubmissions(),
        api.getReviewerAssignments(),
        api.getReviews(),
        api.getDecisions(),
        api.getRegistrations(),
        api.getSchedule(),
        api.getCertificates(),
        api.getProceedings()
      ]);

      setConference(confData);
      setSubmissions(subsData);
      setAssignments(asgnsData);
      setReviews(revsData);
      setDecisions(decsData);
      setRegistrations(regsData);
      setSessions(sessData);
      setCertificates(certsData);
      setProceedings(procsData);
    } catch (err) {
      console.error('Failed to load conference data:', err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleTriggerAction = (actionKey: string) => {
    const key = actionKey.toLowerCase();
    if (key.includes('status')) setActiveTab('OVERVIEW');
    else if (key.includes('cfp')) setActiveTab('CFP');
    else if (key.includes('submission')) setActiveTab('SUBMISSIONS');
    else if (key.includes('find reviewer') || key.includes('coi') || key.includes('match')) setActiveTab('REVIEWER_MATCHING');
    else if (key.includes('review')) setActiveTab('REVIEWS');
    else if (key.includes('decision')) setActiveTab('DECISIONS');
    else if (key.includes('programme') || key.includes('schedule')) setActiveTab('PROGRAMME');
    else if (key.includes('registration') || key.includes('payment')) setActiveTab('REGISTRATION');
    else if (key.includes('certificate')) setActiveTab('CERTIFICATES');
    else if (key.includes('proceedings')) setActiveTab('PROCEEDINGS');
    else if (key.includes('analytic')) setActiveTab('ANALYTICS');
  };

  const navTabs = [
    { id: 'ASSISTANT', label: 'Bolt Assistant', icon: Activity, badge: 'AI' },
    { id: 'OVERVIEW', label: 'Overview & Setup', icon: LayoutDashboard },
    { id: 'CFP', label: 'Call for Papers', icon: FileText },
    { id: 'SUBMISSIONS', label: 'Submissions', icon: FileUp, count: submissions.length },
    { id: 'REVIEWER_MATCHING', label: 'Reviewer Matching', icon: Users, badge: 'Agent 17' },
    { id: 'REVIEWS', label: 'Reviews', icon: ClipboardList, count: reviews.length },
    { id: 'DECISIONS', label: 'AI Decisions', icon: Award, count: decisions.length },
    { id: 'REGISTRATION', label: 'Registration & Pay', icon: CreditCard, badge: 'Sandbox' },
    { id: 'PROGRAMME', label: 'Programme Scheduler', icon: CalendarDays },
    { id: 'CERTIFICATES', label: 'Certificates', icon: Award, count: certificates.length },
    { id: 'PROCEEDINGS', label: 'Proceedings', icon: BookMarked },
    { id: 'ANALYTICS', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. Header with exact Vignan branding and hackathon title */}
      <Header
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        onOpenIntegrations={() => setShowIntegrationsModal(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* Navigation Tabs Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-xs flex items-center gap-1 overflow-x-auto no-scrollbar">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                      isActive ? 'bg-amber-400 text-slate-900' : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 2. Hero & Bolt AI Assistant Section */}
        {activeTab === 'ASSISTANT' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Robot Visual & Hero Description */}
            <div className="lg:col-span-4 space-y-4">
              <BoltAvatar isThinking={isThinking} statusText="Online & Listening" />

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-600 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded">
                    AGENT 26
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Bolt — Autonomous Conference Agent
                  </h3>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Bolt coordinates the entire academic conference lifecycle from Call for Papers through submissions, peer review, AI decision support, registration payments, conflict-free scheduling, certificates, and proceedings.
                </p>

                <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500">
                  <div className="flex items-center justify-between">
                    <span>Target Conference:</span>
                    <strong className="text-slate-800 font-mono">AGENTIC-AI-2026</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Host Institution:</span>
                    <strong className="text-slate-800">Vignan University</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Reviewer Data:</span>
                    <strong className="text-blue-700">Agent 17 Mock Provider</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Payment Mode:</span>
                    <strong className="text-emerald-700">Sandbox Verified</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Chat Interface */}
            <div className="lg:col-span-8 h-[600px]">
              <BoltChat
                onTriggerAction={handleTriggerAction}
                isThinking={isThinking}
                setIsThinking={setIsThinking}
              />
            </div>
          </div>
        )}

        {/* 3. Conference Overview Page */}
        {activeTab === 'OVERVIEW' && (
          <OverviewPage conference={conference} onRefresh={loadAllData} />
        )}

        {/* 4. Call for Papers Page */}
        {activeTab === 'CFP' && (
          <CfpPage conferenceId={conference?.id || 'conf-aiai-2026'} />
        )}

        {/* 5. Submissions & Validation Page */}
        {activeTab === 'SUBMISSIONS' && (
          <SubmissionsPage
            submissions={submissions}
            tracks={conference?.tracks || []}
            onRefresh={loadAllData}
            onSelectPaperForMatching={(sub) => {
              setSelectedPaperForMatching(sub.paper_number);
              setActiveTab('REVIEWER_MATCHING');
            }}
          />
        )}

        {/* 6. Reviewer Matching & COI Page */}
        {activeTab === 'REVIEWER_MATCHING' && (
          <ReviewerMatchingPage
            submissions={submissions}
            selectedPaperNumber={selectedPaperForMatching}
            onRefresh={loadAllData}
          />
        )}

        {/* 7. Reviews Management Page */}
        {activeTab === 'REVIEWS' && (
          <ReviewsManagementPage
            submissions={submissions}
            assignments={assignments}
            reviews={reviews}
            onRefresh={loadAllData}
          />
        )}

        {/* 8. Decisions Page */}
        {activeTab === 'DECISIONS' && (
          <DecisionsPage
            submissions={submissions}
            decisions={decisions}
            reviews={reviews}
            onRefresh={loadAllData}
          />
        )}

        {/* 9. Registration & Payments Page */}
        {activeTab === 'REGISTRATION' && (
          <RegistrationPaymentPage
            registrations={registrations}
            onRefresh={loadAllData}
          />
        )}

        {/* 10. Programme Scheduler Page */}
        {activeTab === 'PROGRAMME' && (
          <ProgrammeSchedulerPage
            sessions={sessions}
            onRefresh={loadAllData}
          />
        )}

        {/* 11. Certificates Page */}
        {activeTab === 'CERTIFICATES' && (
          <CertificatesPage
            certificates={certificates}
            onRefresh={loadAllData}
          />
        )}

        {/* 12. Proceedings Page */}
        {activeTab === 'PROCEEDINGS' && (
          <ProceedingsPage
            proceedings={proceedings}
            onRefresh={loadAllData}
          />
        )}

        {/* 13. Analytics Page */}
        {activeTab === 'ANALYTICS' && (
          <AnalyticsPage />
        )}

        {/* 14. Integrations Health Status View */}
        {showIntegrationsModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <IntegrationsPage onClose={() => setShowIntegrationsModal(false)} />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[#E31B23]">VIGNAN'S</span>
            <span>Foundation for Science, Technology & Research</span>
            <span>·</span>
            <span>Agentic AI Hackathon (Agent 26 · Group 4)</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Double-Blind Peer Review</span>
            <span>·</span>
            <span>Agent 17 Faculty Monitoring</span>
            <span>·</span>
            <span>Verifiable Certificates</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default App;
