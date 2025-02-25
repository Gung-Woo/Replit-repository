import { useAuth } from "@/hooks/use-auth";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const [, setLocation] = useLocation();
  console.log('AuthPage rendered, user state:', user); // Debug log

  useEffect(() => {
    // Only redirect if we have a user AND we're not in the process of logging in
    if (user && !loginMutation.isPending) {
      console.log('Redirecting to home, user exists:', user);
      setLocation("/");
    }
  }, [user, loginMutation.isPending, setLocation]);

  const loginForm = useForm({
    resolver: zodResolver(
      insertUserSchema.pick({ username: true, password: true })
    ),
    defaultValues: {
      username: "",
      password: ""
    }
  });

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-2xl font-bold text-center">
            TREat Tracker
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="login">Login</TabsTrigger>
                {/* Removed Register tab */}
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <form
                  onSubmit={loginForm.handleSubmit((data) =>
                    loginMutation.mutate({
                      username: data.username,
                      password: data.password
                    })
                  )}
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input {...loginForm.register("username")} />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      type="password"
                      {...loginForm.register("password")}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Login
                  </Button>
                </form>
              </TabsContent>
              {/* Removed Register TabsContent */}
            </Tabs>
          </CardContent>
        </Card>
      </div>
      <div className="hidden md:flex items-center justify-center bg-primary text-primary-foreground p-8">
        <div className="max-w-lg">
          <h1 className="text-4xl font-bold mb-4">
            Track Your Fasting Journey
          </h1>
          <p className="text-lg opacity-90">
            Welcome to TREat Tracker, your personal intermittent fasting companion.
            Log your fasts, track your meals, and achieve your health goals.
          </p>
        </div>
      </div>
    </div>
  );
}