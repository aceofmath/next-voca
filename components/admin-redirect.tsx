"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";

export function AdminRedirect() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const hasRedirectedRef = useRef<boolean>(false);

    useEffect(() => {
        if (loading || !user) {
            hasRedirectedRef.current = false;
            return;
        }

        // If already on /admin subpath, no need to redirect
        if (pathname.startsWith("/admin")) {
            return;
        }

        // Only check redirect once per session load to avoid annoying loops
        if (hasRedirectedRef.current) return;

        async function checkAdminAndRedirect() {
            try {
                const { data, error } = await supabase
                    .from("profile")
                    .select("grade")
                    .eq("user_id", user!.id)
                    .maybeSingle();

                if (!error && data && data.grade === "A") {
                    hasRedirectedRef.current = true;
                    router.push("/admin");
                }
            } catch (err) {
                console.error("Failed to check admin status for redirect:", err);
            }
        }

        checkAdminAndRedirect();
    }, [user, loading, pathname, router]);

    return null;
}
