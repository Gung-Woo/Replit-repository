import { useAuth } from "@/hooks/use-auth";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, InsertUser } from "@shared/schema";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const { toast } = useToast();

  const loginForm = useForm({
    resolver: zodResolver(
      insertUserSchema.pick({ username: true, password: true })
    ),
    defaultValues: {
      username: "",
      password: ""
    }
  });

  const registerForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      city: "",
      state: "",
      country: "",
      avatar: ""
    }
  });

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      // Create preview URL for the selected image
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegister: SubmitHandler<InsertUser> = async (data) => {
    if (!avatarFile) {
      toast({
        title: "Avatar Required",
        description: "Please select an avatar image",
        variant: "destructive"
      });
      return;
    }

    // Create FormData and append all user data
    const formData = new FormData();
    formData.append("avatar", avatarFile);
    Object.entries(data).forEach(([key, value]) => {
      if (key !== "avatar") {
        formData.append(key, value as string);
      }
    });

    registerMutation.mutate(formData as any);
  };

  if (user) {
    setLocation("/");
    return null;
  }

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
                <TabsTrigger value="register">Register</TabsTrigger>
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

              <TabsContent value="register" className="space-y-4">
                <form
                  onSubmit={registerForm.handleSubmit(handleRegister)}
                  className="space-y-4"
                  encType="multipart/form-data"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input {...registerForm.register("firstName")} />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input {...registerForm.register("lastName")} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input {...registerForm.register("username")} />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      type="password"
                      {...registerForm.register("password")}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input {...registerForm.register("city")} />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input {...registerForm.register("state")} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input {...registerForm.register("country")} />
                  </div>
                  <div>
                    <Label htmlFor="avatar">Avatar</Label>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                        />
                      </div>
                      {avatarPreview && (
                        <img
                          src={avatarPreview}
                          alt="Avatar preview"
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      )}
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Register
                  </Button>
                </form>
              </TabsContent>
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