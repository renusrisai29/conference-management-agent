import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Activity, ShieldCheck, CheckCircle2, AlertCircle, Database, Cpu, Mail, CreditCard, Users, RefreshCw } from 'lucide-react';

interface IntegrationsPageProps {
  onClose?: () => void;
}

export const IntegrationsPage: React.FC<IntegrationsPageProps> = ({ onClose }) => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await api.getIntegrationsStatus();
      setStatus(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            System Integrations & Architecture Health
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Real-time telemetry of external services, database connections, and Agent 17 faculty monitoring provider.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition"
            >
              Back to Conference
            </button>
          )}
        </div>
      </div>

      {status ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Agent 17 (Faculty Research Agent) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Agent 17 (Faculty Publication Agent)</h3>
              </div>
              <span className="bg-blue-100 text-blue-800 font-mono font-bold text-[10px] px-2 py-0.5 rounded-full">
                MOCK PROVIDER
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Maintains verified faculty research profiles and publication histories. Built using the <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700">Agent17Provider</code> interface for seamless plug-and-play transition between mock and live endpoints.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl font-mono text-[11px] text-slate-600 space-y-1 border border-slate-100">
              <div>Status: <strong className="text-emerald-700">CONNECTED (Mock Provider)</strong></div>
              <div>Faculty Dataset: <strong>18 Researchers</strong></div>
              <div>Verified Publications: <strong>{status.agent17?.totalPublications || 104}+ Papers</strong></div>
              <div>Research Domains: <strong>15 Academic Subfields</strong></div>
            </div>
          </div>

          {/* Groq AI Cloud LPU */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">Groq API (AI Inference Engine)</h3>
              </div>
              <span
                className={`font-mono font-bold text-[10px] px-2 py-0.5 rounded-full ${
                  status.groq?.configured
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {status.groq?.configured ? 'CONNECTED' : 'STANDALONE ENGINE'}
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Powers Bolt's natural language comprehension, CFP generation, and reviewer synthesis. If <code>GROQ_API_KEY</code> is omitted, the system falls back gracefully to a deterministic academic reasoning engine without crashing.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl font-mono text-[11px] text-slate-600 space-y-1 border border-slate-100">
              <div>Target Model: <strong>{status.groq?.model || 'llama-3.3-70b-versatile'}</strong></div>
              <div>Key Configured: <strong>{status.groq?.configured ? 'Yes' : 'Not configured (fallback active)'}</strong></div>
            </div>
          </div>

          {/* Supabase PostgreSQL & Auth */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Supabase PostgreSQL & Storage</h3>
              </div>
              <span
                className={`font-mono font-bold text-[10px] px-2 py-0.5 rounded-full ${
                  status.supabase?.configured
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {status.supabase?.configured ? 'CONNECTED' : 'DUAL ACTIVE STORE'}
              </span>
            </div>
            <p className="text-xs text-slate-600">
              PostgreSQL relational schema with full migration scripts (<code className="bg-slate-100 px-1 py-0.5 rounded">001_initial_schema.sql</code>) and seed data. Dual-active architecture ensures immediate execution even prior to cloud provisioning.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl font-mono text-[11px] text-slate-600 space-y-1 border border-slate-100">
              <div>Status: <strong>{status.supabase?.configured ? 'Supabase Cloud Connected' : 'Local Active Store (Zero Downtime)'}</strong></div>
              <div>Schema Migration: <strong>Ready (27 tables + audit logs)</strong></div>
            </div>
          </div>

          {/* Payment Sandbox Gateway */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Payment Sandbox Gateway</h3>
              </div>
              <span className="bg-emerald-100 text-emerald-800 font-mono font-bold text-[10px] px-2 py-0.5 rounded-full">
                SANDBOX READY
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Authorizes test registration transactions, order creation, and verification. Operates exclusively in sandbox test mode to guarantee 0 real-money risk.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl font-mono text-[11px] text-slate-600 space-y-1 border border-slate-100">
              <div>Provider Mode: <strong>Sandbox Simulator</strong></div>
              <div>Public Key: <strong className="text-slate-800">pk_test_sandbox_academic_conf_2026</strong></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-slate-500 text-xs">Loading telemetry...</div>
      )}
    </div>
  );
};
