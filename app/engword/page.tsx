"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

export default function DayList() {
    const [days, setDays] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDays = async () => {
            // supabase에서 days 테이블의 데이터를 가져와 day 컬럼 기준 오름차순 정렬
            const { data, error } = await supabase.from("days").select("*").order("day", { ascending: true });

            if (error) {
                console.error("데이터를 불러오는 중 에러 발생:", error.message);
            } else {
                setDays(data || []);
            }
            setLoading(false);
        };
        fetchDays();
    }, []);

    if (loading) {
        return (
            <main className="flex-1 flex flex-col items-center justify-center py-20 w-full text-zinc-500">
                <Loader2 className="h-10 w-10 animate-spin mb-4" />
                <p className="text-sm font-medium animate-pulse">데이터를 불러오는 중입니다...</p>
            </main>
        );
    }

    return (
        <>
            <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-12 text-black dark:text-white text-left">학습할 Day를 선택하세요</h1>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap gap-3 md:gap-4 justify-start w-full">
                {days.map((day) => (
                    <Button key={day.id} asChild variant="outline" size="lg" className="h-auto py-4 px-4 md:py-8 md:px-12 text-lg md:text-2xl shadow-sm hover:scale-105 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all min-w-0 md:min-w-[120px] md:flex-none">
                        <Link href={`/engword/${day.day}`}>Day {day.day}</Link>
                    </Button>
                ))}
            </div>
        </>
    );
}
