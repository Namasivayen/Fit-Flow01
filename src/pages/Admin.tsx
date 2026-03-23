import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Plus,
  Dumbbell,
  Route,
  Users,
  BarChart3,
} from "lucide-react";

// ── Exercises Tab ──────────────────────────────────────────────

function ExercisesTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", category: "", muscle_group: "", video_url: "", image_url: "" });

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ["admin-exercises"],
    queryFn: async () => {
      const { data, error } = await supabase.from("exercises").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const addExercise = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("exercises").insert({
        name: form.name,
        description: form.description || null,
        category: form.category || null,
        muscle_group: form.muscle_group || null,
        video_url: form.video_url || null,
        image_url: form.image_url || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-exercises"] });
      toast.success("Exercise added");
      setForm({ name: "", description: "", category: "", muscle_group: "", video_url: "", image_url: "" });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const categories = ["Strength", "Cardio", "Yoga", "Mobility", "HIIT"];
  const muscles = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Full Body"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Exercise Library</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Exercise</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Exercise</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Muscle Group</Label>
                  <Select value={form.muscle_group} onValueChange={v => setForm(p => ({ ...p, muscle_group: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{muscles.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Video URL</Label><Input value={form.video_url} onChange={e => setForm(p => ({ ...p, video_url: e.target.value }))} /></div>
              <div><Label>Image URL</Label><Input value={form.image_url} onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))} /></div>
              <Button className="w-full" disabled={!form.name || addExercise.isPending} onClick={() => addExercise.mutate()}>
                {addExercise.isPending ? "Saving…" : "Save Exercise"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground animate-pulse py-8 text-center">Loading exercises…</div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Muscle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exercises.map(ex => (
                <TableRow key={ex.id}>
                  <TableCell className="font-medium">{ex.name}</TableCell>
                  <TableCell>{ex.category ? <Badge variant="secondary">{ex.category}</Badge> : "—"}</TableCell>
                  <TableCell>{ex.muscle_group || "—"}</TableCell>
                </TableRow>
              ))}
              {exercises.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No exercises yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ── Roadmaps Tab ───────────────────────────────────────────────

function RoadmapsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "", difficulty: "", duration_weeks: 4, diet_guidelines: "" });

  const { data: roadmaps = [], isLoading } = useQuery({
    queryKey: ["admin-roadmaps"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fitness_roadmaps").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addRoadmap = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("fitness_roadmaps").insert({
        title: form.title,
        description: form.description || null,
        category: form.category,
        difficulty: form.difficulty,
        duration_weeks: form.duration_weeks,
        diet_guidelines: form.diet_guidelines || null,
        is_published: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-roadmaps"] });
      toast.success("Roadmap created (unpublished)");
      setForm({ title: "", description: "", category: "", difficulty: "", duration_weeks: 4, diet_guidelines: "" });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }) => {
      const { error } = await supabase.from("fitness_roadmaps").update({ is_published: publish }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-roadmaps"] });
      toast.success("Roadmap updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const categories = ["Strength & Workouts", "Cardio Conditioning", "Targeted Exercises", "Yoga & Mobility", "Physical Activities"];
  const difficulties = ["Beginner", "Intermediate", "Advanced"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Fitness Roadmaps</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Create Roadmap</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New Roadmap</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category *</Label>
                  <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Difficulty *</Label>
                  <Select value={form.difficulty} onValueChange={v => setForm(p => ({ ...p, difficulty: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{difficulties.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Duration (weeks)</Label><Input type="number" min={1} max={52} value={form.duration_weeks} onChange={e => setForm(p => ({ ...p, duration_weeks: parseInt(e.target.value) || 4 }))} /></div>
              <div><Label>Diet Guidelines</Label><Textarea value={form.diet_guidelines} onChange={e => setForm(p => ({ ...p, diet_guidelines: e.target.value }))} /></div>
              <Button className="w-full" disabled={!form.title || !form.category || !form.difficulty || addRoadmap.isPending} onClick={() => addRoadmap.mutate()}>
                {addRoadmap.isPending ? "Saving…" : "Create Roadmap"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground animate-pulse py-8 text-center">Loading roadmaps…</div>
      ) : (
        <div className="space-y-3">
          {roadmaps.map(rm => (
            <Card key={rm.id}>
              <CardContent className="flex items-center justify-between py-4 px-5">
                <div className="space-y-1">
                  <div className="font-medium flex items-center gap-2">
                    {rm.title}
                    <Badge variant={rm.is_published ? "default" : "outline"}>
                      {rm.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{rm.category} · {rm.difficulty} · {rm.duration_weeks}w</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={rm.is_published ?? false}
                    onCheckedChange={checked => togglePublish.mutate({ id: rm.id, publish: checked })}
                  />
                  <span className="text-xs text-muted-foreground w-16">{rm.is_published ? "Live" : "Hidden"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {roadmaps.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No roadmaps created yet</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Users Tab ──────────────────────────────────────────────────

function UsersTab() {
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">User Accounts</h2>
      {isLoading ? (
        <div className="text-muted-foreground animate-pulse py-8 text-center">Loading users…</div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Goal</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Onboarded</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.user_id.slice(0, 8)}…</TableCell>
                  <TableCell>{p.fitness_goal || "—"}</TableCell>
                  <TableCell>{p.activity_level || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={p.onboarding_completed ? "default" : "outline"}>
                      {p.onboarding_completed ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {profiles.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No users yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ── Stats Tab ──────────────────────────────────────────────────

function StatsTab() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, roadmaps, exercises, logs] = await Promise.all([
        supabase.from("user_profiles").select("id", { count: "exact", head: true }),
        supabase.from("fitness_roadmaps").select("id", { count: "exact", head: true }),
        supabase.from("exercises").select("id", { count: "exact", head: true }),
        supabase.from("workout_logs").select("id", { count: "exact", head: true }),
      ]);
      return {
        users: users.count ?? 0,
        roadmaps: roadmaps.count ?? 0,
        exercises: exercises.count ?? 0,
        workoutLogs: logs.count ?? 0,
      };
    },
  });

  const cards = [
    { label: "Total Users", value: stats?.users ?? "—", icon: Users },
    { label: "Roadmaps", value: stats?.roadmaps ?? "—", icon: Route },
    { label: "Exercises", value: stats?.exercises ?? "—", icon: Dumbbell },
    { label: "Workout Logs", value: stats?.workoutLogs ?? "—", icon: BarChart3 },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(c => (
        <Card key={c.label}>
          <CardContent className="pt-5 pb-4 text-center space-y-1">
            <c.icon className="h-5 w-5 mx-auto text-muted-foreground" />
            <p className="text-2xl font-bold tabular-nums">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Main Admin Page ────────────────────────────────────────────

export default function Admin() {
  const navigate = useNavigate();

  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        <h1 className="text-xl font-display font-bold">Admin Panel</h1>
        <StatsTab />

        <Tabs defaultValue="roadmaps" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="roadmaps">Roadmaps</TabsTrigger>
            <TabsTrigger value="exercises">Exercises</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>
          <TabsContent value="roadmaps"><RoadmapsTab /></TabsContent>
          <TabsContent value="exercises"><ExercisesTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
