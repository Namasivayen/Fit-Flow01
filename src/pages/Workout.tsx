import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Dumbbell, Timer, SkipForward, CheckCircle2, Map } from "lucide-react";

const Workout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeRoadmap, setActiveRoadmap] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [restTimer, setRestTimer] = useState(0);
  const [restActive, setRestActive] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchWorkout = async () => {
      const { data: ur } = await supabase
        .from("user_roadmaps")
        .select("*, fitness_roadmaps(title, duration_weeks)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!ur) {
        setLoading(false);
        return;
      }
      setActiveRoadmap(ur);

      // Get phases for this roadmap
      const { data: phases } = await supabase
        .from("roadmap_phases")
        .select("*")
        .eq("roadmap_id", ur.roadmap_id)
        .order("sort_order");

      if (!phases?.length) { setLoading(false); return; }

      // Determine current week/day
      const currentDay = ur.current_day || 1;
      const weekNumber = Math.ceil(currentDay / 3); // 3 workout days per week
      const dayInWeek = ((currentDay - 1) % 3) + 1;

      const currentPhase = phases.find((p: any) => p.week_number === weekNumber) || phases[0];

      // Get exercises for this day
      const { data: re } = await supabase
        .from("roadmap_exercises")
        .select("*, exercises(*)")
        .eq("phase_id", currentPhase.id)
        .eq("day_number", dayInWeek)
        .order("sort_order");

      setExercises(re || []);

      // Check existing logs
      const { data: logs } = await supabase
        .from("workout_logs")
        .select("roadmap_exercise_id, completed, skipped")
        .eq("user_roadmap_id", ur.id)
        .eq("day_number", currentDay);

      const done = new Set<string>();
      const skip = new Set<string>();
      logs?.forEach((l: any) => {
        if (l.completed) done.add(l.roadmap_exercise_id);
        if (l.skipped) skip.add(l.roadmap_exercise_id);
      });
      setCompletedIds(done);
      setSkippedIds(skip);
      setLoading(false);
    };
    fetchWorkout();
  }, [user]);

  // Rest timer
  useEffect(() => {
    if (!restActive || restTimer <= 0) return;
    const t = setInterval(() => {
      setRestTimer((p) => {
        if (p <= 1) { setRestActive(false); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [restActive, restTimer]);

  const startRest = (seconds: number) => {
    setRestTimer(seconds);
    setRestActive(true);
  };

  const logExercise = async (exerciseId: string, completed: boolean, skipped: boolean) => {
    if (!user || !activeRoadmap) return;
    await supabase.from("workout_logs").insert({
      user_id: user.id,
      user_roadmap_id: activeRoadmap.id,
      roadmap_exercise_id: exerciseId,
      day_number: activeRoadmap.current_day,
      completed,
      skipped,
    });

    if (completed) {
      setCompletedIds((p) => new Set(p).add(exerciseId));
    }
    if (skipped) {
      setSkippedIds((p) => new Set(p).add(exerciseId));
    }
  };

  const completeWorkout = async () => {
    if (!activeRoadmap) return;
    await supabase
      .from("user_roadmaps")
      .update({ current_day: (activeRoadmap.current_day || 1) + 1 })
      .eq("id", activeRoadmap.id);
    navigate("/dashboard");
  };

  const totalExercises = exercises.length;
  const doneCount = completedIds.size + skippedIds.size;
  const progress = totalExercises > 0 ? (doneCount / totalExercises) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading workout...</div>
      </div>
    );
  }

  if (!activeRoadmap) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="container flex items-center gap-3 h-16">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-display font-bold text-foreground text-lg">Today's Workout</h1>
          </div>
        </header>
        <main className="container py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Map className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="font-display font-bold text-xl text-foreground mb-2">No active roadmap</h2>
          <p className="text-muted-foreground mb-6">Select a roadmap to start training</p>
          <Button onClick={() => navigate("/roadmaps")}>Browse Roadmaps</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container flex items-center gap-3 h-16">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display font-bold text-foreground text-lg">Day {activeRoadmap.current_day}</h1>
            <p className="text-xs text-muted-foreground">{activeRoadmap.fitness_roadmaps?.title}</p>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6 max-w-2xl">
        {/* Progress */}
        <div className="animate-fade-up">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-foreground">{doneCount}/{totalExercises}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Rest Timer */}
        {restActive && (
          <Card className="border-primary/30 bg-primary/5 animate-fade-up">
            <CardContent className="pt-4 text-center">
              <Timer className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-3xl font-display font-bold text-foreground">{restTimer}s</p>
              <p className="text-sm text-muted-foreground">Rest time remaining</p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setRestActive(false); setRestTimer(0); }}>
                Skip Rest
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Exercise Cards */}
        {exercises.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No exercises scheduled for today. Try the next day!
          </div>
        ) : (
          <div className="space-y-4">
            {exercises.map((ex, i) => {
              const isDone = completedIds.has(ex.id);
              const isSkipped = skippedIds.has(ex.id);
              const handled = isDone || isSkipped;

              return (
                <Card
                  key={ex.id}
                  className={`border-border/50 transition-all opacity-0 animate-fade-up ${
                    isDone ? "bg-success/5 border-success/20" : isSkipped ? "bg-muted/50 opacity-60" : ""
                  }`}
                  style={{ animationDelay: `${i * 60}ms`, animationFillMode: "forwards" }}
                >
                  <CardContent className="pt-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isDone ? "bg-success/10" : "bg-primary/10"
                      }`}>
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        ) : (
                          <Dumbbell className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-semibold text-foreground">{ex.exercises?.name}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">{ex.exercises?.description}</p>
                        <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                          {ex.sets && <Badge variant="secondary">{ex.sets} sets</Badge>}
                          {ex.reps && <Badge variant="secondary">{ex.reps} reps</Badge>}
                          {ex.rest_seconds && <Badge variant="secondary">{ex.rest_seconds}s rest</Badge>}
                        </div>
                        {!handled && (
                          <div className="flex gap-2 mt-4">
                            <Button
                              size="sm"
                              onClick={() => {
                                logExercise(ex.id, true, false);
                                if (ex.rest_seconds) startRest(ex.rest_seconds);
                              }}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" /> Done
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => logExercise(ex.id, false, true)}
                            >
                              <SkipForward className="w-4 h-4 mr-1" /> Skip
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Complete button */}
        {doneCount === totalExercises && totalExercises > 0 && (
          <Button className="w-full" size="lg" onClick={completeWorkout}>
            Complete Workout & Move to Next Day
          </Button>
        )}
      </main>
    </div>
  );
};

export default Workout;
