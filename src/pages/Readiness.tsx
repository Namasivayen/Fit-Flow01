import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Activity, Moon, AlertTriangle, Flame, TrendingUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const categoryConfig: Record<string, { label: string; color: string; icon: typeof Activity }> = {
  Low: { label: "Low – Take it easy", color: "text-destructive", icon: AlertTriangle },
  Moderate: { label: "Moderate – Train smart", color: "text-warning", icon: Activity },
  High: { label: "High – Go for it!", color: "text-success", icon: TrendingUp },
};

function calculateReadiness(sleep: number, missed: number, exertion: number, consecutive: number): { score: number; category: string } {
  let score = 50;
  // Sleep (max 30 points)
  if (sleep >= 8) score += 30;
  else if (sleep >= 7) score += 25;
  else if (sleep >= 6) score += 15;
  else if (sleep >= 5) score += 5;
  else score -= 10;
  // Missed workouts penalty
  score -= missed * 5;
  // Exertion (1-10 scale, lower is better for recovery)
  if (exertion <= 3) score += 15;
  else if (exertion <= 5) score += 10;
  else if (exertion <= 7) score += 0;
  else score -= 10;
  // Consecutive days (fatigue)
  if (consecutive <= 2) score += 5;
  else if (consecutive <= 4) score -= 5;
  else score -= 15;

  score = Math.max(0, Math.min(100, score));
  const category = score >= 70 ? "High" : score >= 40 ? "Moderate" : "Low";
  return { score, category };
}

const Readiness = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [todayScore, setTodayScore] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [sleep, setSleep] = useState(7);
  const [missed, setMissed] = useState(0);
  const [exertion, setExertion] = useState([5]);
  const [consecutive, setConsecutive] = useState(1);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data: todayData } = await supabase
        .from("readiness_scores")
        .select("*")
        .eq("user_id", user.id)
        .eq("score_date", today)
        .maybeSingle();
      setTodayScore(todayData);

      const { data: hist } = await supabase
        .from("readiness_scores")
        .select("*")
        .eq("user_id", user.id)
        .order("score_date", { ascending: false })
        .limit(7);
      setHistory(hist || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const submitScore = async () => {
    if (!user) return;
    const { score, category } = calculateReadiness(sleep, missed, exertion[0], consecutive);

    const { error } = await supabase.from("readiness_scores").insert({
      user_id: user.id,
      sleep_hours: sleep,
      missed_workouts: missed,
      perceived_exertion: exertion[0],
      consecutive_training_days: consecutive,
      score,
      category,
    });

    if (error) {
      toast({ title: "Error saving score", description: error.message, variant: "destructive" });
    } else {
      setTodayScore({ score, category, sleep_hours: sleep, missed_workouts: missed, perceived_exertion: exertion[0], consecutive_training_days: consecutive });
      toast({ title: `Readiness: ${category}`, description: `Your score is ${score}/100` });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const config = todayScore ? categoryConfig[todayScore.category] : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container flex items-center gap-3 h-16">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display font-bold text-foreground text-lg">Readiness Score</h1>
            <p className="text-xs text-muted-foreground">How ready are you to train?</p>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6 max-w-xl">
        {todayScore ? (
          <>
            {/* Today's Result */}
            <Card className="border-border/50 animate-fade-up">
              <CardContent className="pt-6 text-center">
                <div className="w-24 h-24 rounded-full border-4 border-current mx-auto flex items-center justify-center mb-4"
                  style={{ borderColor: todayScore.category === "High" ? "hsl(var(--success))" : todayScore.category === "Moderate" ? "hsl(var(--warning))" : "hsl(var(--destructive))" }}
                >
                  <span className="text-3xl font-display font-bold text-foreground">{todayScore.score}</span>
                </div>
                {config && (
                  <p className={`font-display font-semibold text-lg ${config.color}`}>
                    {config.label}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  {todayScore.category === "Low"
                    ? "Consider rest, yoga, or light stretching today."
                    : todayScore.category === "Moderate"
                    ? "Train at moderate intensity. Listen to your body."
                    : "You're in great shape. Push yourself today!"}
                </p>
              </CardContent>
            </Card>

            {/* Details */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Moon, label: "Sleep", value: `${todayScore.sleep_hours}h` },
                { icon: AlertTriangle, label: "Missed", value: `${todayScore.missed_workouts}` },
                { icon: Flame, label: "Exertion", value: `${todayScore.perceived_exertion}/10` },
                { icon: TrendingUp, label: "Consecutive", value: `${todayScore.consecutive_training_days}d` },
              ].map((item, i) => (
                <Card key={item.label} className="border-border/50 opacity-0 animate-fade-up" style={{ animationDelay: `${i * 60}ms`, animationFillMode: "forwards" }}>
                  <CardContent className="pt-4 flex items-center gap-3">
                    <item.icon className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="font-semibold text-foreground">{item.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          /* Input Form */
          <Card className="border-border/50 animate-fade-up">
            <CardHeader>
              <CardTitle className="font-display">Daily Check-in</CardTitle>
              <CardDescription>Answer a few questions to get your readiness score</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Hours of sleep last night</Label>
                <Input
                  type="number"
                  min={0}
                  max={12}
                  step={0.5}
                  value={sleep}
                  onChange={(e) => setSleep(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Missed workouts this week</Label>
                <Input
                  type="number"
                  min={0}
                  max={7}
                  value={missed}
                  onChange={(e) => setMissed(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Perceived exertion (1 = easy, 10 = exhausted)</Label>
                <Slider value={exertion} onValueChange={setExertion} min={1} max={10} step={1} />
                <p className="text-right text-sm font-medium text-foreground">{exertion[0]}/10</p>
              </div>
              <div className="space-y-2">
                <Label>Consecutive training days</Label>
                <Input
                  type="number"
                  min={0}
                  max={14}
                  value={consecutive}
                  onChange={(e) => setConsecutive(parseInt(e.target.value) || 0)}
                />
              </div>
              <Button className="w-full" onClick={submitScore}>
                Calculate Readiness
              </Button>
            </CardContent>
          </Card>
        )}

        {/* History */}
        {history.length > 0 && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="font-display text-base">Recent History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <span className="text-sm text-muted-foreground">{h.score_date}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{h.score}</span>
                      <span className={`text-xs font-medium ${categoryConfig[h.category]?.color}`}>
                        {h.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Readiness;
