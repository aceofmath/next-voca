"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function CreateNotice() {
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    const titleRef = useRef<HTMLInputElement>(null);
    const contentRef = useRef<HTMLTextAreaElement>(null);

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

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!user) {
            toast.error("로그인이 필요합니다.");
            return;
        }

        const title = titleRef.current?.value;
        const content = contentRef.current?.value;

        if (!title || !content) {
            toast.error("제목과 내용을 입력해주세요.");
            return;
        }

        setIsLoading(true);

        const { error } = await supabase.from("notice").insert([
            {
                title,
                content,
                read_cnt: 0,
                user_id: user.id,
            },
        ]);

        if (error) {
            console.error("Supabase Insert Error:", error);
            toast.error("저장 중 오류가 발생했습니다.");
        } else {
            toast.success("공지사항이 등록되었습니다.");
            router.push("/notice");
            router.refresh();
        }
        setIsLoading(false);
    }

    return (
        <>
            <h1 className="text-3xl font-bold mb-12 text-black dark:text-white text-left">공지 등록</h1>
            <main className="w-full flex flex-col items-start">
                <div className="w-full space-y-8 bg-white dark:bg-zinc-950 p-8 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                    <form onSubmit={onSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">제목</Label>
                            <Input id="title" ref={titleRef} placeholder="공지사항 제목을 입력하세요" required className="bg-transparent" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="content" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">내용</Label>
                            <Textarea id="content" ref={contentRef} placeholder="공지사항 내용을 입력하세요" required className="min-h-[250px] bg-transparent" />
                        </div>

                        <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={isLoading || !user}>
                            {!user ? "로그인이 필요합니다" : isLoading ? "저장 중..." : "저장하기"}
                        </Button>

                        {!user && <p className="text-sm text-amber-500 text-center mt-2">공지사항을 작성하려면 로그인이 필요합니다.</p>}
                    </form>
                </div>
            </main>
        </>
    );
}
