import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, X, Minimize2, Bot, Sparkles, CornerDownLeft, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { fleetStorage } from "../storage";
import { isSupabaseConfigured } from "../supabaseClient";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function HelpBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial",
      role: "assistant",
      content: "Olá! Eu sou o **TransRoute Copilot**, seu assistente inteligente. Posso te ajudar a cadastrar veículos, bater ponto, configurar a conexão do Supabase, entender as regras de aprovação de horas do ADM e muito mais. \n\nNo que posso te ajudar hoje?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const listEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    if (listEndRef.current) {
      listEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen]);

  // Função interna para obter estatísticas resumidas das tabelas em tempo real
  const fetchSystemStats = async () => {
    try {
      const [drivers, vehicles, workLogs, payments] = await Promise.all([
        fleetStorage.getDrivers(),
        fleetStorage.getVehicles(),
        fleetStorage.getWorkLogs(),
        fleetStorage.getPayments()
      ]);

      const pendingWorkLogsCount = workLogs.filter(wl => wl.status === "pendente_aprovacao").length;
      const approvedWorkLogsCount = workLogs.filter(wl => wl.status === "aprovado").length;

      // Gerar payloads extremamente enxutos para otimizar tamanho de tokens enviados ao Groq
      const driversSummary = drivers.map(d => ({
        nome: d.name,
        cpf: d.cpf,
        status: d.status,
        valor_hora: `R$ ${d.hourlyRate}/h`
      }));

      const vehiclesSummary = vehicles.map(v => ({
        placa: v.plate,
        modelo: `${v.brand} ${v.model}`,
        status: v.status
      }));

      return {
        isSupabase: isSupabaseConfigured,
        driversCount: drivers.length,
        drivers: driversSummary,
        vehiclesCount: vehicles.length,
        vehicles: vehiclesSummary,
        workLogsCount: workLogs.length,
        pendingWorkLogsCount,
        approvedWorkLogsCount,
        paymentsCount: payments.length
      };
    } catch (e) {
      console.error("Falha ao levantar metadados das frotas para subsidiar o Copilot:", e);
      return {
        isSupabase: isSupabaseConfigured,
        driversCount: 0,
        drivers: [],
        vehiclesCount: 0,
        vehicles: [],
        workLogsCount: 0,
        pendingWorkLogsCount: 0,
        approvedWorkLogsCount: 0,
        paymentsCount: 0
      };
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend !== undefined ? textToSend : input;
    const text = rawText.trim();
    if (!text || isLoading) return;

    if (textToSend === undefined) {
      setInput("");
    }
    setErrorMsg(null);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Prepara o array de mensagens tirando o ID local para enviar ao Groq
      const apiMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content
      }));

      // Captura estatísticas reais das tabelas no estado atual
      const systemStats = await fetchSystemStats();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          messages: apiMessages,
          systemStats
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro de rede (${res.status})`);
      }

      const responseData = await res.json();
      const assistantText = responseData.choices?.[0]?.message?.content || "Desculpe, não consegui gerar uma resposta.";

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: assistantText
        }
      ]);
    } catch (err: any) {
      console.error("ChatBot error:", err);
      setErrorMsg(err.message || "Não foi possível conectar ao servidor de assistência.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const handleQuickQuestion = (qn: string) => {
    handleSendMessage(qn);
  };

  // Perguntas sugeridas rápidas para agilizar no celular/layout
  const quickQuestions = [
    "Como motorista bate ponto?",
    "Quais as credenciais de teste?",
    "Como o ADM aprova as horas?",
    "Como conectar com o Supabase?"
  ];

  return (
    <div className="fixed bottom-12 right-6 z-50 font-sans" id="help-bot-root">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.92 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-80 sm:w-96 h-[500px] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col mb-4 hover:border-indigo-500/20 transition-all duration-300"
            id="chat-window-card"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-950 to-slate-900 px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0" id="chat-header">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-650/10 rounded-xl flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                  <Bot className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-white">TransRoute Copilot</span>
                    <span className="bg-indigo-500/15 text-indigo-400 font-mono text-[8.5px] font-bold px-1.5 py-0.5 rounded border border-indigo-500/10">GROQ AI</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"></div>
                    <span className="text-[10px] text-slate-500 font-mono">Pronto para Ajuda</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition duration-150 cursor-pointer"
                  title="Minimizar"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setMessages([
                      {
                        id: "initial",
                        role: "assistant",
                        content: "Olá! Como posso te ajudar a usar o TransRoute hoje?"
                      }
                    ]);
                    setErrorMsg(null);
                  }}
                  className="p-1.5 rounded-lg text-[10px] text-slate-500 hover:text-slate-200 transition font-mono uppercase"
                  title="Limpar Conversa"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/20" id="chat-messages-body">
              {messages.map((m) => {
                const isAssistant = m.role === "assistant";
                return (
                  <div
                    key={m.id}
                    className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}
                    id={`chat-bubble-${m.id}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl py-2.5 px-3.5 text-xs ${
                      isAssistant 
                        ? "bg-slate-900 border border-slate-800/80 text-slate-300 rounded-tl-none leading-relaxed" 
                        : "bg-indigo-600 text-white rounded-tr-none shadow-md"
                    }`}>
                      {/* Simples renderizador de Markdown básico para negrito, listagem e quebras */}
                      <p className="whitespace-pre-line leading-relaxed">
                        {m.content.split("**").map((part, index) => {
                          if (index % 2 === 1) {
                            return <strong key={index} className="font-bold text-white">{part}</strong>;
                          }
                          return part;
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Loader */}
              {isLoading && (
                <div className="flex justify-start" id="chat-bubble-loading">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none py-3 px-4 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-spin" />
                    <span className="text-[11px] text-slate-500 font-mono tracking-tight">Copilot está pensando...</span>
                  </div>
                </div>
              )}

              {/* Erros amigáveis */}
              {errorMsg && (
                <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl flex gap-2 text-[11px] text-red-200 leading-normal" id="chat-error-log">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Falha de Autenticação / Conexão:</span>
                    {errorMsg}
                  </div>
                </div>
              )}

              <div ref={listEndRef} />
            </div>

            {/* Quick Actions Panel */}
            <div className="px-4 py-2 bg-slate-950 border-t border-slate-850 shrink-0 overflow-x-auto whitespace-nowrap flex gap-1.5 no-scrollbar" id="chat-quick-queries">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickQuestion(q)}
                  disabled={isLoading}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-indigo-400 border border-slate-800 rounded-full text-[10px] font-medium transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-slate-950 border-t border-slate-850 flex gap-2 items-center shrink-0" id="chat-input-bar">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Escreva sua pergunta ou dúvida aqui..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3.5 text-xs text-white placeholder-slate-550 focus:outline-hidden focus:border-indigo-500/50 disabled:opacity-50"
                  id="chat-user-input"
                />
                <span className="absolute right-3.5 top-2.5 hidden sm:flex items-center gap-1 text-[8.5px] font-mono text-slate-500">
                  <span>Enter</span>
                  <CornerDownLeft className="h-2 w-2" />
                </span>
              </div>
              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || !input.trim()}
                className="w-9 h-9 bg-indigo-600 hover:bg-indigo-550 text-white rounded-xl flex items-center justify-center transition cursor-pointer shrink-0 disabled:bg-slate-800 disabled:text-slate-650 disabled:cursor-not-allowed shadow"
                title="Enviar"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Sparkles Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center cursor-pointer shadow-2xl border transition duration-300 relative ${
          isOpen
            ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
            : "bg-indigo-600 border-indigo-500/40 text-white hover:bg-indigo-550 shadow-indigo-600/30"
        }`}
        title="Assistente Virtual TransRoute"
        id="help-bot-trigger-btn"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <>
            <MessageSquare className="h-5.5 w-5.5" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-505"></span>
            </span>
          </>
        )}
      </motion.button>
    </div>
  );
}
