"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Loader2,
    Users,
    Search,
    UserCheck,
    UserX,
    RefreshCw,
    GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
    user_id: string;
    name: string | null;
    Email: string | null;
    grade: string | null;
}

export default function AdminMemberPage() {
    const { user } = useAuth();

    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [loadingProfiles, setLoadingProfiles] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

    // 전체 회원 프로필 조회
    const fetchProfiles = async () => {
        setLoadingProfiles(true);
        try {
            const { data, error } = await supabase
                .from("profile")
                .select("user_id, name, Email, grade")
                .order("name", { ascending: true });

            if (error) {
                toast.error("회원 목록을 불러오는 중 오류가 발생했습니다.");
                console.error(error);
            } else if (data) {
                setProfiles(data as UserProfile[]);
            }
        } catch (err) {
            console.error("프로필 조회 실패:", err);
            toast.error("회원 목록을 가져오지 못했습니다.");
        } finally {
            setLoadingProfiles(false);
        }
    };

    useEffect(() => {
        fetchProfiles();
    }, []);

    // 회원 등급 (grade) 변경 함수
    const handleGradeChange = async (targetUserId: string, newGradeValue: string) => {
        const newGrade = newGradeValue === "NONE" ? null : newGradeValue;

        setUpdatingUserId(targetUserId);

        try {
            const { error } = await supabase
                .from("profile")
                .update({ grade: newGrade })
                .eq("user_id", targetUserId);

            if (error) {
                toast.error("등급 변경에 실패했습니다.");
                console.error(error);
            } else {
                const gradeLabel = newGrade === "A" ? "관리자(A)" : newGrade === "S" ? "학생(S)" : "일반회원(미지정)";
                toast.success(`등급이 '${gradeLabel}'(으)로 변경되었습니다.`);
                setProfiles((prev) =>
                    prev.map((p) => (p.user_id === targetUserId ? { ...p, grade: newGrade } : p))
                );
            }
        } catch (err) {
            console.error("등급 업데이트 오류:", err);
            toast.error("오류가 발생했습니다.");
        } finally {
            setUpdatingUserId(null);
        }
    };

    // 검색어 필터링
    const filteredProfiles = profiles.filter((p) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        const nameMatch = p.name?.toLowerCase().includes(query) ?? false;
        const emailMatch = p.Email?.toLowerCase().includes(query) ?? false;
        return nameMatch || emailMatch;
    });

    const adminCount = profiles.filter((p) => p.grade === "A").length;
    const studentCount = profiles.filter((p) => p.grade === "S").length;
    const generalCount = profiles.filter((p) => !p.grade || (p.grade !== "A" && p.grade !== "S")).length;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">회원 등급 관리</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        전체 회원 목록을 조회하고 `profile` 테이블의 `grade` 컬럼(A: 관리자, S: 학생, null: 일반회원) 권한을 관리합니다.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchProfiles}
                        disabled={loadingProfiles}
                        className="gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${loadingProfiles ? "animate-spin" : ""}`} />
                        새로고침
                    </Button>
                </div>
            </div>

            {/* 통계 요약 카드 */}
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
                        <p className="text-xs text-zinc-500 mt-1">전체 회원 수</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                            관리자 (A)
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
                            학생 (S)
                        </CardTitle>
                        <GraduationCap className="w-4 h-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                            {studentCount}명
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">출석체크 대상 수강생</p>
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

            {/* 회원 목록 테이블 카드 */}
            <Card className="shadow-sm">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg font-bold">회원 권한 설정</CardTitle>
                            <CardDescription className="mt-1 text-xs md:text-sm">
                                회원별 등급을 선택하여 관리자(A), 학생(S), 일반회원(null) 권한을 부여합니다.
                            </CardDescription>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <Input
                                placeholder="이름 또는 이메일 검색"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-xs md:text-sm"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loadingProfiles ? (
                        <div className="py-12 text-center text-zinc-500 flex flex-col items-center gap-2">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span className="text-sm">회원 목록을 불러오는 중...</span>
                        </div>
                    ) : filteredProfiles.length === 0 ? (
                        <div className="py-12 text-center text-zinc-500 text-sm">
                            {searchQuery ? "검색 결과와 일치하는 회원이 없습니다." : "등록된 회원이 없습니다."}
                        </div>
                    ) : (
                        <div className="rounded-md border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                                    <TableRow>
                                        <TableHead className="w-[200px] text-xs">이름</TableHead>
                                        <TableHead className="text-xs">이메일</TableHead>
                                        <TableHead className="w-[150px] text-center text-xs">현재 등급 (grade)</TableHead>
                                        <TableHead className="w-[180px] text-right text-xs">등급 변경 설정</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredProfiles.map((p) => {
                                        const isCurrentUser = p.user_id === user?.id;
                                        const currentGrade = p.grade || "NONE";
                                        const isUpdating = updatingUserId === p.user_id;

                                        return (
                                            <TableRow key={p.user_id}>
                                                <TableCell className="font-semibold text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <span>{p.name || "(이름 없음)"}</span>
                                                        {isCurrentUser && (
                                                            <Badge variant="outline" className="text-[10px] py-0 bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-300">
                                                                나
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-zinc-600 dark:text-zinc-400 text-sm">
                                                    {p.Email || "-"}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {p.grade === "A" ? (
                                                        <Badge className="bg-emerald-600 hover:bg-emerald-700">
                                                            관리자 (A)
                                                        </Badge>
                                                    ) : p.grade === "S" ? (
                                                        <Badge className="bg-blue-600 hover:bg-blue-700">
                                                            학생 (S)
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary">일반 회원 (null)</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {isUpdating && <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />}
                                                        <Select
                                                            value={currentGrade}
                                                            disabled={isUpdating}
                                                            onValueChange={(val) => handleGradeChange(p.user_id, val)}
                                                        >
                                                            <SelectTrigger className="w-[140px] h-8 text-xs">
                                                                <SelectValue placeholder="등급 선택" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="A">관리자 (A)</SelectItem>
                                                                <SelectItem value="S">학생 (S)</SelectItem>
                                                                <SelectItem value="NONE">일반회원 (null)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
