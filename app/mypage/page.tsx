"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, CalendarCheck, ArrowRight, User, Loader2, ListTodo, Calendar as CalendarIcon } from "lucide-react";
import { useTodos } from "@/hooks/useTodos";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function MyPageMainPage() {
    const { user, loading: todoLoading, inProgressCount, completedCount, totalCount } = useTodos();
    const [attendanceCount, setAttendanceCount] = useState<number | null>(null);
    const [loadingAttendance, setLoadingAttendance] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoadingAttendance(false);
            return;
        }

        async function fetchAttendanceSummary() {
            try {
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                
                const { count, error } = await supabase
                    .from("attendance")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", user?.id)
                    .gte("created_at", firstDay);

                if (!error) {
                    setAttendanceCount(count || 0);
                }
            } catch (err) {
                console.error("Error fetching attendance summary:", err);
            } finally {
                setLoadingAttendance(false);
            }
        }

        fetchAttendanceSummary();
    }, [user]);

    if (todoLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 w-full">
                <Loader2 className="h-10 w-10 animate-spin mb-4" />
                <p className="text-sm font-medium animate-pulse">마이페이지 정보를 불러오는 중입니다...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-12 text-center shadow-sm w-full">
                <User className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                <h2 className="text-lg font-semibold mb-2">로그인이 필요합니다</h2>
                <p className="text-sm text-muted-foreground mb-6">마이페이지 대시보드를 보려면 로그인해주세요.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* 상단 프로필 환영 카드 */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-zinc-900 dark:to-zinc-950 p-6 text-white shadow-md">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-xl font-bold">
                            {user.email?.[0].toUpperCase() || "U"}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{user.email?.split("@")[0]}님, 환영합니다!</h2>
                            <p className="text-xs text-zinc-300 mt-0.5">{user.email}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 메인 요약 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 할일 요약 카드 */}
                <Card className="border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <CheckSquare className="w-5 h-5 text-blue-500" />
                            할일 현황
                        </CardTitle>
                        <Button variant="ghost" size="sm" asChild className="gap-1 text-xs text-zinc-500 hover:text-black dark:hover:text-white">
                            <Link href="/mypage/todos">
                                관리하기 <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="grid grid-cols-3 gap-3 text-center mb-4">
                            <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                                <span className="text-xs text-muted-foreground block mb-1">전체</span>
                                <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{totalCount}</span>
                            </div>
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                                <span className="text-xs text-amber-600 dark:text-amber-400 block mb-1">진행중</span>
                                <span className="text-xl font-bold text-amber-600 dark:text-amber-400">{inProgressCount}</span>
                            </div>
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 block mb-1">완료</span>
                                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{completedCount}</span>
                            </div>
                        </div>
                        <Button asChild className="w-full justify-center gap-2" variant="outline">
                            <Link href="/mypage/todos">
                                <ListTodo className="w-4 h-4" />
                                할일 목록 보러가기
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* 출석체크 요약 카드 */}
                <Card className="border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <CalendarCheck className="w-5 h-5 text-emerald-500" />
                            출석체크 현황
                        </CardTitle>
                        <Button variant="ghost" size="sm" asChild className="gap-1 text-xs text-zinc-500 hover:text-black dark:hover:text-white">
                            <Link href="/mypage/attendance">
                                출석하기 <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg text-center mb-4">
                            <span className="text-xs text-muted-foreground block mb-1">이번 달 출석 횟수</span>
                            {loadingAttendance ? (
                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-zinc-400" />
                            ) : (
                                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                    {attendanceCount ?? 0}일 출석
                                </span>
                            )}
                        </div>
                        <Button asChild className="w-full justify-center gap-2" variant="outline">
                            <Link href="/mypage/attendance">
                                <CalendarIcon className="w-4 h-4" />
                                출석체크 하러가기
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
