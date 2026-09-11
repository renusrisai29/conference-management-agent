import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { apiRouter } from './routes/api';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api', apiRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    timestamp: new Date().toISOString(),
    service: 'Conference Management Agent Backend (Agent 26)',
    hackathon: 'AGENTIC AI HACKATHON'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`============================================================`);
  console.log(`🚀 CONFERENCE MANAGEMENT AGENT (AGENT 26) - BACKEND`);
  console.log(`⚡ AGENTIC AI HACKATHON · Group 4: Extension and Outreach`);
  console.log(`📡 Server listening on http://localhost:${PORT}`);
  console.log(`🤖 Bolt AI Assistant: Ready on /api/assistant/chat`);
  console.log(`============================================================`);
});

export default app;
