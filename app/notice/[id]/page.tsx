"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, ArrowLeft, Calendar, Eye, Pencil, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Notice {
    id: number;
    title: string;
    content: string;
    created_at: string;
    read_cnt: number;
    user_id?: string | null;
}

export default function NoticeDetail() {
    const params = useParams();
    const router = useRouter();
    const id = params.id;

    const [notice, setNotice] = useState<Notice | null>(null);
    const [authorName, setAuthorName] = useState<string>("-");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const fetchNoticeAndIncrementView = async () => {
            if (!id || Array.isArray(id)) return;

            setLoading(true);
            // 1. 공지사항 상세 데이터 조회
            const { data, error: fetchError } = await supabase
                .from("notice")
                .select("*")
                .eq("id", parseInt(id))
                .single();

            if (fetchError || !data) {
                console.error("공지사항을 불러오는 중 에러 발생:", fetchError?.message);
                setError("공지사항을 찾을 수 없거나 불러오는 중 오류가 발생했습니다.");
                setLoading(false);
                return;
            }

            // 2. profile 테이블에서 user_id 매칭 데이터 가져오기
            if (data.user_id) {
                const { data: prof } = await supabase
                    .from("profile")
                    .select("name")
                    .eq("user_id", data.user_id)
                    .single();
                
                if (prof?.name) {
                    setAuthorName(prof.name);
                } else {
                    setAuthorName("-");
                }
            } else {
                setAuthorName("-");
            }

            // 3. 조회수 1 증가 업데이트 진행
            const updatedReadCnt = (data.read_cnt || 0) + 1;
            const { error: updateError } = await supabase
                .from("notice")
                .update({ read_cnt: updatedReadCnt })
                .eq("id", data.id);

            if (updateError) {
                console.error("조회수 업데이트 실패:", updateError.message);
            }

            setNotice({
                ...data,
                read_cnt: updatedReadCnt
            });
            setLoading(false);
        };

        fetchNoticeAndIncrementView();

        // 사용자 인증 상태 체크
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, [id]);

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center py-20 w-full text-zinc-500">
                <Loader2 className="h-10 w-10 animate-spin mb-4" />
                <p className="text-sm font-medium animate-pulse">공지사항을 불러오는 중입니다...</p>
            </div>
        );
    }

    if (error || !notice) {
        return (
            <div className="w-full space-y-6 text-center py-20">
                <p className="text-zinc-500 dark:text-zinc-400">{error || "존재하지 않는 공지사항입니다."}</p>
                <Button variant="outline" onClick={() => router.push("/notice")} className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    목록으로 돌아가기
                </Button>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => router.push("/notice")} className="gap-2 -ml-3 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                    <ArrowLeft className="w-4 h-4" />
                    목록으로
                </Button>
            </div>

            <main className="w-full bg-white dark:bg-zinc-950 p-6 md:p-8 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm space-y-6">
                {/* 헤더 영역 */}
                <div className="space-y-4 border-b border-zinc-100 dark:border-zinc-800 pb-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-black dark:text-white leading-tight">
                        {notice.title}
                    </h1>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400">
                        <div className="flex items-center gap-1.5">
                            <User className="w-4 h-4 text-zinc-400" />
                            <span>{authorName}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-zinc-400" />
                            <span>{notice.created_at ? notice.created_at.split("T")[0] : ""}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Eye className="w-4 h-4 text-zinc-400" />
                            <span>조회수 {notice.read_cnt}</span>
                        </div>
                    </div>
                </div>

                {/* 본문 영역 */}
                <div className="text-zinc-700 dark:text-zinc-300 text-base whitespace-pre-wrap leading-relaxed min-h-[200px]">
                    {notice.content}
                </div>

                {/* 하단 영역 */}
                <div className="flex justify-between items-center pt-6 border-t border-zinc-100 dark:border-zinc-800">
                    <Button variant="outline" onClick={() => router.push("/notice")} className="w-24">
                        목록으로
                    </Button>
                    {user && (
                        <Button onClick={() => router.push(`/notice/${id}/edit`)} className="gap-2 w-24 font-semibold">
                            <Pencil className="w-4 h-4" />
                            수정
                        </Button>
                    )}
                </div>
            </main>
        </div>
    );
}
