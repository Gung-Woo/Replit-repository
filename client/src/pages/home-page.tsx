import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { Fast, Meal } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  PlayCircle,
  StopCircle,
  Timer,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [mealDescription, setMealDescription] = useState("");
  const [endFastNote, setEndFastNote] = useState("");
  const [showEndFastDialog, setShowEndFastDialog] = useState(false);

  // Only fetch fasts if we have a user
  const { data: fasts, isLoading: fastsLoading } = useQuery<Fast[]>({
    queryKey: ["/api/fasts"],
    enabled: !!user,
  });

  const activeFast = fasts?.find((f) => f.isActive);

  // Only fetch meals if we have an active fast
  const { data: meals, isLoading: mealsLoading } = useQuery<Meal[]>({
    queryKey: ["/api/fasts", activeFast?.id, "meals"],
    enabled: !!activeFast,
  });

  const startFastMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/fasts/start");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fasts"] });
      toast({ title: "Fast started successfully" });
    },
  });

  const endFastMutation = useMutation({
    mutationFn: async (fastId: number) => {
      const res = await apiRequest("POST", `/api/fasts/${fastId}/end`, {
        note: endFastNote
      });
      return res.json();
    },
    onSuccess: () => {
      setEndFastNote("");
      setShowEndFastDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/fasts"] });
      toast({ title: "Fast ended successfully" });
    },
  });

  const addMealMutation = useMutation({
    mutationFn: async ({ fastId, description }: { fastId: number; description: string }) => {
      console.log("Starting meal creation request:", { fastId, description });
      try {
        const res = await apiRequest("POST", `/api/fasts/${fastId}/meals`, {
          description,
        });
        const data = await res.json();
        console.log("Server response for meal creation:", data);
        if (!data.id) {
          throw new Error("Server returned success but meal was not created");
        }
        return data;
      } catch (error) {
        console.error("Error in meal creation:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Meal creation succeeded:", data);
      setMealDescription("");
      // Specifically invalidate the meals query for this fast
      queryClient.invalidateQueries({ 
        queryKey: ["/api/fasts", activeFast?.id, "meals"]
      });
      // Also invalidate the fasts list to ensure everything is in sync
      queryClient.invalidateQueries({ 
        queryKey: ["/api/fasts"]
      });
      toast({ title: "Meal logged successfully" });
    },
    onError: (error: Error) => {
      console.error("Failed to add meal:", error);
      toast({
        title: "Failed to add meal",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  function formatDuration(start: Date, end: Date | null = null) {
    const endTime = end || new Date();
    const diff = new Date(endTime).getTime() - new Date(start).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  if (!user || fastsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">TREat Tracker</h1>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">
              Welcome, {user.firstName}
            </span>
            <Button 
              variant="ghost" 
              onClick={() => logoutMutation.mutate()}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h2 className="text-xl font-semibold">Active Fast</h2>
              {activeFast ? (
                <Dialog open={showEndFastDialog} onOpenChange={setShowEndFastDialog}>
                  <DialogTrigger asChild>
                    <Button variant="destructive">
                      <StopCircle className="mr-2 h-4 w-4" />
                      End Fast
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>End Fast</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="note">Add a note about your fast (optional)</Label>
                        <Textarea
                          id="note"
                          placeholder="How did this fast go? How do you feel?"
                          value={endFastNote}
                          onChange={(e) => setEndFastNote(e.target.value)}
                        />
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => endFastMutation.mutate(activeFast.id)}
                        disabled={endFastMutation.isPending}
                      >
                        {endFastMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        End Fast
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <Button
                  onClick={() => startFastMutation.mutate()}
                  disabled={startFastMutation.isPending}
                >
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Start Fast
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {activeFast ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span>Started: {new Date(activeFast.startTime).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Timer className="h-5 w-5 text-muted-foreground" />
                    <span>Duration: {formatDuration(activeFast.startTime)}</span>
                  </div>

                  {/* Meals Section */}
                  <div className="border-t pt-4 mt-4">
                    <h3 className="font-medium mb-2">Meals During Fast</h3>
                    {mealsLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="space-y-2 mb-4">
                        {meals?.map((meal) => (
                          <div
                            key={meal.id}
                            className="p-2 rounded-lg border flex justify-between items-center"
                          >
                            <span>{meal.description}</span>
                            <span className="text-sm text-muted-foreground">
                              {new Date(meal.mealTime).toLocaleString()}
                            </span>
                          </div>
                        ))}
                        {!meals?.length && (
                          <p className="text-sm text-muted-foreground">No meals logged yet</p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Input
                        placeholder="Log a meal..."
                        value={mealDescription}
                        onChange={(e) => setMealDescription(e.target.value)}
                        disabled={addMealMutation.isPending}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && mealDescription.trim() && !addMealMutation.isPending) {
                            console.log("Adding meal via Enter key:", {
                              fastId: activeFast!.id,
                              description: mealDescription
                            });
                            addMealMutation.mutate({
                              fastId: activeFast!.id,
                              description: mealDescription.trim(),
                            });
                          }
                        }}
                      />
                      <Button 
                        className="w-full"
                        onClick={() => {
                          if (mealDescription.trim()) {
                            console.log("Adding meal via button click:", {
                              fastId: activeFast!.id,
                              description: mealDescription
                            });
                            addMealMutation.mutate({
                              fastId: activeFast!.id,
                              description: mealDescription.trim(),
                            });
                          }
                        }}
                        disabled={addMealMutation.isPending || !mealDescription.trim()}
                      >
                        {addMealMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Add Meal
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No active fast. Start one to begin tracking!
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Fasting History</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fasts?.filter((f) => !f.isActive).map((fast) => (
                  <div
                    key={fast.id}
                    className="p-4 rounded-lg border"
                  >
                    <div className="flex items-center justify-between">
                      <span>{new Date(fast.startTime).toLocaleDateString()}</span>
                      <span className="font-medium">
                        {formatDuration(fast.startTime, fast.endTime!)}
                      </span>
                    </div>
                    {fast.note && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {fast.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}