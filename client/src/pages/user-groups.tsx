import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Trash2, Users, Globe, Lock, Home, UserPlus, Settings, Search, Mail, LogOut, Edit, Bell, Check, X, Eye, EyeOff, Copy } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { UserHeader } from "@/components/user-header";
import { useTheme } from "@/hooks/use-theme";
import { getThemedTextClasses } from "@/lib/themeText";

export default function UserGroupsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { themeAssets, hasDarkBackground } = useTheme();
  const textClasses = getThemedTextClasses(hasDarkBackground);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [removeMemberConfirmOpen, setRemoveMemberConfirmOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    isPublic: false,
    plaintextPassword: "",
  });
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [pendingRequestsDialogOpen, setPendingRequestsDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedGroupForPassword, setSelectedGroupForPassword] = useState<any>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [viewingPasswordForGroup, setViewingPasswordForGroup] = useState<number | null>(null);
  const [coOwnersDialogOpen, setCoOwnersDialogOpen] = useState(false);
  const [selectedGroupForCoOwners, setSelectedGroupForCoOwners] = useState<any>(null);
  const [groupTeacherSearchQuery, setGroupTeacherSearchQuery] = useState("");

  const { data: groups = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/user-groups", user?.id],
    queryFn: async () => {
      const response = await fetch("/api/user-groups", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch groups");
      return await response.json();
    },
    enabled: !!user,
    refetchOnMount: "always",
    staleTime: 0,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/user-groups", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups", user?.id] });
      setCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Success!",
        description: "Group created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create group",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      const response = await apiRequest("PATCH", `/api/user-groups/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups", user?.id] });
      setCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Success!",
        description: "Group updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update group",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (groupId: number) => {
      await apiRequest("DELETE", `/api/user-groups/${groupId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups", user?.id] });
      toast({
        title: "Success!",
        description: "Group deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete group",
        variant: "destructive",
      });
    },
  });

  const requestAccessMutation = useMutation({
    mutationFn: async (groupId: number) => {
      const response = await apiRequest("POST", `/api/user-groups/${groupId}/request-access`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-pending-requests", user?.id] });
      toast({
        title: "Success!",
        description: "Your request to join this group has been sent to the group owner",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send request",
        variant: "destructive",
      });
    },
  });

  const joinWithPasswordMutation = useMutation({
    mutationFn: async ({ groupId, password }: { groupId: number; password: string }) => {
      const response = await apiRequest("POST", `/api/user-groups/${groupId}/join-with-password`, { password });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups", user?.id] });
      // Invalidate shared word lists since joining a group grants access to new lists
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists/shared-with-me"] });
      setPasswordDialogOpen(false);
      setPasswordInput("");
      setSelectedGroupForPassword(null);
      toast({
        title: "Success!",
        description: "You have successfully joined the group",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join group. Please check your password and try again.",
        variant: "destructive",
      });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ groupId, userIds }: { groupId: number; userIds: number[] }) => {
      const response = await apiRequest("POST", `/api/user-groups/${groupId}/invite`, { userIds });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups", user?.id] });
      setInviteDialogOpen(false);
      setSearchQuery("");
      setSelectedUsers([]);
      toast({
        title: "Success!",
        description: "Invitations sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitations",
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: number; userId: number }) => {
      await apiRequest("DELETE", `/api/user-groups/${groupId}/members/${userId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups", selectedGroup?.id, "members"] });
      // Invalidate shared word lists for the current user (owner)
      // Note: The removed member's cache won't update until they navigate or refresh
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists/shared-with-me"] });
      setRemoveMemberConfirmOpen(false);
      setMemberToRemove(null);
      toast({
        title: "Success!",
        description: "Member removed from group",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive",
      });
    },
  });

  const leaveGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      await apiRequest("POST", `/api/user-groups/${groupId}/leave`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/word-lists/shared-with-me"] });
      toast({
        title: "Success!",
        description: "You have left the group",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to leave group",
        variant: "destructive",
      });
    },
  });

  // Co-owner management queries and mutations
  const { data: groupTeacherSearchResults = [], isLoading: isSearchingGroupTeachers } = useQuery<any[]>({
    queryKey: ["/api/teachers/search", groupTeacherSearchQuery],
    queryFn: async () => {
      if (groupTeacherSearchQuery.length < 2) return [];
      const response = await fetch(`/api/teachers/search?q=${encodeURIComponent(groupTeacherSearchQuery)}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to search teachers");
      return await response.json();
    },
    enabled: !!user && user.role === "teacher" && coOwnersDialogOpen && groupTeacherSearchQuery.length >= 2,
  });

  const { data: groupCoOwners = [], refetch: refetchGroupCoOwners } = useQuery<any[]>({
    queryKey: ["/api/user-groups", selectedGroupForCoOwners?.id, "co-owners"],
    queryFn: async () => {
      if (!selectedGroupForCoOwners) return [];
      const response = await fetch(`/api/user-groups/${selectedGroupForCoOwners.id}/co-owners`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch co-owners");
      return await response.json();
    },
    enabled: !!selectedGroupForCoOwners && coOwnersDialogOpen,
  });

  const addGroupCoOwnerMutation = useMutation({
    mutationFn: async (coOwnerUserId: number) => {
      if (!selectedGroupForCoOwners) throw new Error("No group selected");
      const response = await apiRequest("POST", `/api/user-groups/${selectedGroupForCoOwners.id}/co-owners`, { coOwnerUserId });
      return await response.json();
    },
    onSuccess: () => {
      refetchGroupCoOwners();
      setGroupTeacherSearchQuery("");
      toast({ title: "Success", description: "Co-owner added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add co-owner", variant: "destructive" });
    },
  });

  const removeGroupCoOwnerMutation = useMutation({
    mutationFn: async (coOwnerUserId: number) => {
      if (!selectedGroupForCoOwners) throw new Error("No group selected");
      const response = await apiRequest("DELETE", `/api/user-groups/${selectedGroupForCoOwners.id}/co-owners/${coOwnerUserId}`);
      return await response.json();
    },
    onSuccess: () => {
      refetchGroupCoOwners();
      toast({ title: "Success", description: "Co-owner removed successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to remove co-owner", variant: "destructive" });
    },
  });

  const approveRequestMutation = useMutation({
    mutationFn: async ({ groupId, requestId }: { groupId: number; requestId: number }) => {
      await apiRequest("POST", `/api/user-groups/${groupId}/requests/${requestId}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-pending-requests", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups", selectedGroup?.id, "members"] });
      toast({
        title: "Success!",
        description: "Request approved",
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

  const denyRequestMutation = useMutation({
    mutationFn: async ({ groupId, requestId }: { groupId: number; requestId: number }) => {
      await apiRequest("DELETE", `/api/user-groups/${groupId}/requests/${requestId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-pending-requests", user?.id] });
      toast({
        title: "Success!",
        description: "Request denied",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deny request",
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

  const completeTodoMutation = useMutation({
    mutationFn: async (todoId: number) => {
      await apiRequest("POST", `/api/user-to-dos/${todoId}/complete`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-to-dos"] });
      toast({
        title: "Success!",
        description: "Request declined",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to decline request",
        variant: "destructive",
      });
    },
  });

  const { data: searchResults = [] } = useQuery<any[]>({
    queryKey: ["/api/users/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const response = await fetch(`/api/users/search?query=${encodeURIComponent(searchQuery)}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to search users");
      return await response.json();
    },
    enabled: inviteDialogOpen && searchQuery.length >= 2,
  });

  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["/api/user-groups", selectedGroup?.id, "members"],
    queryFn: async () => {
      if (!selectedGroup) return [];
      const response = await fetch(`/api/user-groups/${selectedGroup.id}/members`);
      if (!response.ok) throw new Error("Failed to fetch members");
      return await response.json();
    },
    enabled: !!selectedGroup && (membersDialogOpen || inviteDialogOpen),
  });

  const resetForm = () => {
    setFormData({
      name: "",
      isPublic: false,
      plaintextPassword: "",
    });
    setEditingGroup(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (group: any) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      isPublic: group.isPublic,
      plaintextPassword: group.plaintextPassword || "",
    });
    setCreateDialogOpen(true);
  };

  const openPendingRequests = (group: any) => {
    setSelectedGroup(group);
    setPendingRequestsDialogOpen(true);
  };

  const handleDelete = (groupId: number) => {
    if (confirm("Are you sure you want to delete this group? This cannot be undone.")) {
      deleteMutation.mutate(groupId);
    }
  };

  const viewMembers = (group: any) => {
    setSelectedGroup(group);
    // Invalidate members cache to fetch fresh data
    queryClient.invalidateQueries({ queryKey: ["/api/user-groups", group.id, "members"] });
    setMembersDialogOpen(true);
  };

  const openInviteDialog = (group: any) => {
    setSelectedGroup(group);
    setSearchQuery("");
    setSelectedUsers([]);
    setInviteDialogOpen(true);
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleInvite = () => {
    if (!selectedGroup || selectedUsers.length === 0) return;
    inviteMutation.mutate({ groupId: selectedGroup.id, userIds: selectedUsers });
  };

  const confirmRemoveMember = (member: any) => {
    setMemberToRemove(member);
    setRemoveMemberConfirmOpen(true);
  };

  const handleRemoveMember = () => {
    if (!selectedGroup || !memberToRemove) return;
    removeMemberMutation.mutate({ groupId: selectedGroup.id, userId: memberToRemove.id });
  };

  const togglePasswordView = (groupId: number) => {
    setViewingPasswordForGroup(prev => prev === groupId ? null : groupId);
  };

  const copyPassword = async (password: string, groupName: string) => {
    try {
      await navigator.clipboard.writeText(password);
      toast({
        title: "Password Copied!",
        description: `Password for "${groupName}" copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy password to clipboard",
        variant: "destructive",
      });
    }
  };

  // Fetch user to-dos to check for pending join requests received by the user (as group owner)
  const { data: userToDos = [] } = useQuery<any[]>({
    queryKey: ["/api/user-to-dos", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/user-to-dos", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch user to-dos");
      return await res.json();
    },
    enabled: !!user,
  });

  // Fetch user's outgoing pending requests (requests the user has sent to join groups)
  const { data: userPendingRequests = [] } = useQuery<any[]>({
    queryKey: ["/api/user-pending-requests", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/user-pending-requests", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pending requests");
      return await res.json();
    },
    enabled: !!user,
  });

  // Filter for join requests received by the user (as group owner)
  const joinRequestToDos = userToDos.filter(todo => todo.type === 'join_request');

  // Create set of group IDs where the user has pending outgoing requests
  const pendingRequestGroupIds = new Set(
    userPendingRequests
      .map(request => request.groupId)
      .filter(Boolean)
  );

  const ownedGroups = groups.filter(g => g.ownerUserId === user?.id);
  const memberGroups = groups.filter(g => g.ownerUserId !== user?.id && g.isMember);
  const publicGroups = groups.filter(g => g.isPublic && g.ownerUserId !== user?.id && !g.isMember);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md p-8">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to manage user groups</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/auth")} className="w-full" data-testid="button-login">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-6 relative overflow-hidden"
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

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex items-start justify-between mb-6">
          <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-home">
            <Home className="w-4 h-4 mr-2" />
            Home
          </Button>
          <UserHeader />
        </div>
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-4xl md:text-5xl font-bold ${textClasses.headline}`}>User Groups</h1>
            <p className={`text-lg mt-1 ${textClasses.subtitle}`}>Create and manage groups to share word lists</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} data-testid="button-create-group">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingGroup ? 'Edit Group' : 'Create New Group'}</DialogTitle>
                  <DialogDescription>
                    {editingGroup ? 'Update group settings' : 'Create a group to share word lists with other users'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Group Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Mrs. Smith's 3rd Grade Class"
                      required
                      data-testid="input-group-name"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="isPublic"
                      checked={formData.isPublic}
                      onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
                      data-testid="switch-public-group"
                    />
                    <Label htmlFor="isPublic" className="cursor-pointer">
                      Make this group public (anyone can request to join)
                    </Label>
                  </div>
                  {formData.isPublic && (
                    <div>
                      <Label htmlFor="plaintextPassword">Password (Optional)</Label>
                      <Input
                        id="plaintextPassword"
                        type="password"
                        value={formData.plaintextPassword}
                        onChange={(e) => setFormData({ ...formData, plaintextPassword: e.target.value })}
                        placeholder="Leave blank for no password"
                        data-testid="input-group-password"
                      />
                      <p className="text-xs text-gray-600 mt-1">Add an optional password for users to join immediately without approval</p>
                    </div>
                  )}
                  <div className="flex gap-2 justify-end pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setCreateDialogOpen(false); resetForm(); }}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-save-group"
                    >
                      {editingGroup ? 'Update Group' : 'Create Group'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <motion.div
              className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <p className="mt-4 text-gray-600">Loading groups...</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div>
              <h2 className={`text-2xl font-bold mb-4 flex items-center gap-2 ${textClasses.sectionTitle}`}>
                <Users className="w-6 h-6 text-purple-600" />
                My Groups
              </h2>
              {ownedGroups.length === 0 ? (
                <p className="text-gray-600 text-sm">None</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ownedGroups.map((group) => (
                    <Card key={group.id} className="hover-elevate p-4" data-testid={`card-group-${group.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-800 truncate">{group.name}</h3>
                            {group.isPublic ? (
                              <Globe className="w-3 h-3 text-green-600 flex-shrink-0" data-testid="icon-public-group" />
                            ) : (
                              <Lock className="w-3 h-3 text-gray-600 flex-shrink-0" data-testid="icon-private-group" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mb-2">Owner{group.isPublic && group.plaintextPassword ? ' • Password Protected' : ''}</p>
                          <div className="flex flex-wrap gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(group)}
                              data-testid={`button-edit-${group.id}`}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openInviteDialog(group)}
                              data-testid={`button-invite-${group.id}`}
                            >
                              <UserPlus className="w-3 h-3 mr-1" />
                              Invite
                            </Button>
                            {pendingRequestGroupIds.has(group.id) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openPendingRequests(group)}
                                data-testid={`button-pending-requests-${group.id}`}
                              >
                                <Bell className="w-3 h-3 mr-1" />
                                Pending Join Requests
                                <Badge className="ml-1 h-4 px-1 text-xs" data-testid={`badge-pending-count-${group.id}`}>
                                  {joinRequestToDos.filter(todo => todo.groupId === group.id).length}
                                </Badge>
                              </Button>
                            )}
                            {group.isPublic && group.plaintextPassword && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => togglePasswordView(group.id)}
                                  data-testid={`button-view-password-${group.id}`}
                                >
                                  {viewingPasswordForGroup === group.id ? (
                                    <>
                                      <EyeOff className="w-3 h-3 mr-1" />
                                      Hide Password
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="w-3 h-3 mr-1" />
                                      View Password
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyPassword(group.plaintextPassword, group.name)}
                                  data-testid={`button-copy-password-${group.id}`}
                                >
                                  <Copy className="w-3 h-3 mr-1" />
                                  Copy Password
                                </Button>
                              </>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(group.id)}
                              data-testid={`button-delete-${group.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                            {user?.role === "teacher" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedGroupForCoOwners(group);
                                  setCoOwnersDialogOpen(true);
                                }}
                                data-testid={`button-co-owners-${group.id}`}
                              >
                                <Users className="w-3 h-3 mr-1" />
                                Co-owners
                              </Button>
                            )}
                          </div>
                          {group.isPublic && group.plaintextPassword && viewingPasswordForGroup === group.id && (
                            <div className="mt-2 p-2 bg-gray-100 rounded text-sm font-mono" data-testid={`text-password-${group.id}`}>
                              Password: {group.plaintextPassword}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-600" data-testid={`text-member-count-${group.id}`}>{group.memberCount || 0} {(group.memberCount || 0) === 1 ? 'member' : 'members'}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewMembers(group)}
                            data-testid={`button-view-members-${group.id}`}
                          >
                            <Users className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {user?.role !== "teacher" && memberGroups.length > 0 && (
              <div>
                <h2 className={`text-2xl font-bold mb-4 flex items-center gap-2 ${textClasses.sectionTitle}`}>
                  <UserPlus className="w-6 h-6 text-blue-600" />
                  Groups I'm In
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {memberGroups.map((group) => (
                    <Card key={group.id} className="hover-elevate p-4" data-testid={`card-member-group-${group.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-800 truncate">{group.name}</h3>
                            {group.isPublic ? (
                              <Globe className="w-3 h-3 text-green-600 flex-shrink-0" />
                            ) : (
                              <Lock className="w-3 h-3 text-gray-600 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mb-1">Member</p>
                          <p className="text-xs text-gray-500 mb-2" data-testid={`text-owner-${group.id}`}>Owner: {group.ownerUsername}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => leaveGroupMutation.mutate(group.id)}
                            data-testid={`button-leave-${group.id}`}
                          >
                            <LogOut className="w-3 h-3 mr-1" />
                            Leave
                          </Button>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-600" data-testid={`text-member-count-${group.id}`}>{group.memberCount || 0} {(group.memberCount || 0) === 1 ? 'member' : 'members'}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewMembers(group)}
                            data-testid={`button-view-members-${group.id}`}
                          >
                            <Users className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {user?.role !== "teacher" && publicGroups.length > 0 && (
              <div>
                <h2 className={`text-2xl font-bold mb-4 flex items-center gap-2 ${textClasses.sectionTitle}`}>
                  <Globe className="w-6 h-6 text-green-600" />
                  Public Groups
                </h2>
                <p className={`mb-4 text-sm ${textClasses.subtitle}`}>
                  Join public groups to share and access word lists
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {publicGroups.map((group) => {
                    const hasPendingRequest = pendingRequestGroupIds.has(group.id);
                    return (
                      <Card key={group.id} className="hover-elevate p-4" data-testid={`card-public-group-${group.id}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-800 truncate">{group.name}</h3>
                              <Globe className="w-3 h-3 text-green-600 flex-shrink-0" />
                            </div>
                            <p className="text-xs text-gray-600">Public Group{group.hasPassword ? ' • Password Protected' : ''}</p>
                            <p className="text-xs text-gray-500 mb-2" data-testid={`text-public-owner-${group.id}`}>Owner: {group.ownerUsername}</p>
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                size="sm"
                                onClick={() => requestAccessMutation.mutate(group.id)}
                                disabled={hasPendingRequest || requestAccessMutation.isPending}
                                variant={hasPendingRequest ? "outline" : "default"}
                                data-testid={`button-request-access-${group.id}`}
                              >
                                {hasPendingRequest ? "Request Pending" : requestAccessMutation.isPending ? "Sending..." : "Request to Join"}
                              </Button>
                              {group.hasPassword && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => {
                                    setSelectedGroupForPassword(group);
                                    setPasswordDialogOpen(true);
                                  }}
                                  data-testid={`button-join-with-password-${group.id}`}
                                >
                                  Join with Password
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-600" data-testid={`text-member-count-${group.id}`}>{group.memberCount || 0} {(group.memberCount || 0) === 1 ? 'member' : 'members'}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewMembers(group)}
                              data-testid={`button-view-members-${group.id}`}
                            >
                              <Users className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Group Members</DialogTitle>
              <DialogDescription>
                {selectedGroup?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {members.length === 0 ? (
                <p className="text-gray-600 text-center py-4">No members yet</p>
              ) : (
                <div className="space-y-2">
                  {members.map((member: any) => {
                    const isOwner = member.id === selectedGroup?.ownerUserId;
                    const canRemove = selectedGroup?.ownerUserId === user?.id && !isOwner;
                    return (
                      <Card key={member.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {member.selectedAvatar?.startsWith('/objects/') ? (
                              <img 
                                src={member.selectedAvatar} 
                                alt="User avatar" 
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-xl">
                                {member.selectedAvatar}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold">
                                {member.username}
                                {isOwner && (
                                  <Badge variant="secondary" className="ml-2">Owner</Badge>
                                )}
                              </p>
                              {(member.firstName || member.lastName) && (
                                <p className="text-sm text-gray-600">
                                  {member.firstName} {member.lastName}
                                </p>
                              )}
                            </div>
                          </div>
                          {canRemove && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => confirmRemoveMember(member)}
                              data-testid={`button-remove-member-${member.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Invite Members</DialogTitle>
              <DialogDescription>
                Search for users to invite to {selectedGroup?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Search by username, email, or name (min 2 characters)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-users"
                />
              </div>

              {selectedUsers.length > 0 && (
                <div className="bg-purple-50 p-3 rounded-md">
                  <p className="text-sm font-semibold text-gray-700">
                    {selectedUsers.length} user{selectedUsers.length === 1 ? '' : 's'} selected
                  </p>
                </div>
              )}

              <ScrollArea className="h-[300px] border rounded-md p-4">
                {searchQuery.length < 2 ? (
                  <p className="text-gray-500 text-center py-8">
                    Enter at least 2 characters to search for users
                  </p>
                ) : searchResults.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No users found matching "{searchQuery}"
                  </p>
                ) : (
                  <div className="space-y-2">
                    {searchResults
                      .filter((result: any) => {
                        const memberIds = members.map((m: any) => m.id);
                        return !memberIds.includes(result.id) && result.id !== user?.id;
                      })
                      .map((result: any) => {
                        const isSelected = selectedUsers.includes(result.id);
                        return (
                          <Card
                            key={result.id}
                            className="p-4 hover-elevate cursor-pointer"
                            onClick={() => toggleUserSelection(result.id)}
                            data-testid={`card-search-result-${result.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {result.selectedAvatar?.startsWith('/objects/') ? (
                                  <img 
                                    src={result.selectedAvatar} 
                                    alt="User avatar" 
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-xl">
                                    {result.selectedAvatar || '👤'}
                                  </div>
                                )}
                                <div className="flex-1">
                                  <p className="font-semibold">{result.username}</p>
                                  {(result.firstName || result.lastName) && (
                                    <p className="text-sm text-gray-600">
                                      {result.firstName} {result.lastName}
                                    </p>
                                  )}
                                  {result.email && (
                                    <p className="text-sm text-gray-500 flex items-center gap-1">
                                      <Mail className="w-3 h-3" />
                                      {result.email}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleUserSelection(result.id)}
                                onClick={(e) => e.stopPropagation()}
                                data-testid={`checkbox-user-${result.id}`}
                              />
                            </div>
                          </Card>
                        );
                      })}
                  </div>
                )}
              </ScrollArea>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setInviteDialogOpen(false);
                    setSearchQuery("");
                    setSelectedUsers([]);
                  }}
                  data-testid="button-cancel-invite"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={selectedUsers.length === 0 || inviteMutation.isPending}
                  data-testid="button-send-invites"
                >
                  {inviteMutation.isPending ? "Sending..." : `Invite ${selectedUsers.length || ''}`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={removeMemberConfirmOpen} onOpenChange={setRemoveMemberConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {memberToRemove?.username} from this group?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-remove">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveMember}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-remove"
              >
                Remove Member
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={pendingRequestsDialogOpen} onOpenChange={setPendingRequestsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pending Join Requests</DialogTitle>
              <DialogDescription>
                {selectedGroup?.name}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[400px] pr-4">
              <div className="space-y-3">
                {joinRequestToDos.filter(todo => todo.groupId === selectedGroup?.id).length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No pending requests</p>
                ) : (
                  joinRequestToDos
                    .filter(todo => todo.groupId === selectedGroup?.id)
                    .map((todo: any) => {
                      const metadata = todo.metadata ? JSON.parse(todo.metadata) : null;
                      return (
                        <Card key={todo.id} className="p-4" data-testid={`card-pending-request-${todo.id}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{todo.message}</p>
                              {metadata && metadata.requesterUsername && (
                                <p className="text-xs text-gray-600 mt-1">
                                  User: {metadata.requesterUsername}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <Button
                                size="sm"
                                onClick={() => approveAccessRequestMutation.mutate({ 
                                  groupId: todo.groupId, 
                                  userId: todo.requesterId, 
                                  todoId: todo.id 
                                })}
                                disabled={approveAccessRequestMutation.isPending}
                                data-testid={`button-approve-request-${todo.id}`}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => completeTodoMutation.mutate(todo.id)}
                                disabled={completeTodoMutation.isPending}
                                data-testid={`button-decline-request-${todo.id}`}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Decline
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

        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Join with Password</DialogTitle>
              <DialogDescription>
                Enter the password to join {selectedGroupForPassword?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="join-password">Password</Label>
                <Input
                  id="join-password"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter group password"
                  data-testid="input-join-password"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && passwordInput.trim() && selectedGroupForPassword) {
                      joinWithPasswordMutation.mutate({
                        groupId: selectedGroupForPassword.id,
                        password: passwordInput
                      });
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPasswordDialogOpen(false);
                    setPasswordInput("");
                    setSelectedGroupForPassword(null);
                  }}
                  disabled={joinWithPasswordMutation.isPending}
                  data-testid="button-cancel-join-password"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (selectedGroupForPassword) {
                      joinWithPasswordMutation.mutate({
                        groupId: selectedGroupForPassword.id,
                        password: passwordInput
                      });
                    }
                  }}
                  disabled={!passwordInput.trim() || joinWithPasswordMutation.isPending}
                  data-testid="button-submit-join-password"
                >
                  {joinWithPasswordMutation.isPending ? "Joining..." : "Join Group"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Co-owners Management Dialog */}
        <Dialog open={coOwnersDialogOpen} onOpenChange={setCoOwnersDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Manage Co-owners</DialogTitle>
              <DialogDescription>
                Add other teachers who can manage "{selectedGroupForCoOwners?.name}"
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Current Co-owners */}
              <div>
                <Label className="text-sm font-medium">Current Co-owners</Label>
                {groupCoOwners.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">No co-owners yet</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {groupCoOwners.map((co: any) => (
                      <div key={co.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <span className="text-sm">
                          {co.firstName && co.lastName 
                            ? `${co.firstName} ${co.lastName}` 
                            : co.username}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeGroupCoOwnerMutation.mutate(co.coOwnerUserId)}
                          disabled={removeGroupCoOwnerMutation.isPending}
                          data-testid={`button-remove-group-co-owner-${co.coOwnerUserId}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Co-owner */}
              <div>
                <Label className="text-sm font-medium">Add Co-owner</Label>
                <Input
                  className="mt-2"
                  placeholder="Search by name, email, or username..."
                  value={groupTeacherSearchQuery}
                  onChange={(e) => setGroupTeacherSearchQuery(e.target.value)}
                  data-testid="input-search-group-teacher"
                />
                {groupTeacherSearchQuery.length >= 2 && (
                  <div className="mt-2 border rounded-md max-h-40 overflow-y-auto">
                    {isSearchingGroupTeachers ? (
                      <p className="text-sm text-muted-foreground p-2">Searching...</p>
                    ) : groupTeacherSearchResults.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-2">No teachers found</p>
                    ) : (
                      groupTeacherSearchResults
                        .filter((t: any) => !groupCoOwners.some((co: any) => co.coOwnerUserId === t.id))
                        .map((teacher: any) => (
                          <div
                            key={teacher.id}
                            className="flex items-center justify-between p-2 hover:bg-muted cursor-pointer"
                            onClick={() => addGroupCoOwnerMutation.mutate(teacher.id)}
                            data-testid={`search-result-group-teacher-${teacher.id}`}
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {teacher.firstName && teacher.lastName 
                                  ? `${teacher.firstName} ${teacher.lastName}` 
                                  : teacher.username}
                              </p>
                              {teacher.email && (
                                <p className="text-xs text-muted-foreground">{teacher.email}</p>
                              )}
                            </div>
                            <Button size="sm" variant="ghost" disabled={addGroupCoOwnerMutation.isPending}>
                              <UserPlus className="w-4 h-4" />
                            </Button>
                          </div>
                        ))
                    )}
                  </div>
                )}
                {groupTeacherSearchQuery.length > 0 && groupTeacherSearchQuery.length < 2 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Type at least 2 characters to search
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button onClick={() => setCoOwnersDialogOpen(false)} data-testid="button-close-group-co-owners">
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
