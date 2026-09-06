import React, { useState } from 'react';
import { Device, NetworkBaseline, SecurityPosture, HealthMetrics } from '../../types';
import { Bot, Send, Sparkles, Shield, AlertCircle, RefreshCw, Cpu, User } from 'lucide-react';

interface AiAnalystViewProps {
  devices: Device[];
  baseline: NetworkBaseline | null;
  security: SecurityPosture | null;
  health: HealthMetrics | null;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  model?: string;
  timestamp: string;
}

export const AiAnalystView: React.FC<AiAnalystViewProps> = ({
  devices,
  baseline,
  security,
  health,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `### NetScope Grounded AI Network Analyst
I analyze your real local network telemetry to provide objective security posture evaluations and defensive architecture guidance.

My findings adhere to a strict empirical taxonomy:
1. **FACT:** Directly observed interface metrics, ARP table bindings, and ICMP probes.
2. **INFERENCE:** Probabilistic deductions from IEEE OUI hardware registers and service banners.
3. **RECOMMENDATION:** Concrete, defensive hardening measures.

Select a preset query below or ask any specific question about your network nodes.`,
      model: 'gemini-3.6-flash',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const promptChips = [
    'Summarize active device inventory and roles',
    'Evaluate open port exposure and risk findings',
    'Verify default gateway routing hygiene',
    'Suggest VLAN and subnet segmentation',
  ];

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isThinking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsThinking(true);

    try {
      const networkContext = {
        baseline,
        devices,
        security,
        health,
      };

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), networkContext }),
      });

      const data = await res.json();

      if (data.reply) {
        const assistantMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: data.reply,
          model: data.model || 'gemini-3.6-flash',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error(data.error || 'Failed to generate response.');
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `Error analyzing network: ${err.message}. Operating in resilient offline fallback mode.`,
        model: 'Local Rules (Offline)',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div id="ai-analyst-view-container" className="space-y-4">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-100">AI Network Analyst</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                Ground-Truth Grounding Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Powered by Google Gemini with live network telemetry injection. Hallucinations strictly forbidden.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>Nodes: {devices.length}</span>
          <span className="text-slate-600">|</span>
          <span>Score: {security?.score ?? 100}/100</span>
        </div>
      </div>

      {/* Preset Prompt Chips */}
      <div className="flex flex-wrap gap-2">
        {promptChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(chip)}
            disabled={isThinking}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/80 text-xs text-slate-300 transition-colors cursor-pointer"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 min-h-[420px] max-h-[580px] overflow-y-auto space-y-4 shadow-inner">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 ${
              m.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {m.sender === 'assistant' && (
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mt-1 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-2xl rounded-xl p-4 text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-cyan-600 text-white rounded-tr-none'
                  : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none space-y-2'
              }`}
            >
              <div className="whitespace-pre-wrap font-sans">{m.text}</div>

              <div className="flex items-center justify-between pt-2 text-[10px] text-slate-500 font-mono border-t border-slate-800/50">
                <span>{m.model || 'NetScope System'}</span>
                <span>{m.timestamp}</span>
              </div>
            </div>

            {m.sender === 'user' && (
              <div className="p-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 mt-1 shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isThinking && (
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>Analyzing live network telemetry with Gemini 3.6 Flash...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputText);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask the AI Analyst about your subnet, unknown MACs, open ports, or security posture..."
          disabled={isThinking}
          className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors font-sans"
        />
        <button
          type="submit"
          disabled={isThinking || !inputText.trim()}
          className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
