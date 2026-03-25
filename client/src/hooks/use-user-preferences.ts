import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export interface PreferencesData {
  id?: number;
  userId?: number;
  gameGradeFilter: string;
  gameCreatedByFilter: string;
  gameHideMastered: boolean;
  wordListGradeFilter: string;
  wordListCreatedByFilter: string;
  wordListHideMastered: boolean;
  wordListActiveTab: string;
  statsDateFilter: string;
}

const DEFAULTS: PreferencesData = {
  gameGradeFilter: "all",
  gameCreatedByFilter: "me",
  gameHideMastered: false,
  wordListGradeFilter: "all",
  wordListCreatedByFilter: "me",
  wordListHideMastered: false,
  wordListActiveTab: "all",
  statsDateFilter: "all",
};

export function useUserPreferences() {
  const { user } = useAuth();

  const { data: serverPrefs } = useQuery<PreferencesData | null>({
    queryKey: ["/api/preferences"],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
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

  const prefs: PreferencesData = serverPrefs
    ? { ...DEFAULTS, ...serverPrefs }
    : DEFAULTS;

  const updatePref = (key: keyof PreferencesData, value: string | boolean) => {
    if (!user) return;
    mutation.mutate({ [key]: value } as Partial<PreferencesData>);
  };

  return { prefs, updatePref };
}
