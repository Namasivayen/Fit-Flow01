import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dumbbell, ArrowLeft, Clock, BarChart3, Filter, ArrowRight } from "lucide-react";

const categories = ["All", "Strength & Workouts", "Cardio Conditioning", "Yoga & Mobility", "Targeted Exercises", "Physical Activities"];
const difficulties = ["All", "Beginner", "Intermediate", "Advanced"];

const difficultyColor: Record<string, string> = {
  Beginner: "bg-success/10 text-success border-success/20",
  Intermediate: "bg-warning/10 text-warning border-warning/20",
  Advanced: "bg-destructive/10 text-destructive border-destructive/20",
};

const Roadmaps = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [roadmaps, setRoadmaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [activeRoadmap, setActiveRoadmap] = useState<any>(null);

  useEffect(() => {
    const fetch = async () => {
      let query = supabase.from("fitness_roadmaps").select("*").eq("is_published", true);
      if (category !== "All") query = query.eq("category", category);
      if (difficulty !== "All") query = query.eq("difficulty", difficulty);
      const { data } = await query.order("created_at");
      setRoadmaps(data || []);
      setLoading(false);
    };
    fetch();
  }, [category, difficulty]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roadmaps")
      .select("*, fitness_roadmaps(*)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => setActiveRoadmap(data));
  }, [user]);

  const activateRoadmap = async (roadmapId: string) => {
    if (!user) return;
    if (activeRoadmap) {
      await supabase
        .from("user_roadmaps")
        .update({ is_active: false, completed_at: new Date().toISOString() })
        .eq("id", activeRoadmap.id);
    }
    const { error } = await supabase.from("user_roadmaps").insert({
      user_id: user.id,
      roadmap_id: roadmapId,
      is_active: true,
      current_day: 1,
    });
    if (!error) {
      navigate("/workout");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container flex items-center gap-3 h-16">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display font-bold text-foreground text-lg">Fitness Roadmaps</h1>
            <p className="text-xs text-muted-foreground">Choose your training plan</p>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 animate-fade-up">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[200px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="w-[160px]">
              <BarChart3 className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {difficulties.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Active roadmap banner */}
        {activeRoadmap && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-primary font-medium uppercase tracking-wide">Active Plan</p>
                <p className="font-display font-bold text-foreground">
                  {activeRoadmap.fitness_roadmaps?.title}
                </p>
                <p className="text-sm text-muted-foreground">Day {activeRoadmap.current_day}</p>
              </div>
              <Button size="sm" onClick={() => navigate("/workout")}>
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Roadmap cards */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading roadmaps...</div>
        ) : roadmaps.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No roadmaps found for these filters.</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {roadmaps.map((rm, i) => (
              <Card
                key={rm.id}
                className="border-border/50 hover:shadow-md transition-shadow opacity-0 animate-fade-up"
                style={{ animationDelay: `${i * 80}ms`, animationFillMode: "forwards" }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="font-display text-base">{rm.title}</CardTitle>
                      <CardDescription className="mt-1 text-xs">{rm.category}</CardDescription>
                    </div>
                    <Badge variant="outline" className={difficultyColor[rm.difficulty]}>
                      {rm.difficulty}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {rm.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {rm.duration_weeks} weeks
                    </span>
                  </div>
                  <Button
                    className="w-full"
                    variant={activeRoadmap?.roadmap_id === rm.id ? "secondary" : "default"}
                    disabled={activeRoadmap?.roadmap_id === rm.id}
                    onClick={() => activateRoadmap(rm.id)}
                  >
                    {activeRoadmap?.roadmap_id === rm.id ? "Currently Active" : "Start This Plan"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Roadmaps;
