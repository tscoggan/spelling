import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export interface PreferencesData {
  id?: number;
  userId?: number;
  gameGradeFilter: string;
  gameCreatedByFilter: string;
  gameHideMastered: boolean;
  gameSpecificAuthorSearch: string;
  wordListGradeFilter: string;
  wordListCreatedByFilter: string;
  wordListHideMastered: boolean;
  wordListActiveTab: string;
  wordListSpecificAuthorSearch: string;
  statsDateFilter: string;
}

const DEFAULTS: PreferencesData = {
  gameGradeFilter: "all",
  gameCreatedByFilter: "me",
  gameHideMastered: false,
  gameSpecificAuthorSearch: "",
  wordListGradeFilter: "all",
  wordListCreatedByFilter: "me",
  wordListHideMastered: false,
  wordListActiveTab: "all",
  wordListSpecificAuthorSearch: "",
  statsDateFilter: "all",
};

export function useUserPreferences() {
  const { user, isGuestMode } = useAuth();
  const isRealUser = !!user && !isGuestMode;

  const { data: serverPrefs } = useQuery<PreferencesData | null>({
    queryKey: ["/api/preferences"],
    enabled: isRealUser,
    staleTime: 0,
    refetchOnMount: true,
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const mutation = useMutation({
    mutationFn: async (updates: Partial<PreferencesData>) => {
      const res = await apiRequest("PATCH", "/api/preferences", updates);
      return res.json();
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ["/api/preferences"] });
      const previous = queryClient.getQueryData<PreferencesData | null>(["/api/preferences"]);
      queryClient.setQueryData<PreferencesData | null>(["/api/preferences"], (old) => ({
        ...(old ?? DEFAULTS),
        ...updates,
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["/api/preferences"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
    },
  });

  // serverPrefs is undefined while loading, null if no row exists, or the actual data
  const isLoaded = serverPrefs !== undefined;
  const prefs: PreferencesData = serverPrefs
    ? { ...DEFAULTS, ...serverPrefs }
    : DEFAULTS;

  const updatePref = (key: keyof PreferencesData, value: string | boolean) => {
    if (!isRealUser) return;
    mutation.mutate({ [key]: value } as Partial<PreferencesData>);
  };

  return { prefs, updatePref, isLoaded };
}
