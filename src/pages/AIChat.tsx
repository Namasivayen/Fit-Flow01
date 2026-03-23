import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Bot, User, Loader2 } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

const AIChat = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load chat history
  useEffect(() => {
    if (!user) return;
    supabase
      .from("ai_chat_history")
      .select("role, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setMessages(data.map((d) => ({ role: d.role as "user" | "assistant", content: d.content })));
        }
        setHistoryLoaded(true);
      });
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !user || loading) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setLoading(true);

    // Save user message
    await supabase.from("ai_chat_history").insert({
      user_id: user.id,
      role: "user",
      content: userMsg.content,
    });

    try {
      const resp = await supabase.functions.invoke("ai-coach", {
        body: { messages: allMessages.slice(-20) },
      });

      if (resp.error) throw new Error(resp.error.message);

      const assistantContent = resp.data?.content || "I'm sorry, I couldn't generate a response.";
      const assistantMsg: Message = { role: "assistant", content: assistantContent };

      setMessages((prev) => [...prev, assistantMsg]);

      // Save assistant message
      await supabase.from("ai_chat_history").insert({
        user_id: user.id,
        role: "assistant",
        content: assistantContent,
      });
    } catch (err: any) {
      const errorMsg: Message = {
        role: "assistant",
        content: "Sorry, I'm having trouble connecting right now. Please try again.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container flex items-center gap-3 h-16">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-info" />
            </div>
            <div>
              <h1 className="font-display font-bold text-foreground text-lg">AI Coach</h1>
              <p className="text-xs text-muted-foreground">Advisory support only</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-8.5rem)]">
          <div className="container py-6 space-y-4 max-w-2xl">
            {/* Welcome message */}
            {messages.length === 0 && historyLoaded && (
              <div className="text-center py-12 animate-fade-up">
                <div className="w-16 h-16 rounded-2xl bg-info/10 flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-8 h-8 text-info" />
                </div>
                <h2 className="font-display font-bold text-xl text-foreground mb-2">
                  Your AI Fitness Coach
                </h2>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
                  I can help with readiness advice, recovery tips, diet suggestions, and training concepts. I cannot modify your roadmap.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    "Explain my readiness score",
                    "Suggest recovery strategies",
                    "What should I eat today?",
                    "How to improve sleep quality?",
                  ].map((q) => (
                    <Button
                      key={q}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInput(q);
                      }}
                      className="text-xs"
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-info" />
                  </div>
                )}
                <Card
                  className={`max-w-[80%] border-border/50 ${
                    msg.role === "user" ? "bg-primary text-primary-foreground border-primary/20" : ""
                  }`}
                >
                  <CardContent className="pt-3 pb-3 px-4">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </CardContent>
                </Card>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-info" />
                </div>
                <Card className="border-border/50">
                  <CardContent className="pt-3 pb-3 px-4">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </CardContent>
                </Card>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card/80 backdrop-blur-sm">
        <div className="container py-4 max-w-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about recovery, diet, training..."
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
