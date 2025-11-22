import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogOut, Bell, Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
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

export function UserHeader() {
  const { user, logoutMutation } = useAuth();
  const [todoModalOpen, setTodoModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  
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

  return (
    <>
      <div className="flex justify-end mb-6">
        <Card className="px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
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
              <div className="font-bold text-gray-800" data-testid="text-username">
                {user?.username}
              </div>
            </div>
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

                  return (
                    <Card key={todo.id} className="p-4" data-testid={`todo-item-${todo.id}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-2 mb-2">
                            {isInvite && <UserPlus className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />}
                            {isAccessRequest && <Users className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />}
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDecline(todo.id)}
                            disabled={completeTodoMutation.isPending}
                            data-testid={`button-decline-${todo.id}`}
                          >
                            <X className="w-4 h-4 mr-1" />
                            {isInvite || isAccessRequest ? 'Decline' : 'Dismiss'}
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
              Customize your app experience
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
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
                        {voice.name} ({voice.lang})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-600">
                Choose the voice for text-to-speech pronunciation
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
