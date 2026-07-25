"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function EditNotice() {
    const params = useParams();
    const router = useRouter();
    const id = params.id;

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchNotice = async () => {
            if (!id || Array.isArray(id)) return;

            setLoading(true);
            const { data, error } = await supabase
                .from("notice")
                .select("*")
                .eq("id", parseInt(id))
                .single();

            if (error || !data) {
                console.error("공지사항을 불러오는 중 에러 발생:", error?.message);
                setError("공지사항을 불러오지 못했습니다.");
            } else {
                setTitle(data.title);
                setContent(data.content);
            }
            setLoading(false);
        };

        fetchNotice();

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
    }, [id]);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!user) {
            toast.error("로그인이 필요합니다.");
            return;
        }

        if (!title.trim() || !content.trim()) {
            toast.error("제목과 내용을 모두 입력해 주세요.");
            return;
        }

        setIsSaving(true);
        const { error } = await supabase
            .from("notice")
            .update({
                title,
                content,
            })
            .eq("id", parseInt(id as string));

        if (error) {
            console.error("Supabase Update Error:", error);
            toast.error("수정 중 오류가 발생했습니다.");
        } else {
            toast.success("공지사항이 수정되었습니다.");
            router.push(`/notice/${id}`);
            router.refresh();
        }
        setIsSaving(false);
    }

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center py-20 w-full text-zinc-500">
                <Loader2 className="h-10 w-10 animate-spin mb-4" />
                <p className="text-sm font-medium animate-pulse">데이터를 불러오는 중입니다...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full space-y-6 text-center py-20">
                <p className="text-zinc-500 dark:text-zinc-400">{error}</p>
                <Button variant="outline" onClick={() => router.push(`/notice/${id}`)} className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    상세 페이지로 돌아가기
                </Button>
            </div>
        );
    }

    return (
        <>
            <h1 className="text-3xl font-bold mb-12 text-black dark:text-white text-left">공지 수정</h1>
            <main className="w-full flex flex-col items-start">
                <div className="w-full space-y-8 bg-white dark:bg-zinc-950 p-8 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                    <form onSubmit={onSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">제목</Label>
                            <Input 
                                id="title" 
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="공지사항 제목을 입력하세요" 
                                required 
                                className="bg-transparent" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="content" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">내용</Label>
                            <Textarea 
                                id="content" 
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="공지사항 내용을 입력하세요" 
                                required 
                                className="min-h-[250px] bg-transparent" 
                            />
                        </div>

                        <div className="flex gap-4">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => router.push(`/notice/${id}`)} 
                                className="w-1/2 h-12 text-base font-semibold"
                            >
                                취소
                            </Button>
                            <Button 
                                type="submit" 
                                className="w-1/2 h-12 text-base font-semibold" 
                                disabled={isSaving || !user}
                            >
                                {!user ? "로그인이 필요합니다" : isSaving ? "저장 중..." : "수정 완료"}
                            </Button>
                        </div>

                        {!user && <p className="text-sm text-amber-500 text-center mt-2">공지사항을 수정하려면 로그인이 필요합니다.</p>}
                    </form>
                </div>
            </main>
        </>
    );
}
