"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, X, Send, Sparkles, Loader2, Settings2, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const BouncingDots = () => (
  <div className="flex gap-1 items-center justify-center h-4 px-1">
    <motion.div className="w-1.5 h-1.5 bg-primary rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
    <motion.div className="w-1.5 h-1.5 bg-primary rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
    <motion.div className="w-1.5 h-1.5 bg-primary rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
  </div>
);

export function AICopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<{label: string, prompt: string, emoji: string}[] | null>(null);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  
  const { messages, status, sendMessage, setMessages } = useChat({});
  
  const isLoading = status === 'submitted' || status === 'streaming';
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, status, isOpen]);

  async function loadSuggestions() {
    if (messages.length > 0 || suggestions || isGeneratingSuggestions) return;

    const cached = sessionStorage.getItem("ai-copilot-suggestions");
    if (cached) {
      try {
        setSuggestions(JSON.parse(cached));
        return;
      } catch (error) {
        console.error("Failed to parse cached suggestions", error);
      }
    }

    setIsGeneratingSuggestions(true);
    try {
      const response = await fetch("/api/chat/suggestions");
      const data = await response.json();
      if (data?.suggestions) {
        setSuggestions(data.suggestions);
        sessionStorage.setItem(
          "ai-copilot-suggestions",
          JSON.stringify(data.suggestions),
        );
      }
    } catch (error) {
      console.error("Failed to load AI suggestions", error);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  }

  function toggleCopilot() {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) void loadSuggestions();
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ role: 'user', parts: [{ type: 'text', text: input }] });
    setInput("");
  };

  const handleShortcut = (text: string) => {
    sendMessage({ role: 'user', parts: [{ type: 'text', text }] });
  };

  const clearChat = () => {
    setMessages([]);
    // Do not clear suggestions here, so they persist when clearing chat
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card className="w-[380px] sm:w-[420px] h-[540px] flex flex-col overflow-hidden shadow-2xl border-border bg-background rounded-2xl">
              <div className="p-4 border-b bg-background flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary rounded-md text-primary-foreground shadow-sm">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-semibold text-sm leading-tight">AI Copilot</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Gemini 3.6 Flash</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md hover:bg-accent h-8 w-8 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors">
                      <Settings2 className="w-4 h-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-background border border-border shadow-xl z-50">
                      <DropdownMenuItem onClick={clearChat} className="text-destructive focus:text-destructive focus:bg-destructive focus:text-destructive-foreground cursor-pointer group">
                        <Trash2 className="w-4 h-4 mr-2 text-destructive group-focus:text-destructive-foreground" />
                        Clear Conversation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setIsOpen(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-4 p-4 pb-4">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center text-center mt-12 space-y-4">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <Bot className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-sm">Ada yang bisa saya bantu hari ini?</p>
                        <p className="text-xs text-muted-foreground">Kelola toko, cek stok barang, atau lihat data penjualan.</p>
                      </div>
                      <div className="flex flex-col gap-2 w-full max-w-[280px] pt-4">
                        {isGeneratingSuggestions ? (
                          <div className="flex items-center justify-center p-2 text-muted-foreground text-xs gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" /> Menyiapkan saran...
                          </div>
                        ) : suggestions ? (
                          suggestions.map((s, i) => (
                            <Button key={i} variant="outline" size="sm" className="justify-start text-xs h-9 bg-background" onClick={() => handleShortcut(s.prompt)}>
                              <span className="mr-2">{s.emoji}</span> {s.label}
                            </Button>
                          ))
                        ) : (
                          <>
                            <Button variant="outline" size="sm" className="justify-start text-xs h-9 bg-background" onClick={() => handleShortcut('Bagaimana penjualan hari ini?')}>
                              📊 Cek penjualan hari ini
                            </Button>
                            <Button variant="outline" size="sm" className="justify-start text-xs h-9 bg-background" onClick={() => handleShortcut('Berapa produk aktif yang saya miliki?')}>
                              📦 Cek jumlah produk
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  {messages.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className={cn(
                        "flex w-max max-w-[85%] flex-col gap-1.5 px-4 py-2.5 text-sm shadow-sm",
                        m.role === "user"
                          ? "ml-auto bg-primary rounded-2xl rounded-br-sm"
                          : "bg-muted/50 border border-border rounded-2xl rounded-bl-sm"
                      )}
                    >
                      <div className="break-words leading-relaxed w-full">
                        {m.parts?.map((part, index: number) => {
                          if (part.type === 'text') {
                            return (
                              <div key={index} className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-normal prose-p:m-0 prose-p:mb-2 last:prose-p:mb-0 prose-pre:p-0 prose-li:m-0">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {part.text}
                                </ReactMarkdown>
                              </div>
                            );
                          }
                          
                          if (
                            (part.type.startsWith("tool-") || part.type === "dynamic-tool") &&
                            "state" in part
                          ) {
                            const toolName =
                              part.type === "dynamic-tool"
                                ? part.toolName
                                : part.type.slice(5);
                            const isResult = part.state === 'output-available' || part.state === 'output-error';
                            let argsString = '';
                            try {
                              if ("input" in part && part.input) {
                                argsString = `(${JSON.stringify(part.input)})`;
                              }
                            } catch {}
                            
                            return (
                              <div key={"toolCallId" in part ? part.toolCallId : index} className="mt-2 p-2 bg-background border border-border/50 rounded-md text-xs font-mono flex flex-col gap-1 text-muted-foreground break-all">
                                <div className="flex items-center gap-2">
                                  {!isResult && <BouncingDots />}
                                  <span className="font-semibold">{isResult ? `Selesai: ${toolName}` : `Memproses: ${toolName}`}</span>
                                </div>
                                {!isResult && argsString && (
                                  <div className="pl-5 opacity-75">{argsString}</div>
                                )}
                                {part.state === 'output-available' && "output" in part && Boolean(part.output) && (
                                  <div className="pl-5 opacity-90 text-primary font-sans mt-1">
                                    ↳ {typeof part.output === 'string' ? part.output : JSON.stringify(part.output)}
                                  </div>
                                )}
                                {part.state === 'output-error' && "errorText" in part && Boolean(part.errorText) && (
                                  <div className="pl-5 opacity-90 text-destructive font-sans mt-1">
                                    ↳ Error: {part.errorText}
                                  </div>
                                )}
                              </div>
                            );
                          }
                          
                          return null;
                        })}
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && status !== 'streaming' && (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs p-2 ml-1">
                      <BouncingDots /> 
                      <span>Berpikir...</span>
                    </div>
                  )}
                  <div ref={scrollRef} className="h-1" />
                </div>
              </ScrollArea>

              <div className="p-3 border-t bg-background shrink-0">
                <form
                  onSubmit={handleSubmit}
                  className="flex w-full items-center gap-2"
                >
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Tanya AI Copilot..."
                    className="flex-1 bg-muted/30 border-muted focus-visible:ring-1 focus-visible:ring-primary shadow-inner rounded-full px-4 h-10 text-sm"
                    disabled={isLoading}
                  />
                  <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="h-10 w-10 rounded-full shrink-0 shadow-sm transition-transform active:scale-95">
                    <Send className="w-4 h-4 ml-0.5" />
                    <span className="sr-only">Send</span>
                  </Button>
                </form>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.15 }}>
        <Button
          onClick={toggleCopilot}
          size="icon"
          className={cn(
            "h-14 w-14 rounded-full shadow-lg text-white border-2 border-background transition-all duration-200",
            isOpen 
              ? "bg-slate-800 hover:bg-slate-900 shadow-md" 
              : "bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20"
          )}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
        </Button>
      </motion.div>
    </div>
  );
}
