import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogOut, Bell, Settings, Volume2, HelpCircle, Mail, BookOpen, Trophy, Gamepad2, List, Send, UserCircle, Palette, Lock, ShoppingCart, Copy } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, UserPlus, Users } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { appConfig } from "@/lib/config";
import { useLocation } from "wouter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { APP_VERSION } from "@shared/version";

export function UserHeader() {
  const { user, logoutMutation } = useAuth();
  const { currentTheme, themeAssets, setTheme, unlockedThemes, allThemes, isLoading: isThemeLoading } = useTheme();
  const [, setLocation] = useLocation();
  const [todoModalOpen, setTodoModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [guestIdOpen, setGuestIdOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Profile form state
  const [profileFirstName, setProfileFirstName] = useState("");
  const [profileLastName, setProfileLastName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [profileAvatarFile, setProfileAvatarFile] = useState<File | null>(null);
  const [profileAvatarPreview, setProfileAvatarPreview] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showWordHints, setShowWordHints] = useState(() => {
    const saved = localStorage.getItem('showWordHints');
    return saved !== null ? saved === 'true' : true;
  });
  
  // Ref to track if we need to persist a default voice to database (single-shot)
  const pendingDefaultVoiceRef = useRef<string | null>(null);
  const hasPersistedDefaultRef = useRef(false);
  // State to trigger retry on error (increments to re-trigger persistence useEffect)
  const [retryTrigger, setRetryTrigger] = useState(0);
  // Ref to track retry attempts and prevent infinite loops
  const retryAttemptsRef = useRef(0);
  const MAX_RETRY_ATTEMPTS = 3;
  // Ref to track the intended (most recent) voice selection
  const intendedVoiceRef = useRef<string | null>(null);
  
  // Initialize selectedVoice from saved preference immediately (synchronous)
  const [selectedVoice, setSelectedVoice] = useState<string | null>(() => {
    // Try to get saved preference from localStorage first
    const localStoragePreference = localStorage.getItem('preferredVoice');
    return localStoragePreference || null;
  });
  
  const { toast } = useToast();

  const { data: todoCount = 0 } = useQuery<number>({
    queryKey: ["/api/user-to-dos/count", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/user-to-dos/count", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch todo count");
      return await res.json();
    },
    enabled: !!user,
    refetchInterval: 30000, // Poll every 30 seconds for new notifications
    refetchOnWindowFocus: true, // Also check when user returns to tab
  });

  const { data: todos = [] } = useQuery<any[]>({
    queryKey: ["/api/user-to-dos", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/user-to-dos", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch todos");
      return await res.json();
    },
    enabled: !!user && todoModalOpen,
  });

  const { data: appVersion } = useQuery<{ version: string }>({
    queryKey: ["/api/app-version"],
    queryFn: async () => {
      const res = await fetch("/api/app-version");
      if (!res.ok) return { version: APP_VERSION };
      return await res.json();
    },
    staleTime: 60000,
  });

  const completeTodoMutation = useMutation({
    mutationFn: async (todoId: number) => {
      await apiRequest("POST", `/api/user-to-dos/${todoId}/complete`, {});
    },
    onMutate: async (todoId: number) => {
      if (!user?.id) return;
      
      await queryClient.cancelQueries({ queryKey: ["/api/user-to-dos", user.id] });
      await queryClient.cancelQueries({ queryKey: ["/api/user-to-dos/count", user.id] });

      const previousTodos = queryClient.getQueryData<any[]>(["/api/user-to-dos", user.id]);
      const previousCount = queryClient.getQueryData<number>(["/api/user-to-dos/count", user.id]);

      queryClient.setQueryData<any[]>(["/api/user-to-dos", user.id], (old) => 
        old ? old.filter(todo => todo.id !== todoId) : []
      );
      queryClient.setQueryData<number>(["/api/user-to-dos/count", user.id], (old) => 
        Math.max(0, (old || 1) - 1)
      );

      return { previousTodos, previousCount, userId: user.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-to-dos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-to-dos/count"] });
      toast({
        title: "Success!",
        description: "To-do completed",
      });
    },
    onError: (error: any, _todoId, context) => {
      if (context?.userId) {
        if (context.previousTodos) {
          queryClient.setQueryData(["/api/user-to-dos", context.userId], context.previousTodos);
        }
        if (context.previousCount !== undefined) {
          queryClient.setQueryData(["/api/user-to-dos/count", context.userId], context.previousCount);
        }
      }
      toast({
        title: "Error",
        description: error.message || "Failed to complete to-do",
        variant: "destructive",
      });
    },
  });

  const acceptInviteMutation = useMutation({
    mutationFn: async ({ groupId, todoId }: { groupId: number; todoId: number }) => {
      const response = await apiRequest("POST", `/api/user-groups/${groupId}/accept-invite`, {});
      return { data: await response.json(), todoId };
    },
    onSuccess: async (result) => {
      // Complete the todo only after successful acceptance
      await apiRequest("POST", `/api/user-to-dos/${result.todoId}/complete`, {});
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups", user?.id] });
      if (result.data?.groupId) {
        queryClient.invalidateQueries({ queryKey: ["/api/user-groups", result.data.groupId, "members"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/user-to-dos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-to-dos/count"] });
      // Invalidate shared word lists since joining a group may grant access to new lists
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists/shared-with-me"] });
      toast({
        title: "Success!",
        description: "You have joined the group",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept invite",
        variant: "destructive",
      });
    },
  });

  const approveAccessRequestMutation = useMutation({
    mutationFn: async ({ groupId, userId, todoId }: { groupId: number; userId: number; todoId: number }) => {
      const response = await apiRequest("POST", `/api/user-groups/${groupId}/approve-request`, { userId });
      return { data: await response.json(), todoId };
    },
    onSuccess: async (result) => {
      // Complete the todo only after successful approval
      await apiRequest("POST", `/api/user-to-dos/${result.todoId}/complete`, {});
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups", user?.id] });
      if (result.data?.groupId) {
        queryClient.invalidateQueries({ queryKey: ["/api/user-groups", result.data.groupId, "members"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/user-to-dos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-to-dos/count"] });
      // Invalidate shared word lists for the current user (approver)
      // Note: The newly approved member's cache won't update until they navigate or refresh
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists/shared-with-me"] });
      toast({
        title: "Success!",
        description: "User has been added to the group",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve request",
        variant: "destructive",
      });
    },
  });

  // Avatar options for profile edit
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

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName?: string; lastName?: string; email?: string; selectedAvatar?: string }) => {
      const response = await apiRequest("PATCH", "/api/user/profile", data);
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate user query to refresh auth context with updated profile
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setProfileOpen(false);
      toast({
        title: "Success!",
        description: "Profile updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  // Populate profile form when dialog opens
  useEffect(() => {
    if (profileOpen && user) {
      setProfileFirstName(user.firstName || "");
      setProfileLastName(user.lastName || "");
      setProfileEmail(user.email || "");
      setProfileAvatar(user.selectedAvatar || avatarOptions[0].emoji);
      setProfileAvatarFile(null);
      setProfileAvatarPreview(null);
    }
  }, [profileOpen, user]);

  const handleProfileAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      
      setProfileAvatarFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileAvatarPreview(reader.result as string);
        setProfileAvatar("custom");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    let avatarUrl = profileAvatar;
    
    // Upload custom avatar if selected
    if (profileAvatarFile && profileAvatar === "custom") {
      try {
        const formData = new FormData();
        formData.append('avatar', profileAvatarFile);
        
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
          description: "Failed to upload custom avatar. Keeping current avatar.",
          variant: "destructive",
        });
        avatarUrl = user?.selectedAvatar || avatarOptions[0].emoji;
      }
    }
    
    updateProfileMutation.mutate({
      firstName: profileFirstName,
      lastName: profileLastName,
      email: profileEmail,
      selectedAvatar: avatarUrl,
    });
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleAcceptInvite = (todo: any) => {
    acceptInviteMutation.mutate({ groupId: todo.groupId, todoId: todo.id });
  };

  const handleApproveRequest = (todo: any) => {
    approveAccessRequestMutation.mutate({ groupId: todo.groupId, userId: todo.requesterId, todoId: todo.id });
  };

  const handleDecline = (todoId: number) => {
    completeTodoMutation.mutate(todoId);
  };

  // Load available voices
  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setAvailableVoices([]);
      return;
    }

    const loadVoices = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        
        // Don't process until we have voices (Chrome loads async)
        if (voices.length === 0) {
          return;
        }
        
        const englishVoices = voices.filter(voice => voice.lang.startsWith('en'));
        setAvailableVoices(englishVoices);

        // Load voice preference from user profile
        const userPreference = user?.preferredVoice;
        const localStoragePreference = localStorage.getItem('preferredVoice');
        const savedVoice = userPreference || localStoragePreference;

        // If saved voice is valid, use it
        if (savedVoice && englishVoices.find(v => v.name === savedVoice)) {
          setSelectedVoice(savedVoice);
          return;
        }

        // Only set default if there's no saved preference at all and we haven't persisted one yet
        if (!savedVoice && englishVoices.length > 0 && !hasPersistedDefaultRef.current) {
          // Default to female US English voice
          const femaleVoiceNames = [
            'google us english female',
            'google uk english female',
            'microsoft zira',
            'samantha',
            'karen',
            'serena',
            'fiona',
            'tessa',
            'victoria',
            'susan',
            'female'
          ];

          let defaultVoice = null;
          
          // Try to find US English female voice first
          for (const voiceName of femaleVoiceNames) {
            defaultVoice = englishVoices.find(voice =>
              voice.name.toLowerCase().includes(voiceName) &&
              voice.lang.startsWith('en-US')
            );
            if (defaultVoice) break;
          }

          // Fallback to any female English voice
          if (!defaultVoice) {
            for (const voiceName of femaleVoiceNames) {
              defaultVoice = englishVoices.find(voice =>
                voice.name.toLowerCase().includes(voiceName)
              );
              if (defaultVoice) break;
            }
          }

          // Final fallback to first available voice
          if (!defaultVoice) {
            defaultVoice = englishVoices[0];
          }

          // Set and persist the default voice so other parts of the app can use it
          if (defaultVoice) {
            setSelectedVoice(defaultVoice.name);
            // Persist to localStorage so game and other components can access it
            localStorage.setItem('preferredVoice', defaultVoice.name);
            // Store in ref to trigger database persistence (single-shot)
            pendingDefaultVoiceRef.current = defaultVoice.name;
          }
        }
      } catch (error) {
        console.error('Error loading voices:', error);
        setAvailableVoices([]);
      }
    };

    loadVoices();

    const handleVoicesChanged = () => {
      loadVoices();
    };

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
    }

    return () => {
      // Cleanup: remove the handler
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [user]);

  // Sync voice preference from user profile when it loads
  useEffect(() => {
    if (user?.preferredVoice && user.preferredVoice !== selectedVoice) {
      setSelectedVoice(user.preferredVoice);
      localStorage.setItem('preferredVoice', user.preferredVoice);
    }
  }, [user?.preferredVoice]);

  // Mutation to update voice preference
  const updateVoicePreferenceMutation = useMutation({
    mutationFn: async (voiceName: string) => {
      return await apiRequest("PATCH", "/api/user", { preferredVoice: voiceName });
    },
    onSuccess: (_data, voiceName) => {
      // Check if this mutation result is stale (user has since selected a different voice)
      if (intendedVoiceRef.current && intendedVoiceRef.current !== voiceName) {
        // User selected a different voice while this mutation was in-flight
        // Re-send the correct (intended) voice to fix the race condition
        updateVoicePreferenceMutation.mutate(intendedVoiceRef.current);
        return; // Don't invalidate or show toast for stale update
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      // Only mark as persisted if this was an auto-default (not manual change)
      if (pendingDefaultVoiceRef.current === voiceName) {
        hasPersistedDefaultRef.current = true;
        pendingDefaultVoiceRef.current = null;
      }
      
      toast({
        title: "Success!",
        description: "Voice preference saved",
      });
    },
    onError: (error, voiceName) => {
      console.error("Failed to save voice preference:", error);
      
      // If this was an auto-default that failed, allow retry (up to MAX_RETRY_ATTEMPTS)
      if (pendingDefaultVoiceRef.current === voiceName) {
        retryAttemptsRef.current += 1;
        
        if (retryAttemptsRef.current < MAX_RETRY_ATTEMPTS) {
          hasPersistedDefaultRef.current = false;
          // Increment retry trigger to re-run persistence useEffect
          setRetryTrigger(prev => prev + 1);
        } else {
          // Max retries reached, give up
          console.warn(`Max retry attempts (${MAX_RETRY_ATTEMPTS}) reached for voice preference persistence`);
          pendingDefaultVoiceRef.current = null;
          hasPersistedDefaultRef.current = true; // Prevent further attempts
        }
      }
      
      toast({
        title: "Error",
        description: "Failed to save voice preference",
        variant: "destructive",
      });
    }
  });

  // Save voice preference
  const handleVoiceChange = (voiceName: string) => {
    setSelectedVoice(voiceName);
    localStorage.setItem('preferredVoice', voiceName);
    
    // Track this as the intended voice (most recent selection)
    intendedVoiceRef.current = voiceName;
    
    // Clear pending default voice to prevent it from overriding manual selection
    if (pendingDefaultVoiceRef.current) {
      pendingDefaultVoiceRef.current = null;
      hasPersistedDefaultRef.current = true; // Mark as handled
    }
    
    if (user) {
      updateVoicePreferenceMutation.mutate(voiceName);
    }
  };

  // Reset refs when user changes (logout/login)
  useEffect(() => {
    pendingDefaultVoiceRef.current = null;
    hasPersistedDefaultRef.current = false;
    retryAttemptsRef.current = 0;
    intendedVoiceRef.current = null;
  }, [user?.id]);

  // Persist default voice to database (with retry on error)
  useEffect(() => {
    // Only persist if we have a pending default voice and haven't already persisted
    if (pendingDefaultVoiceRef.current && !hasPersistedDefaultRef.current && user && !user.preferredVoice) {
      const voiceToPersist = pendingDefaultVoiceRef.current;
      // Track this as the intended voice (for race condition detection)
      intendedVoiceRef.current = voiceToPersist;
      // Don't set hasPersistedDefaultRef here - let the mutation callbacks handle it
      // This allows retry on error (triggered by retryTrigger state change)
      updateVoicePreferenceMutation.mutate(voiceToPersist);
    }
  }, [pendingDefaultVoiceRef.current, user, retryTrigger]);

  // Save showWordHints preference to localStorage
  useEffect(() => {
    localStorage.setItem('showWordHints', String(showWordHints));
  }, [showWordHints]);

  // Text-to-speech function
  const speakWord = (text: string) => {
    if (!selectedVoice) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = availableVoices.find((v) => v.name === selectedVoice);
    if (voice) {
      utterance.voice = voice;
    }
    window.speechSynthesis.speak(utterance);
  };

  return (
    <>
      <div className="flex justify-end mb-6">
        <Card className="px-4 py-2">
          <div className="flex items-center gap-3">
            {user?.accountType === 'free' ? (
              <button 
                className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-md px-2 py-1 cursor-pointer"
                onClick={() => setGuestIdOpen(true)}
                data-testid="button-guest-username"
              >
                {user?.selectedAvatar && (
                  user.selectedAvatar.startsWith('/objects/') ? (
                    <img 
                      src={user.selectedAvatar} 
                      alt="User avatar" 
                      className="w-8 h-8 rounded-full object-cover"
                      data-testid="img-user-avatar"
                    />
                  ) : (
                    <div className="text-2xl" data-testid="text-user-avatar">{user.selectedAvatar}</div>
                  )
                )}
                <div className="text-gray-800 dark:text-gray-200" data-testid="text-username">
                  guest
                </div>
              </button>
            ) : (
              <button 
                className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-md px-2 py-1 cursor-pointer"
                onClick={() => setProfileOpen(true)}
                data-testid="button-edit-profile"
              >
                {user?.selectedAvatar && (
                  user.selectedAvatar.startsWith('/objects/') ? (
                    <img 
                      src={user.selectedAvatar} 
                      alt="User avatar" 
                      className="w-8 h-8 rounded-full object-cover"
                      data-testid="img-user-avatar"
                    />
                  ) : (
                    <div className="text-2xl" data-testid="text-user-avatar">{user.selectedAvatar}</div>
                  )
                )}
                <div className="text-gray-800 dark:text-gray-200" data-testid="text-username">
                  {user?.username}
                </div>
              </button>
            )}
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setTodoModalOpen(true)}
                    className="relative"
                    data-testid="button-todos"
                  >
                    <Bell className="w-4 h-4" />
                    {todoCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold" data-testid="badge-todo-count">
                        {todoCount}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Notifications</p>
                </TooltipContent>
              </Tooltip>
              {user?.role !== "teacher" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSettingsOpen(true)}
                      data-testid="button-settings"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Settings</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setHelpOpen(true)}
                    data-testid="button-help"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Help</p>
                </TooltipContent>
              </Tooltip>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {logoutMutation.isPending ? "Logging out..." : "Logout"}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Dialog open={todoModalOpen} onOpenChange={setTodoModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notifications</DialogTitle>
            <DialogDescription>
              You have {todoCount} pending notification{todoCount !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-3">
              {todos.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No pending notifications</p>
              ) : (
                todos.map((todo: any) => {
                  const metadata = todo.metadata ? JSON.parse(todo.metadata) : null;
                  const isInvite = todo.type === 'group_invite';
                  const isAccessRequest = todo.type === 'join_request';
                  const isChallengeInvite = todo.type === 'challenge_invite';
                  const isChallengeComplete = todo.type === 'challenge_complete';

                  return (
                    <Card key={todo.id} className="p-4" data-testid={`todo-item-${todo.id}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-2 mb-2">
                            {isInvite && <UserPlus className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />}
                            {isAccessRequest && <Users className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />}
                            {isChallengeInvite && <Gamepad2 className="w-4 h-4 text-orange-600 mt-1 flex-shrink-0" />}
                            {isChallengeComplete && <Trophy className="w-4 h-4 text-yellow-600 mt-1 flex-shrink-0" />}
                            <div>
                              <p className="text-sm font-medium">{todo.message}</p>
                              {metadata && (
                                <p className="text-xs text-gray-600 mt-1">
                                  Group: {metadata.groupName}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {isInvite && (
                            <Button
                              size="sm"
                              onClick={() => handleAcceptInvite(todo)}
                              disabled={acceptInviteMutation.isPending}
                              data-testid={`button-accept-invite-${todo.id}`}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Accept
                            </Button>
                          )}
                          {isAccessRequest && (
                            <Button
                              size="sm"
                              onClick={() => handleApproveRequest(todo)}
                              disabled={approveAccessRequestMutation.isPending}
                              data-testid={`button-approve-request-${todo.id}`}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                          )}
                          {isChallengeInvite && (
                            <Button
                              size="sm"
                              onClick={() => {
                                completeTodoMutation.mutate(todo.id);
                                setTodoModalOpen(false);
                                // Navigate to H2H page with challenge ID if available
                                const challengeId = todo.challengeId || todo.groupId;
                                setLocation(challengeId ? `/head-to-head?challengeId=${challengeId}` : '/head-to-head');
                              }}
                              data-testid={`button-view-challenge-${todo.id}`}
                            >
                              <Gamepad2 className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          )}
                          {isChallengeComplete && (
                            <Button
                              size="sm"
                              onClick={() => {
                                completeTodoMutation.mutate(todo.id);
                                setTodoModalOpen(false);
                                // Navigate to H2H results page with completed tab
                                setLocation('/head-to-head?tab=completed');
                              }}
                              data-testid={`button-view-results-${todo.id}`}
                            >
                              <Trophy className="w-4 h-4 mr-1" />
                              View Results
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDecline(todo.id)}
                            disabled={completeTodoMutation.isPending}
                            data-testid={`button-decline-${todo.id}`}
                          >
                            <X className="w-4 h-4 mr-1" />
                            {isInvite || isAccessRequest || isChallengeInvite ? 'Decline' : 'Dismiss'}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Customize your game experience
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-6">
            <div className="space-y-3">
              <Label htmlFor="voice-select">Voice</Label>
              <Select value={selectedVoice || undefined} onValueChange={handleVoiceChange}>
                <SelectTrigger id="voice-select" data-testid="select-voice">
                  <SelectValue placeholder={availableVoices.length === 0 ? "No voices available" : "Select a voice"} />
                </SelectTrigger>
                <SelectContent>
                  {availableVoices.length === 0 ? (
                    <SelectItem value="none" disabled data-testid="voice-option-none">
                      No voices available
                    </SelectItem>
                  ) : (
                    availableVoices.map((voice) => (
                      <SelectItem key={voice.name} value={voice.name} data-testid={`voice-option-${voice.name}`}>
                        {voice.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedVoice && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => speakWord("Test")}
                  data-testid="button-test-voice"
                >
                  <Volume2 className="w-4 h-4 mr-2" />
                  Test Voice
                </Button>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="word-hints">Word Length Hints</Label>
                  <p className="text-sm text-muted-foreground">
                    Show blank spaces for each letter
                  </p>
                </div>
                <Switch
                  id="word-hints"
                  checked={showWordHints}
                  onCheckedChange={setShowWordHints}
                  data-testid="switch-word-hints"
                />
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                <Label>Visual Theme</Label>
              </div>
              <Select 
                value={currentTheme} 
                onValueChange={(value) => setTheme(value as typeof currentTheme)}
                disabled={isThemeLoading}
              >
                <SelectTrigger data-testid="select-theme">
                  <SelectValue placeholder="Select a theme" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(allThemes).map(([themeId, themeInfo]) => {
                    const isUnlocked = unlockedThemes.includes(themeId as typeof currentTheme);
                    return (
                      <SelectItem 
                        key={themeId} 
                        value={themeId} 
                        disabled={!isUnlocked}
                        data-testid={`theme-option-${themeId}`}
                      >
                        <span className="flex items-center gap-2">
                          {themeInfo.name}
                          {!isUnlocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Theme Preview</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground text-center">Mascot</p>
                    <div className="flex justify-center bg-muted/30 rounded-md p-2">
                      <img 
                        src={themeAssets.mascotTrophy} 
                        alt="Theme mascot" 
                        className="w-12 h-12 object-contain"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground text-center">Background</p>
                    <div className="flex justify-center bg-muted/30 rounded-md p-2">
                      <img 
                        src={themeAssets.backgroundLandscape} 
                        alt="Theme background" 
                        className="w-16 h-12 object-cover rounded"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSettingsOpen(false);
                  setLocation("/star-shop");
                }}
                className="w-full"
                data-testid="button-go-to-star-shop"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {unlockedThemes.length === 1 
                  ? "Get More Themes in Star Shop" 
                  : "Visit Star Shop"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Guest User ID Dialog */}
      <Dialog open={guestIdOpen} onOpenChange={(open) => {
        setGuestIdOpen(open);
        if (!open) setCopied(false);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle className="w-5 h-5" />
              Your Guest ID
            </DialogTitle>
            <DialogDescription>
              This is your unique guest identifier. Save it to access your progress on another device.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Your unique username:</p>
              <p className="font-mono text-lg font-semibold break-all" data-testid="text-full-guest-username">
                {user?.username}
              </p>
            </div>
            <Button
              onClick={() => {
                if (user?.username) {
                  navigator.clipboard.writeText(user.username);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              }}
              className="w-full"
              data-testid="button-copy-username"
            >
              <Copy className="w-4 h-4 mr-2" />
              {copied ? "Copied!" : "Copy to Clipboard"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Help & Support
            </DialogTitle>
            <DialogDescription>
              Learn about game features or send us a message
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6 mt-4">
              <Accordion type="single" collapsible className="w-full">
                {user?.role !== "teacher" && (
                  <>
                    <AccordionItem value="game-modes">
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center gap-2">
                          <Gamepad2 className="w-4 h-4 text-primary" />
                          Game Modes
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 text-sm">
                        <div>
                          <strong>Practice Mode</strong>
                          <p className="text-muted-foreground">Listen to a word and type the correct spelling. See how you did after each word.</p>
                        </div>
                        <div>
                          <strong>Timed Challenge</strong>
                          <p className="text-muted-foreground">Race against the clock! Spell as many words correctly as you can before time runs out.</p>
                        </div>
                        <div>
                          <strong>Quiz Mode</strong>
                          <p className="text-muted-foreground">Similar to Practice mode but you have to wait until all words are complete before seeing your results.</p>
                        </div>
                        <div>
                          <strong>Word Scramble</strong>
                          <p className="text-muted-foreground">Unscramble the jumbled letters to spell the word correctly. Drag and drop or tap letters to move them into place.</p>
                        </div>
                        <div>
                          <strong>Find the Mistake</strong>
                          <p className="text-muted-foreground">Identify the misspelled word among the options. Watch out for tricky spelling errors!</p>
                        </div>
                        <div>
                          <strong>Crossword Puzzle</strong>
                          <p className="text-muted-foreground">Listen to word pronunciations and fill in the crossword grid. A fun twist on spelling practice!</p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="achievements">
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-yellow-500" />
                          Achievements
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 text-sm">
                        <p className="text-muted-foreground">
                          Earn achievements as you play! Complete challenges like building streaks, 
                          spelling words correctly on your first try, and mastering different game modes.
                        </p>
                        <div>
                          <strong>How to earn achievements:</strong>
                          <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                            <li>Build spelling streaks by getting words correct in a row</li>
                            <li>Complete games with high accuracy</li>
                            <li>Try all different game modes</li>
                            <li>Practice consistently over time</li>
                          </ul>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="star-shop">
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="w-4 h-4 text-amber-500" />
                          Star Shop
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 text-sm">
                        <p className="text-muted-foreground">
                          Spend the stars you earn from achievements in the Star Shop!
                        </p>
                        <div>
                          <strong>Earning stars:</strong>
                          <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                            <li>Complete any game mode with 100% accuracy to earn a star</li>
                            <li>Each word list can earn you one star per game mode</li>
                            <li>Track your earned stars in the Achievements page</li>
                          </ul>
                        </div>
                        <div>
                          <strong>Power-ups:</strong>
                          <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                            <li><strong>Do Over (1 star):</strong> Retry one incorrect word during a game</li>
                            <li><strong>2nd Chance (5 stars):</strong> Retry all incorrect words at the end of a game</li>
                          </ul>
                        </div>
                        <div>
                          <strong>Themes:</strong>
                          <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                            <li>Purchase colorful background themes to customize your experience</li>
                            <li>Themes range from 3 to 10 stars each</li>
                            <li>Apply purchased themes from the Star Shop</li>
                          </ul>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="head-to-head">
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center gap-2">
                          <Gamepad2 className="w-4 h-4 text-orange-500" />
                          Head to Head Challenge
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 text-sm">
                        <p className="text-muted-foreground">
                          Challenge your friends to a spelling showdown! Compete on the same word list and see who spells best.
                        </p>
                        <div>
                          <strong>How to start a challenge:</strong>
                          <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                            <li>Click "H2H Challenge" on the home screen</li>
                            <li>Select a word list to use</li>
                            <li>Search for a friend by username</li>
                            <li>Send your challenge!</li>
                          </ul>
                        </div>
                        <div>
                          <strong>Scoring:</strong>
                          <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                            <li><strong>+10 points</strong> for each correct word</li>
                            <li><strong>-5 points</strong> for each incorrect word</li>
                            <li><strong>-1 point</strong> for each second elapsed</li>
                            <li>The winner earns a spendable star that counts toward your "Stars Earned" total</li>
                            <li>Note: H2H wins do not count toward word list mastery achievements</li>
                          </ul>
                        </div>
                        <div>
                          <strong>Important notes:</strong>
                          <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                            <li>Power-ups (Do Over, 2nd Chance) are not allowed</li>
                            <li>Speed matters - finish quickly for a higher score!</li>
                            <li>View your challenge history in "View H2H Games"</li>
                          </ul>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="word-lists">
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center gap-2">
                          <List className="w-4 h-4 text-blue-500" />
                          Word Lists
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 text-sm">
                        <p className="text-muted-foreground">
                          Create custom word lists to practice the words you want to learn!
                        </p>
                        <div>
                          <strong>Creating lists:</strong>
                          <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                            <li>Go to "My Word Lists" from the main menu</li>
                            <li>Click "Create New List" and add your words</li>
                            <li>You can import words from text files, CSV, or PDF</li>
                            <li>Enable cartoon images to make learning more fun</li>
                          </ul>
                        </div>
                        <div>
                          <strong>Sharing lists:</strong>
                          <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                            <li>Make lists public for everyone to use</li>
                            <li>Share with specific groups you create</li>
                            <li>Keep lists private for personal practice</li>
                          </ul>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="user-groups">
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-purple-500" />
                          User Groups
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 text-sm">
                        <p className="text-muted-foreground">
                          Create or join groups to share word lists with friends, classmates, or family!
                        </p>
                        <div>
                          <strong>Creating a group:</strong>
                          <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                            <li>Go to "My Groups" from the main menu</li>
                            <li>Click "Create Group" and give it a name</li>
                            <li>Set a password if you want members to join with a code</li>
                            <li>Invite members by username or let them request access</li>
                          </ul>
                        </div>
                        <div>
                          <strong>Joining a group:</strong>
                          <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                            <li>Accept an invitation from the notifications bell</li>
                            <li>Request to join a group and wait for approval</li>
                            <li>Enter a group password if you have one</li>
                          </ul>
                        </div>
                        <div>
                          <strong>Sharing with groups:</strong>
                          <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                            <li>When creating a word list, choose "Groups" visibility</li>
                            <li>Select which groups can access your list</li>
                            <li>Group members can then practice with your shared lists</li>
                          </ul>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="stats">
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-green-500" />
                          My Stats
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 text-sm">
                        <p className="text-muted-foreground">
                          Track your progress over time with detailed statistics!
                        </p>
                        <div>
                          <strong>Available stats:</strong>
                          <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                            <li>Total games played and words practiced</li>
                            <li>Overall accuracy percentage</li>
                            <li>Best streaks and favorite game modes</li>
                            <li>Most misspelled words to practice</li>
                            <li>Filter by date range to see recent progress</li>
                          </ul>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </>
                )}

                <AccordionItem value="for-teachers">
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center gap-2">
                      <UserCircle className="w-4 h-4 text-orange-500" />
                      For Teachers
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 text-sm">
                    <p className="text-muted-foreground">
                      As a teacher, you can create word lists and groups for your students to practice!
                    </p>
                    <div>
                      <strong>Step 1: Create a User Group</strong>
                      <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                        <li>Go to "User Groups" from the main menu</li>
                        <li>Click "Create Group" and name it after your class</li>
                        <li>Set a password so only your students can join</li>
                        <li>You can also add co-owners (other teachers) to help manage the group</li>
                      </ul>
                    </div>
                    <div>
                      <strong>Step 2: Invite Students</strong>
                      <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                        <li>Share the group password with your students</li>
                        <li>Students join by going to User Groups and entering the password</li>
                        <li>You can also invite students by searching their username</li>
                        <li>Manage members from the "Manage Members" button on your group</li>
                      </ul>
                    </div>
                    <div>
                      <strong>Step 3: Create Word Lists</strong>
                      <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                        <li>Go to "Word Lists" and click "Create New List"</li>
                        <li>Add your spelling words (one per line)</li>
                        <li>Set visibility to "Groups" and select your class group</li>
                        <li>Enable cartoon images to make learning more engaging</li>
                        <li>You can add co-owners to allow other teachers to edit the list</li>
                      </ul>
                    </div>
                    <div>
                      <strong>Monitor Progress</strong>
                      <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                        <li>Use the Teacher Dashboard to see student performance</li>
                        <li>View accuracy and progress for each word list</li>
                        <li>Identify which words students are struggling with</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="border-t pt-6">
                <h3 className="font-semibold flex items-center gap-2 mb-4">
                  <Mail className="w-4 h-4" />
                  Contact Us
                </h3>
                <form 
                  className="space-y-4"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!contactName || !contactEmail || !contactMessage) {
                      toast({
                        title: "Missing Information",
                        description: "Please fill in all fields",
                        variant: "destructive",
                      });
                      return;
                    }
                    if (contactMessage.length < 10) {
                      toast({
                        title: "Message Too Short",
                        description: "Please write at least 10 characters",
                        variant: "destructive",
                      });
                      return;
                    }
                    setSendingMessage(true);
                    try {
                      const response = await fetch("/api/contact", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          name: contactName,
                          email: contactEmail,
                          message: contactMessage,
                        }),
                      });
                      if (!response.ok) {
                        throw new Error("Failed to send message");
                      }
                      toast({
                        title: "Message Sent!",
                        description: "Thank you for your feedback. We'll get back to you soon.",
                      });
                      setContactName("");
                      setContactEmail("");
                      setContactMessage("");
                      setHelpOpen(false);
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to send message. Please try again.",
                        variant: "destructive",
                      });
                    } finally {
                      setSendingMessage(false);
                    }
                  }}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact-name">Your Name</Label>
                      <Input
                        id="contact-name"
                        placeholder="Enter your name"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        data-testid="input-contact-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-email">Email</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        placeholder="your@email.com"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        data-testid="input-contact-email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-message">Message</Label>
                    <Textarea
                      id="contact-message"
                      placeholder="How can we help? Share your questions, feedback, or suggestions..."
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      className="min-h-[100px]"
                      data-testid="input-contact-message"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={sendingMessage}
                    data-testid="button-send-message"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {sendingMessage ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </div>

              <div className="border-t pt-4 mt-6 text-center">
                <p className="text-xs text-muted-foreground">
                  Version {appVersion?.version || APP_VERSION}
                </p>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle className="w-5 h-5" />
              Edit Profile
            </DialogTitle>
            <DialogDescription>
              Update your profile information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="profile-first-name">First Name</Label>
                <Input
                  id="profile-first-name"
                  type="text"
                  value={profileFirstName}
                  onChange={(e) => setProfileFirstName(e.target.value)}
                  placeholder="First name"
                  data-testid="input-profile-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-last-name">Last Name</Label>
                <Input
                  id="profile-last-name"
                  type="text"
                  value={profileLastName}
                  onChange={(e) => setProfileLastName(e.target.value)}
                  placeholder="Last name"
                  data-testid="input-profile-lastname"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                placeholder="your.email@example.com"
                data-testid="input-profile-email"
              />
              <p className="text-sm text-gray-500">Used for password reset requests</p>
            </div>
            <div className="space-y-2">
              <Label>Choose Your Avatar</Label>
              <div className="grid grid-cols-6 gap-2">
                {avatarOptions.map((avatar) => (
                  <button
                    key={avatar.emoji}
                    type="button"
                    onClick={() => {
                      setProfileAvatar(avatar.emoji);
                      setProfileAvatarFile(null);
                      setProfileAvatarPreview(null);
                    }}
                    className={`
                      aspect-square rounded-lg text-3xl flex items-center justify-center
                      transition-all hover-elevate active-elevate-2
                      ${profileAvatar === avatar.emoji
                        ? "bg-purple-100 border-2 border-purple-600"
                        : "bg-white border border-gray-200"
                      }
                    `}
                    data-testid={`button-profile-avatar-${avatar.label.toLowerCase()}`}
                    aria-label={avatar.label}
                  >
                    {avatar.emoji}
                  </button>
                ))}
              </div>
              <div className="pt-2">
                <Label htmlFor="profile-avatar-upload" className="cursor-pointer">
                  <div 
                    className={`
                      border-2 border-dashed rounded-lg p-4 flex items-center justify-center gap-3 transition-all hover-elevate active-elevate-2
                      ${profileAvatar === "custom"
                        ? "border-purple-600 bg-purple-50"
                        : "border-gray-300 bg-white"
                      }
                    `}
                  >
                    {profileAvatarPreview ? (
                      <>
                        <img 
                          src={profileAvatarPreview} 
                          alt="Custom avatar preview" 
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <span className="text-sm font-medium">Custom Avatar Selected</span>
                      </>
                    ) : user?.selectedAvatar?.startsWith('/objects/') ? (
                      <>
                        <img 
                          src={user.selectedAvatar} 
                          alt="Current avatar" 
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <span className="text-sm font-medium">Upload New Avatar</span>
                      </>
                    ) : (
                      <>
                        <UserCircle className="w-6 h-6 text-gray-400" />
                        <span className="text-sm font-medium">Upload Custom Avatar</span>
                      </>
                    )}
                  </div>
                  <Input
                    id="profile-avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleProfileAvatarFileChange}
                    className="hidden"
                    data-testid="input-profile-custom-avatar"
                  />
                </Label>
                <p className="text-sm text-gray-500 mt-1">Max 5MB, JPG/PNG/GIF</p>
              </div>
            </div>
            <Button
              onClick={handleSaveProfile}
              className="w-full"
              disabled={updateProfileMutation.isPending}
              data-testid="button-save-profile"
            >
              {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
