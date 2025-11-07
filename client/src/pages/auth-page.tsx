import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, UserCircle } from "lucide-react";
import schoolPattern from "@assets/generated_images/Cartoon_school_objects_background_pattern_1ab3a6ac.png";

const avatarOptions = [
  { emoji: "🐶", label: "Dog" },
  { emoji: "🐱", label: "Cat" },
  { emoji: "🐻", label: "Bear" },
  { emoji: "🦊", label: "Fox" },
  { emoji: "🐼", label: "Panda" },
  { emoji: "🦁", label: "Lion" },
  { emoji: "🐯", label: "Tiger" },
  { emoji: "🐸", label: "Frog" },
  { emoji: "🐵", label: "Monkey" },
  { emoji: "🦉", label: "Owl" },
  { emoji: "🦄", label: "Unicorn" },
  { emoji: "🐲", label: "Dragon" },
];

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();

  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({
    username: "",
    password: "",
    selectedAvatar: avatarOptions[0].emoji,
  });

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginData);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(registerData);
  };

  return (
    <div 
      className="min-h-screen flex relative"
      style={{
        background: 'linear-gradient(135deg, #E9D5FF 0%, #DBEAFE 25%, #FCE7F3 50%, #FEF3C7 75%, #D1FAE5 100%)',
      }}
    >
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url(${schoolPattern})`,
          backgroundSize: '300px 300px',
          backgroundRepeat: 'repeat',
          backgroundPosition: 'center',
        }}
      ></div>
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <Sparkles className="w-16 h-16 text-purple-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 mb-2 font-crayon">Spelling Champions</h1>
            <p className="text-gray-600">Create an account or log in to start your spelling adventure!</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Username</Label>
                  <Input
                    id="login-username"
                    type="text"
                    value={loginData.username}
                    onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                    placeholder="Enter your username"
                    required
                    data-testid="input-login-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    placeholder="Enter your password"
                    required
                    data-testid="input-login-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? "Logging in..." : "Log In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-username">Username</Label>
                  <Input
                    id="register-username"
                    type="text"
                    value={registerData.username}
                    onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                    placeholder="Choose a username"
                    required
                    minLength={3}
                    data-testid="input-register-username"
                  />
                  <p className="text-sm text-gray-500">This will be shown on the leaderboard</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    placeholder="Create a password"
                    required
                    minLength={6}
                    data-testid="input-register-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Choose Your Avatar</Label>
                  <div className="grid grid-cols-6 gap-2">
                    {avatarOptions.map((avatar) => (
                      <button
                        key={avatar.emoji}
                        type="button"
                        onClick={() => setRegisterData({ ...registerData, selectedAvatar: avatar.emoji })}
                        className={`
                          aspect-square rounded-lg text-3xl flex items-center justify-center
                          transition-all hover-elevate active-elevate-2
                          ${registerData.selectedAvatar === avatar.emoji
                            ? "bg-purple-100 border-2 border-purple-600"
                            : "bg-white border border-gray-200"
                          }
                        `}
                        data-testid={`button-avatar-${avatar.label.toLowerCase()}`}
                        aria-label={avatar.label}
                      >
                        {avatar.emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={registerMutation.isPending}
                  data-testid="button-register"
                >
                  {registerMutation.isPending ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-purple-600 via-blue-600 to-pink-600 items-center justify-center p-12 relative z-10">
        <div className="text-white text-center space-y-6 max-w-lg">
          <UserCircle className="w-32 h-32 mx-auto opacity-90" />
          <h2 className="text-4xl font-bold">Join the Fun!</h2>
          <p className="text-xl opacity-90">
            Create your profile, choose your avatar, and compete on the leaderboard with spelling champions from around the world!
          </p>
          <div className="space-y-2 text-lg opacity-80">
            <p>✨ Track your progress</p>
            <p>🏆 Compete on leaderboards</p>
            <p>🎮 Multiple game modes</p>
            <p>🎨 Personalize your profile</p>
          </div>
        </div>
      </div>
    </div>
  );
}
