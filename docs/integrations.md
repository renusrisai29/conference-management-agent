# Integrations & Provider Guide

The Conference Management Agent strictly follows an honest telemetry protocol: external services are only displayed as "Connected" when verified credentials are present.

## 1. Agent 17 (Faculty Research Publication Monitoring Agent)
- **Status in Demo**: `Agent 17 Mock Provider` (Connected)
- **Environment**: `AGENT17_PROVIDER=mock`
- **Future Live Upgrade**: Set `AGENT17_PROVIDER=live`, `AGENT17_API_URL=...`, `AGENT17_API_KEY=...`
- **Contract**: Fully encapsulated behind `Agent17Provider` interface. Matching and COI logic depend exclusively on this interface.

## 2. Groq Cloud LPU (AI Inference)
- **Status**: Detected automatically via `GROQ_API_KEY`.
- **Target Model**: `llama-3.3-70b-versatile`
- **Fallback**: If `GROQ_API_KEY` is not provided, Bolt operates with an offline deterministic academic reasoning engine without crashing or pretending an API was invoked.

## 3. Supabase (PostgreSQL & Storage)
- **Status**: Detected via `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
- **Zero-Downtime Local Store**: The backend includes an active relational memory database with seed data so the system works locally out-of-the-box.

## 4. Payment Sandbox Gateway
- **Mode**: Sandbox test environment (`PAYMENT_PROVIDER=sandbox`).
- **Keys**: `pk_test_sandbox_academic_conf_2026` / `sk_test_sandbox_secret_conf_2026`.
- **Behavior**: Simulates realistic checkout orders and authorization. Never marks a transaction as paid unless verified.

## 5. Email Dispatcher
- **Mode**: Academic simulation with database delivery logs.
- **Provider**: Connects to SMTP/SendGrid when `EMAIL_API_KEY` is supplied.
