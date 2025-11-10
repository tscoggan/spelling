import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Trash2, Users, Globe, Lock, Home, UserPlus, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import schoolPattern from "@assets/generated_images/Cartoon_school_objects_background_pattern_1ab3a6ac.png";

export default function UserGroupsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    isPublic: false,
  });

  const { data: groups = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/user-groups"],
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/user-groups", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups"] });
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

  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["/api/user-groups", selectedGroup?.id, "members"],
    queryFn: async () => {
      if (!selectedGroup) return [];
      const response = await fetch(`/api/user-groups/${selectedGroup.id}/members`);
      if (!response.ok) throw new Error("Failed to fetch members");
      return await response.json();
    },
    enabled: !!selectedGroup && membersDialogOpen,
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

  const ownedGroups = groups.filter(g => g.ownerUserId === user?.id);
  const memberGroups = groups.filter(g => g.ownerUserId !== user?.id && !g.isPublic);
  const publicGroups = groups.filter(g => g.isPublic && g.ownerUserId !== user?.id);

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
            <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-home">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
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
                <Card className="p-8 text-center">
                  <p className="text-gray-600">You haven't created any groups yet</p>
                  <Button
                    onClick={() => setCreateDialogOpen(true)}
                    className="mt-4"
                    data-testid="button-create-first-group"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Group
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ownedGroups.map((group) => (
                    <Card key={group.id} className="hover-elevate" data-testid={`card-group-${group.id}`}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          {group.name}
                          {group.isPublic ? (
                            <Globe className="w-4 h-4 text-green-600" data-testid="icon-public-group" />
                          ) : (
                            <Lock className="w-4 h-4 text-gray-600" data-testid="icon-private-group" />
                          )}
                        </CardTitle>
                        <CardDescription>Owner</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewMembers(group)}
                            className="flex-1"
                            data-testid={`button-view-members-${group.id}`}
                          >
                            <Users className="w-4 h-4 mr-2" />
                            Members
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(group.id)}
                            data-testid={`button-delete-${group.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {memberGroups.map((group) => (
                    <Card key={group.id} className="hover-elevate" data-testid={`card-member-group-${group.id}`}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          {group.name}
                          {group.isPublic ? (
                            <Globe className="w-4 h-4 text-green-600" />
                          ) : (
                            <Lock className="w-4 h-4 text-gray-600" />
                          )}
                        </CardTitle>
                        <CardDescription>Member</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewMembers(group)}
                          className="w-full"
                          data-testid={`button-view-members-${group.id}`}
                        >
                          <Users className="w-4 h-4 mr-2" />
                          View Members
                        </Button>
                      </CardContent>
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
                <p className="text-gray-600 mb-4">
                  Join public groups to share and access word lists
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {publicGroups.map((group) => (
                    <Card key={group.id} className="hover-elevate" data-testid={`card-public-group-${group.id}`}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          {group.name}
                          <Globe className="w-4 h-4 text-green-600" />
                        </CardTitle>
                        <CardDescription>Public Group</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewMembers(group)}
                            className="flex-1"
                            data-testid={`button-view-members-${group.id}`}
                          >
                            <Users className="w-4 h-4 mr-2" />
                            Members
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => toast({ title: "Request access feature coming soon!" })}
                            data-testid={`button-request-access-${group.id}`}
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Join
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
                  {members.map((member: any) => (
                    <Card key={member.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-xl">
                            {member.selectedAvatar}
                          </div>
                          <div>
                            <p className="font-semibold">{member.username}</p>
                            {(member.firstName || member.lastName) && (
                              <p className="text-sm text-gray-600">
                                {member.firstName} {member.lastName}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
