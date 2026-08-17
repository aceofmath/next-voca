import { create } from "zustand";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

interface AuthState {
    user: SupabaseUser | null;
    loading: boolean;
    profileMap: Record<string, string>;
    setUser: (user: SupabaseUser | null) => void;
    setProfileMap: (map: Record<string, string>) => void;
    fetchUser: () => Promise<void>;
    syncProfile: (user: SupabaseUser) => Promise<void>;
    fetchProfiles: () => Promise<Record<string, string>>;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    loading: true,
    profileMap: {},
    setUser: (user) => set({ user }),
    setProfileMap: (map) => set({ profileMap: map }),

    fetchUser: async () => {
        try {
            set({ loading: true });
            const {
                data: { user },
            } = await supabase.auth.getUser();
            set({ user });
            if (user) {
                await get().syncProfile(user);
            }
        } catch (error) {
            console.error("Failed to fetch auth user:", error);
        } finally {
            set({ loading: false });
        }
    },

    syncProfile: async (currentUser) => {
        if (!currentUser) return;
        try {
            const displayName =
                currentUser.user_metadata?.full_name ||
                currentUser.user_metadata?.name ||
                currentUser.email?.split("@")[0] ||
                "사용자";

            await supabase.from("profile").upsert(
                [
                    {
                        user_id: currentUser.id,
                        name: displayName,
                        Email: currentUser.email || "",
                    },
                ],
                { onConflict: "user_id" }
            );

            // Refresh profile map after sync
            await get().fetchProfiles();
        } catch (err) {
            console.error("Profile sync error:", err);
        }
    },

    fetchProfiles: async () => {
        try {
            const { data, error } = await supabase.from("profile").select("user_id, name");
            if (error) {
                console.error("Error fetching profiles:", error.message);
                return get().profileMap;
            }
            const map: Record<string, string> = {};
            if (data) {
                data.forEach((p) => {
                    if (p.user_id && p.name) {
                        map[p.user_id] = p.name;
                    }
                });
            }
            set({ profileMap: map });
            return map;
        } catch (err) {
            console.error("Fetch profiles exception:", err);
            return get().profileMap;
        }
    },

    loginWithGoogle: async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: typeof window !== "undefined" ? window.location.origin : "",
            },
        });
        if (error) {
            console.error("Google login error:", error.message);
        }
    },

    logout: async () => {
        await supabase.auth.signOut();
        set({ user: null });
    },
}));
