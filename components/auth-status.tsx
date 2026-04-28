"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { LogOut, User, LogIn } from "lucide-react";

export function AuthStatus({ isMobile = false }: { isMobile?: boolean }) {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const checkUser = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            setUser(user);
        };
        checkUser();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: typeof window !== "undefined" ? window.location.origin : "",
            },
        });

        if (error) {
            console.error("구글 로그인 시도 중 오류 발생:", error.message);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    if (isMobile) {
        return (
            <div className="flex flex-col gap-4 w-full">
                {user ? (
                    <>
                        <div className="flex items-center gap-3 px-1 py-2">
                            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center overflow-hidden border">{user.user_metadata.avatar_url ? <img src={user.user_metadata.avatar_url} alt="profile" /> : <User className="w-6 h-6" />}</div>
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold">{user.user_metadata.full_name || user.email}</span>
                                <span className="text-xs text-zinc-500">{user.email}</span>
                            </div>
                        </div>
                        <Button variant="outline" className="w-full h-12 text-base font-semibold text-red-500" onClick={handleLogout}>
                            <LogOut className="w-4 h-4 mr-2" />
                            로그아웃
                        </Button>
                    </>
                ) : (
                    <Button variant="default" className="w-full h-12 text-base font-semibold" onClick={handleGoogleLogin}>
                        <LogIn className="w-4 h-4 mr-2" />
                        구글 로그인
                    </Button>
                )}
            </div>
        );
    }

    return (
        <>
            {user ? (
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden">{user.user_metadata.avatar_url ? <img src={user.user_metadata.avatar_url} alt="profile" /> : <User className="w-3.5 h-3.5" />}</div>
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 max-w-[120px] truncate">{user.user_metadata.full_name || user.email}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleLogout} className="h-9 w-9 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" title="로그아웃">
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>
            ) : (
                <Button variant="default" size="sm" onClick={handleGoogleLogin} className="font-semibold">
                    <LogIn className="w-4 h-4 mr-2" />
                    로그인
                </Button>
            )}
        </>
    );
}
