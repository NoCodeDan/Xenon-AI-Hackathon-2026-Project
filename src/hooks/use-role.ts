import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useRole() {
  const user = useQuery(api.users.getCurrent);
  return {
    role: user?.role ?? null,
    isAdmin: user?.role === "admin",
    isEditor: user?.role === "editor" || user?.role === "admin",
    isViewer: !!user?.role,
    isLoading: user === undefined,
  };
}
