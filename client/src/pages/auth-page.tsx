import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/hooks/use-theme";
import titleBanner from "@assets/image_1763494070680.png";

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
  const { toast } = useToast();
  const { themeAssets } = useTheme();

  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({
    username: "",
    password: "",
    firstName: "",
    lastName: "",
    email: "",
    selectedAvatar: avatarOptions[0].emoji,
  });
  
  const [customAvatarFile, setCustomAvatarFile] = useState<File | null>(null);
  const [customAvatarPreview, setCustomAvatarPreview] = useState<string | null>(null);

  // Password reset dialog state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState("");

  const resetPasswordMutation = useMutation({
    mutationFn: async (identifier: string) => {
      const response = await apiRequest("POST", "/api/auth/request-password-reset", { identifier });
      return response.json();
    },
    onSuccess: () => {
      setResetDialogOpen(false);
      setResetIdentifier("");
      toast({
        title: "Password Reset Email Sent",
        description: "If an account exists with that username or email, you will receive a password reset link shortly.",
      });
    },
    onError: (error: any) => {
      setResetDialogOpen(false);
      setResetIdentifier("");
      toast({
        title: "Password Reset Not Available",
        description: error.message || "Unable to send password reset email. Please try logging in or contact support.",
        variant: "destructive",
      });
    },
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let avatarUrl = registerData.selectedAvatar;
    
    // Upload custom avatar if selected
    if (customAvatarFile && registerData.selectedAvatar === "custom") {
      try {
        const formData = new FormData();
        formData.append('avatar', customAvatarFile);
        
        const uploadRes = await fetch('/api/upload-avatar', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadRes.ok) {
          throw new Error('Failed to upload avatar');
        }
        
        const uploadData = await uploadRes.json();
        avatarUrl = uploadData.avatarUrl;
      } catch (error) {
        toast({
          title: "Avatar Upload Failed",
          description: "Failed to upload custom avatar. Using default instead.",
          variant: "destructive",
        });
        avatarUrl = avatarOptions[0].emoji; // Fallback to first emoji
      }
    }
    
    registerMutation.mutate({
      ...registerData,
      selectedAvatar: avatarUrl,
    });
  };

  const handleResetPasswordRequest = (e: React.FormEvent) => {
    e.preventDefault();
    resetPasswordMutation.mutate(resetIdentifier);
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Avatar image must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setCustomAvatarFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomAvatarPreview(reader.result as string);
        setRegisterData({ ...registerData, selectedAvatar: "custom" });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
    >
      {/* Portrait background */}
      <div 
        className="fixed inset-0 portrait:block landscape:hidden"
        style={{
          backgroundImage: `url(${themeAssets.backgroundPortrait})`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center top',
        }}
      ></div>
      {/* Landscape background */}
      <div 
        className="fixed inset-0 portrait:hidden landscape:block"
        style={{
          backgroundImage: `url(${themeAssets.backgroundLandscape})`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center top',
        }}
      ></div>
      <div className="fixed inset-0 bg-white/5 dark:bg-black/50"></div>
      <Card className="w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <img 
              src={titleBanner} 
              alt="Spelling Champions" 
              className="w-full max-w-xs h-auto rounded-md"
              data-testid="img-title-banner"
            />
          </div>
          <p className="text-muted-foreground">Create an account or log in to start your spelling adventure!</p>
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password">Password</Label>
                  <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="text-sm text-primary hover:underline"
                        data-testid="link-forgot-password"
                      >
                        Forgot password?
                      </button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                          Enter your username or email address. If your account has an email on file, we'll send you a password reset link.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleResetPasswordRequest} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="reset-identifier">Username or Email</Label>
                          <Input
                            id="reset-identifier"
                            type="text"
                            value={resetIdentifier}
                            onChange={(e) => setResetIdentifier(e.target.value)}
                            placeholder="Enter your username or email"
                            required
                            data-testid="input-reset-identifier"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setResetDialogOpen(false);
                              setResetIdentifier("");
                            }}
                            data-testid="button-cancel-reset"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            className="flex-1"
                            disabled={resetPasswordMutation.isPending}
                            data-testid="button-submit-reset"
                          >
                            {resetPasswordMutation.isPending ? "Sending..." : "Send Reset Link"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="register-first-name">First Name</Label>
                  <Input
                    id="register-first-name"
                    type="text"
                    value={registerData.firstName}
                    onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                    placeholder="First name"
                    data-testid="input-register-firstname"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-last-name">Last Name</Label>
                  <Input
                    id="register-last-name"
                    type="text"
                    value={registerData.lastName}
                    onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                    placeholder="Last name"
                    data-testid="input-register-lastname"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  placeholder="your.email@example.com"
                  data-testid="input-register-email"
                />
                <p className="text-sm text-gray-500">Used for password reset requests</p>
              </div>
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
                      onClick={() => {
                        setRegisterData({ ...registerData, selectedAvatar: avatar.emoji });
                        setCustomAvatarFile(null);
                        setCustomAvatarPreview(null);
                      }}
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
                <div className="pt-2">
                  <Label htmlFor="custom-avatar-upload" className="cursor-pointer">
                    <div 
                      className={`
                        border-2 border-dashed rounded-lg p-4 flex items-center justify-center gap-3 transition-all hover-elevate active-elevate-2
                        ${registerData.selectedAvatar === "custom"
                          ? "border-purple-600 bg-purple-50"
                          : "border-gray-300 bg-white"
                        }
                      `}
                    >
                      {customAvatarPreview ? (
                        <>
                          <img 
                            src={customAvatarPreview} 
                            alt="Custom avatar preview" 
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <span className="text-sm font-medium">Custom Avatar Selected</span>
                        </>
                      ) : (
                        <>
                          <UserCircle className="w-6 h-6 text-gray-400" />
                          <span className="text-sm font-medium">Upload Custom Avatar</span>
                        </>
                      )}
                    </div>
                    <Input
                      id="custom-avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileChange}
                      className="hidden"
                      data-testid="input-custom-avatar"
                    />
                  </Label>
                  <p className="text-sm text-gray-500 mt-1">Max 5MB, JPG/PNG/GIF</p>
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
  );
}
