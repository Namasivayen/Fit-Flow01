import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Target, Ruler, Weight, Utensils, Activity, Calendar, Dumbbell } from "lucide-react";
import WorkoutSchedule from "@/components/WorkoutSchedule";

export default function Profile() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ["profile-stats", user?.id],
    queryFn: async () => {
      const [logs, scores, activeRoadmap] = await Promise.all([
        supabase
          .from("workout_logs")
          .select("id, completed, skipped")
          .eq("user_id", user!.id),
        supabase
          .from("readiness_scores")
          .select("score, category")
          .eq("user_id", user!.id)
          .order("score_date", { ascending: false })
          .limit(7),
        supabase
          .from("user_roadmaps")
          .select("*, fitness_roadmaps(title, difficulty, duration_weeks)")
          .eq("user_id", user!.id)
          .eq("is_active", true)
          .maybeSingle(),
      ]);

      const completed = logs.data?.filter((l) => l.completed).length ?? 0;
      const skipped = logs.data?.filter((l) => l.skipped).length ?? 0;
      const avgScore =
        scores.data && scores.data.length > 0
          ? Math.round(
              scores.data.reduce((s, r) => s + r.score, 0) / scores.data.length
            )
          : null;

      return {
        totalWorkouts: logs.data?.length ?? 0,
        completed,
        skipped,
        avgReadiness: avgScore,
        latestCategory: scores.data?.[0]?.category ?? null,
        activeRoadmap: activeRoadmap.data,
      };
    },
    enabled: !!user,
  });

  const infoItems = [
    { icon: Calendar, label: "Age", value: profile?.age ? `${profile.age} yrs` : "—" },
    { icon: Ruler, label: "Height", value: profile?.height_cm ? `${profile.height_cm} cm` : "—" },
    { icon: Weight, label: "Weight", value: profile?.weight_kg ? `${profile.weight_kg} kg` : "—" },
    { icon: Target, label: "Goal", value: profile?.fitness_goal || "—" },
    { icon: Activity, label: "Activity", value: profile?.activity_level || "—" },
    { icon: Utensils, label: "Diet", value: profile?.diet_preference || "—" },
  ];

  const statCards = [
    { label: "Workouts Done", value: stats?.completed ?? 0 },
    { label: "Skipped", value: stats?.skipped ?? 0 },
    { label: "Avg Readiness", value: stats?.avgReadiness != null ? `${stats.avgReadiness}%` : "—" },
  ];

  return (
    <div className="container max-w-2xl py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold">Your Profile</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold tabular-nums">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Roadmap */}
      {stats?.activeRoadmap && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-primary" />
              Active Roadmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">
              {(stats.activeRoadmap as any).fitness_roadmaps?.title}
            </p>
            <p className="text-sm text-muted-foreground">
              Day {stats.activeRoadmap.current_day} ·{" "}
              {(stats.activeRoadmap as any).fitness_roadmaps?.difficulty} ·{" "}
              {(stats.activeRoadmap as any).fitness_roadmaps?.duration_weeks}w
            </p>
          </CardContent>
        </Card>
      )}

      {/* Workout Schedule */}
      <WorkoutSchedule />

      {/* Profile Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Fitness Profile</CardTitle>
          <CardDescription>Collected during onboarding</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-y-3 gap-x-6">
            {infoItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">{item.label}:</span>
                <span className="text-sm font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Readiness badge */}
      {stats?.latestCategory && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Latest readiness:
          <Badge
            variant={
              stats.latestCategory === "High"
                ? "default"
                : stats.latestCategory === "Moderate"
                ? "secondary"
                : "destructive"
            }
          >
            {stats.latestCategory}
          </Badge>
        </div>
      )}
    </div>
  );
}
