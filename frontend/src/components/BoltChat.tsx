import React, { useState, useRef, useEffect } from 'react';
import { AssistantChatMessage } from '../types';
import { api } from '../services/api';
import { Send, Sparkles, Terminal, Mic, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

interface BoltChatProps {
  onTriggerAction?: (actionKey: string) => void;
  isThinking: boolean;
  setIsThinking: (val: boolean) => void;
}

const INITIAL_MESSAGES: AssistantChatMessage[] = [
  {
    id: 'msg-init-1',
    role: 'assistant',
    content: "Hi, I'm Bolt, your Conference Management Assistant. I'm here to orchestrate AGENTIC-AI-2026 end-to-end, from Call for Papers through peer review, AI decision support, registration, conflict-free scheduling, certificates, and proceedings.",
    timestamp: '10:30 AM',
    quick_actions: [
      'Conference Status',
      'Generate CFP',
      'Review Submissions',
      'Find Reviewers',
      'Check COI',
      'Manage Reviews',
      'Build Programme',
      'Registration',
      'Certificates',
      'Proceedings',
      'View Analytics'
    ]
  }
];

export const BoltChat: React.FC<BoltChatProps> = ({
  onTriggerAction,
  isThinking,
  setIsThinking
}) => {
  const [messages, setMessages] = useState<AssistantChatMessage[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [expandedTools, setExpandedTools] = useState<{ [key: string]: boolean }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isThinking) return;

    const userMsg: AssistantChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsThinking(true);

    try {
      const response = await api.sendChatMessage(query, messages);
      setMessages(prev => [...prev, response]);

      // Automatically expand new tools
      if (response.tool_invocations && response.tool_invocations.length > 0) {
        setExpandedTools(prev => ({
          ...prev,
          [`${response.id}-0`]: true
        }));
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          role: 'assistant',
          content: `Internal connection error: ${err.message}. Please verify the backend is running.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const toggleTool = (id: string) => {
    setExpandedTools(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              {/* Role label & Timestamp */}
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isUser ? 'text-slate-500' : 'text-blue-700'}`}>
                  {isUser ? 'YOU' : 'ASSISTANT (BOLT)'}
                </span>
                <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                    : 'bg-[#F4F8FD] text-slate-800 border border-blue-100/80 rounded-bl-none shadow-sm'
                }`}
              >
                <div className="whitespace-pre-line">{msg.content}</div>

                {/* Tool Invocations Card */}
                {msg.tool_invocations && msg.tool_invocations.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {msg.tool_invocations.map((tool, idx) => {
                      const toolKey = `${msg.id}-${idx}`;
                      const isExpanded = Boolean(expandedTools[toolKey]);

                      return (
                        <div key={toolKey} className="bg-white rounded-lg border border-blue-200/80 shadow-xs overflow-hidden text-xs">
                          {/* Header */}
                          <div
                            onClick={() => toggleTool(toolKey)}
                            className="flex items-center justify-between px-3 py-2 bg-blue-50/70 hover:bg-blue-100/50 cursor-pointer text-slate-700 transition"
                          >
                            <div className="flex items-center gap-2">
                              <Terminal className="w-3.5 h-3.5 text-blue-600" />
                              <span className="font-mono font-semibold text-blue-900">{tool.tool_name}</span>
                              <span className="bg-emerald-100 text-emerald-800 font-medium px-1.5 py-0.2 rounded text-[10px] flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" /> executed
                              </span>
                            </div>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                          </div>

                          {/* Expanded JSON Output */}
                          {isExpanded && (
                            <div className="p-2.5 bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-48">
                              <pre>{JSON.stringify(tool.result, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Thinking Indicator */}
        {isThinking && (
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2 mb-1 px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">ASSISTANT (BOLT)</span>
            </div>
            <div className="bg-[#F4F8FD] text-slate-800 border border-blue-100 rounded-2xl rounded-bl-none px-4 py-3 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
              <span className="text-xs font-medium text-slate-600">Bolt is analyzing parameters & calling backend tools...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Pills */}
      <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
        {[
          'Conference Status',
          'Generate CFP',
          'Review Submissions',
          'Find Reviewers',
          'Check COI',
          'Manage Reviews',
          'Build Programme',
          'Registration',
          'Certificates',
          'Proceedings',
          'View Analytics'
        ].map((action) => (
          <button
            key={action}
            onClick={() => {
              if (onTriggerAction) onTriggerAction(action);
              handleSend(action);
            }}
            className="flex-shrink-0 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 font-medium px-2.5 py-1 rounded-full text-[11px] transition shadow-2xs"
          >
            {action}
          </button>
        ))}
      </div>

      {/* Bottom Chat Input Bar */}
      <div className="p-3 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask Bolt anything: 'Find reviewers for paper 102', 'Show status', 'Check COI'..."
              className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition pr-10"
              disabled={isThinking}
            />
          </div>

          <button
            type="submit"
            disabled={!inputValue.trim() || isThinking}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition flex items-center justify-center shadow-sm"
            title="Send request to Bolt"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Footer info & voice toggle simulation */}
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Standby · Agent 26 Online</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <Mic className="w-3 h-3 text-slate-400" />
            <span>Voice + transcript (assistant & your speech)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
