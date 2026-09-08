"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, UserX, GraduationCap, RefreshCw, CalendarCheck, ArrowRight, MapPin } from "lucide-react";
import Link from "next/link";

interface UserProfile {
    user_id: string;
    grade: string | null;
}

export default function AdminDashboardPage() {
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    const fetchProfiles = async () => {
        setLoading(true);
        try {
            const { data } = await supabase.from("profile").select("user_id, grade");
            if (data) {
                setProfiles(data as UserProfile[]);
            }
        } catch (err) {
            console.error("Failed to fetch dashboard profiles:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfiles();
    }, []);

    const adminCount = profiles.filter((p) => p.grade === "A").length;
    const studentCount = profiles.filter((p) => p.grade === "S").length;
    const generalCount = profiles.filter((p) => !p.grade || (p.grade !== "A" && p.grade !== "S")).length;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">대시보드 개요</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        JOKIM 수학까페학원의 전체 회원 및 출석 관리 현황입니다.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchProfiles} disabled={loading} className="gap-2">
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    새로고침
                </Button>
            </div>

            {/* Overview Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                            총 등록 회원
                        </CardTitle>
                        <Users className="w-4 h-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-extrabold">{profiles.length}명</div>
                        <p className="text-xs text-zinc-500 mt-1">학원 시스템 전체 가입자</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                            관리자 (grade: A)
                        </CardTitle>
                        <UserCheck className="w-4 h-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                            {adminCount}명
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">관리자 권한 계정</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                            학생 (grade: S)
                        </CardTitle>
                        <GraduationCap className="w-4 h-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                            {studentCount}명
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">출석 체크 대상 수강생</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                            미지정 / 일반회원
                        </CardTitle>
                        <UserX className="w-4 h-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-extrabold text-zinc-600 dark:text-zinc-300">
                            {generalCount}명
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">권한 승인 대기 계정</p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Link Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            회원 등급 관리
                        </CardTitle>
                        <CardDescription>
                            회원 목록을 확인하고 관리자(A), 학생(S), 일반회원(null) 권한을 관리합니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="gap-2 w-full">
                            <Link href="/admin/member">
                                회원 등급 관리 바로가기
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <CalendarCheck className="w-5 h-5 text-emerald-600" />
                            학생 출석 관리
                        </CardTitle>
                        <CardDescription>
                            학생들의 월별 출석 기록을 조회하고 등/하원 일시를 수정 관리합니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="outline" className="gap-2 w-full">
                            <Link href="/admin/attendance">
                                출석 관리 바로가기
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-red-500" />
                            학원 위치 관리
                        </CardTitle>
                        <CardDescription>
                            출석 체크 인정 기준 좌표(위도/경도)와 허용 반경(m)을 설정하고 지도 영역을 확인합니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="outline" className="gap-2 w-full">
                            <Link href="/admin/location">
                                위치 관리 바로가기
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
