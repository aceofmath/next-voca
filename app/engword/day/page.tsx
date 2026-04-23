"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";

export default function CreateDay() {
    const [days, setDays] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const fetchDays = async () => {
            // 현재 등록된 Day 목록을 가져옵니다.
            const { data, error } = await supabase.from("days").select("*");
            if (!error) {
                setDays(data || []);
            }
        };
        fetchDays();
    }, []);

    async function addDay() {
        if (isLoading) return;
        setIsLoading(true);

        // 새로운 Day 번호는 현재 개수 + 1로 설정합니다.
        const { error } = await supabase.from("days").insert([{ day: days.length + 1 }]);

        if (error) {
            toast.error("생성 중 오류가 발생했습니다.");
            console.error(error);
            setIsLoading(false);
        } else {
            toast.success("생성이 완료 되었습니다.");
            // 생성 후 목록 페이지로 이동하며 데이터를 갱신합니다.
            router.push("/engword");
            router.refresh();
        }
    }

    return (
        <>
            <h1 className="text-3xl font-bold mb-12 text-black dark:text-white text-left">Day 추가</h1>
            <div className="w-full max-w-md space-y-8 bg-white dark:bg-zinc-950 p-8 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm text-center">
                <div className="py-4">
                    <h4 className="text-xl text-zinc-600 dark:text-zinc-400">
                        현재 등록된 일수 : <span className="font-bold text-black dark:text-white">{days.length}일</span>
                    </h4>
                </div>
                <Button className="w-full h-14 text-lg font-bold shadow-sm" onClick={addDay} disabled={isLoading}>
                    {isLoading ? "생성 중..." : "새로운 Day 추가하기"}
                </Button>
            </div>
        </>
    );
}
