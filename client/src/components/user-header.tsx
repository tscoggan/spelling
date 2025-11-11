import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogOut, Bell } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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

export function UserHeader() {
  const { user, logoutMutation } = useAuth();
  const [todoModalOpen, setTodoModalOpen] = useState(false);
  const { toast } = useToast();

  const { data: todoCount = 0 } = useQuery<number>({
    queryKey: ["/api/user-to-dos/count"],
    enabled: !!user,
  });

  const { data: todos = [] } = useQuery<any[]>({
    queryKey: ["/api/user-to-dos"],
    enabled: !!user && todoModalOpen,
  });

  const completeTodoMutation = useMutation({
    mutationFn: async (todoId: number) => {
      await apiRequest("POST", `/api/user-to-dos/${todoId}/complete`, {});
    },
    onMutate: async (todoId: number) => {
      await queryClient.cancelQueries({ queryKey: ["/api/user-to-dos"] });
      await queryClient.cancelQueries({ queryKey: ["/api/user-to-dos/count"] });

      const previousTodos = queryClient.getQueryData<any[]>(["/api/user-to-dos"]);
      const previousCount = queryClient.getQueryData<number>(["/api/user-to-dos/count"]);

      queryClient.setQueryData<any[]>(["/api/user-to-dos"], (old) => 
        old ? old.filter(todo => todo.id !== todoId) : []
      );
      queryClient.setQueryData<number>(["/api/user-to-dos/count"], (old) => 
        Math.max(0, (old || 1) - 1)
      );

      return { previousTodos, previousCount };
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
      if (context?.previousTodos) {
        queryClient.setQueryData(["/api/user-to-dos"], context.previousTodos);
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(["/api/user-to-dos/count"], context.previousCount);
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
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-to-dos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-to-dos/count"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-to-dos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-to-dos/count"] });
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
    const metadata = JSON.parse(todo.metadata);
    acceptInviteMutation.mutate({ groupId: metadata.groupId, todoId: todo.id });
  };

  const handleApproveRequest = (todo: any) => {
    const metadata = JSON.parse(todo.metadata);
    approveAccessRequestMutation.mutate({ groupId: metadata.groupId, userId: metadata.requesterId, todoId: todo.id });
  };

  const handleDecline = (todoId: number) => {
    completeTodoMutation.mutate(todoId);
  };

  return (
    <>
      <div className="flex justify-end mb-6">
        <Card className="px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {user?.selectedAvatar && (
                <div className="text-3xl" data-testid="text-user-avatar">{user.selectedAvatar}</div>
              )}
              <div>
                <div className="text-sm text-gray-600">Logged in as</div>
                <div className="text-lg font-bold text-gray-800" data-testid="text-username">
                  {user?.username}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
                  const isAccessRequest = todo.type === 'group_access_request';

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
    </>
  );
}
