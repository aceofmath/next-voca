"use client";

import { useEffect } from "react";
import { useAuthStore } from "./useAuthStore";
import { supabase } from "@/lib/supabaseClient";

export function useAuth() {
    const {
        user,
        loading,
        profileMap,
        setUser,
        fetchUser,
        syncProfile,
        fetchProfiles,
        loginWithGoogle,
        logout,
    } = useAuthStore();

    useEffect(() => {
        fetchUser();
        fetchProfiles();
    }, [fetchUser, fetchProfiles]);

    const getAuthorDisplayName = (userId?: string | null) => {
        if (!userId) return "-";
        return profileMap[userId] || "-";
    };

    const getLoggedInUserName = () => {
        if (!user) return "";
        return (
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            (user.id ? profileMap[user.id] : "") ||
            "사용자"
        );
    };

    return {
        user,
        loading,
        profileMap,
        loginWithGoogle,
        logout,
        getAuthorDisplayName,
        getLoggedInUserName,
    };
}
