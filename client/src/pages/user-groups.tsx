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
import { Plus, Trash2, Users, Globe, Lock, Home, UserPlus, Settings, Search, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { UserHeader } from "@/components/user-header";
import schoolPattern from "@assets/generated_images/Cartoon_school_objects_background_pattern_1ab3a6ac.png";

export default function UserGroupsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
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
  });

  const { data: groups = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/user-groups", user?.id],
    queryFn: async () => {
      const response = await fetch("/api/user-groups", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch groups");
      return await response.json();
    },
    enabled: !!user,
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
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleDelete = (groupId: number) => {
    if (confirm("Are you sure you want to delete this group? This cannot be undone.")) {
      deleteMutation.mutate(groupId);
    }
  };

  const viewMembers = (group: any) => {
    setSelectedGroup(group);
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

  const { data: pendingRequests = [] } = useQuery<any[]>({
    queryKey: ["/api/user-pending-requests", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/user-pending-requests", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pending requests");
      return await res.json();
    },
    enabled: !!user,
  });

  // Create set of group IDs with pending join requests
  const pendingRequestGroupIds = new Set(
    pendingRequests
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
      className="min-h-screen p-6 relative"
      style={{ backgroundColor: '#FFFFFF' }}
    >
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: `url(${schoolPattern})`,
          backgroundSize: '240px 240px',
          backgroundRepeat: 'repeat',
          backgroundPosition: 'center',
        }}
      ></div>

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
            <h1 className="text-4xl font-bold text-gray-800 mb-2 font-crayon">User Groups</h1>
            <p className="text-gray-600">Create and manage groups to share word lists</p>
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
                  <DialogTitle>Create New Group</DialogTitle>
                  <DialogDescription>
                    Create a group to share word lists with other users
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
                      disabled={createMutation.isPending}
                      data-testid="button-save-group"
                    >
                      Create Group
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
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
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
                          <p className="text-xs text-gray-600 mb-2">Owner</p>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openInviteDialog(group)}
                              data-testid={`button-invite-${group.id}`}
                            >
                              <UserPlus className="w-3 h-3 mr-1" />
                              Invite
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(group.id)}
                              data-testid={`button-delete-${group.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
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
                  ))}
                </div>
              )}
            </div>

            {memberGroups.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
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
                          <p className="text-xs text-gray-600">Member</p>
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

            {publicGroups.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Globe className="w-6 h-6 text-green-600" />
                  Public Groups
                </h2>
                <p className="text-gray-600 mb-4 text-sm">
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
                            <p className="text-xs text-gray-600 mb-2">Public Group</p>
                            <Button
                              size="sm"
                              onClick={() => requestAccessMutation.mutate(group.id)}
                              disabled={hasPendingRequest || requestAccessMutation.isPending}
                              variant={hasPendingRequest ? "outline" : "default"}
                              data-testid={`button-request-access-${group.id}`}
                            >
                              {hasPendingRequest ? "Request Pending" : requestAccessMutation.isPending ? "Sending..." : "Join"}
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
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-xl">
                              {member.selectedAvatar}
                            </div>
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
                                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-xl">
                                  {result.selectedAvatar || '👤'}
                                </div>
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
      </div>
    </div>
  );
}
