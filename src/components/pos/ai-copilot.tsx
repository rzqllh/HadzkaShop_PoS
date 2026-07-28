"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, X, Send, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AICopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  
  const { messages, status, sendMessage } = useChat({});
  
  const isLoading = status === 'submitted' || status === 'streaming';
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, status]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ role: 'user', parts: [{ type: 'text', text: input }] });
    setInput("");
  };

  const handleShortcut = (text: string) => {
    sendMessage({ role: 'user', parts: [{ type: 'text', text }] });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <Card className="w-[350px] sm:w-[400px] h-[500px] flex flex-col overflow-hidden shadow-2xl border-white/10 bg-background/80 backdrop-blur-xl">
              <div className="p-4 border-b bg-gradient-to-r from-emerald-500/10 to-teal-500/10 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-emerald-500 rounded-full text-white shadow-sm">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">AI Copilot</h3>
                    <p className="text-xs text-muted-foreground">gemini 3.6 flash</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setIsOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 pb-4">
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm mt-10 space-y-4">
                      <Bot className="w-10 h-10 mx-auto opacity-50" />
                      <p>How can I help you manage the shop today?</p>
                      <div className="flex flex-col gap-2 px-4">
                        <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => handleShortcut('How are sales looking today?')}>
                          📊 Check today's sales
                        </Button>
                        <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => handleShortcut('Add 10 stock to Indomie')}>
                          📦 Add 10 stock to Indomie
                        </Button>
                      </div>
                    </div>
                  )}
                  {messages.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex w-max max-w-[85%] flex-col gap-2 rounded-2xl px-4 py-2 text-sm",
                        m.role === "user"
                          ? "ml-auto bg-primary text-primary-foreground rounded-br-none"
                          : "bg-muted rounded-bl-none"
                      )}
                    >
                      <div className="whitespace-pre-wrap break-words">
                        {m.parts?.map((part: any, index: number) => {
                          if (part.type === 'text') {
                            return <span key={index}>{part.text}</span>;
                          }
                          return null;
                        })}
                        {/* 
                           Wait, toolInvocations in UIMessage has parts. In v7, UIMessage has 'parts' which contains text, tool-invocation, tool-result, etc.
                           Let's render parts directly if we want to show tools loading.
                        */}
                        {m.parts?.filter(p => p.type === 'tool-invocation').map((part: any) => {
                          const toolInvocation = part.toolInvocation;
                          const toolCallId = toolInvocation.toolCallId;
                          const message = toolInvocation.state === 'result'
                            ? `Executed: ${toolInvocation.toolName}`
                            : `Running: ${toolInvocation.toolName}...`;
                          return (
                            <div key={toolCallId} className="mt-2 p-2 bg-background/50 rounded-md border text-xs font-mono flex items-center gap-2 text-muted-foreground">
                              {toolInvocation.state !== 'result' && <Loader2 className="w-3 h-3 animate-spin" />}
                              {message}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && status !== 'streaming' && (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs p-2">
                      <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              <div className="p-3 border-t bg-background/50 backdrop-blur-md">
                <form
                  onSubmit={handleSubmit}
                  className="flex w-full items-center space-x-2"
                >
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask AI Copilot..."
                    className="flex-1 bg-background border-muted shadow-sm rounded-full px-4 h-10 focus-visible:ring-emerald-500"
                    disabled={isLoading}
                  />
                  <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="h-10 w-10 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-md">
                    <Send className="w-4 h-4" />
                    <span className="sr-only">Send</span>
                  </Button>
                </form>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="icon"
          className={cn(
            "h-14 w-14 rounded-full shadow-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 text-white border-4 border-background transition-colors duration-300",
            isOpen && "from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900"
          )}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
        </Button>
      </motion.div>
    </div>
  );
}
