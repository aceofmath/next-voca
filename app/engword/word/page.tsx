"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CreateWord() {
    const [days, setDays] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const engRef = useRef<HTMLInputElement>(null);
    const korRef = useRef<HTMLInputElement>(null);
    const dayRef = useRef<HTMLSelectElement>(null);

    useEffect(() => {
        const fetchDays = async () => {
            // Day 선택 목록을 위해 days 테이블의 데이터를 가져옵니다.
            const { data, error } = await supabase.from("days").select("*").order("day", { ascending: true });

            if (!error) {
                setDays(data || []);
            }
        };
        fetchDays();
    }, []);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!isLoading && engRef.current && korRef.current && dayRef.current) {
            setIsLoading(true);

            const { error } = await supabase.from("words").insert([
                {
                    day: parseInt(dayRef.current.value),
                    eng: engRef.current.value,
                    kor: korRef.current.value,
                    isDone: false,
                },
            ]);

            if (error) {
                console.error("Supabase Insert Error:", error);
                alert("저장 중 오류가 발생했습니다.");
            } else {
                alert("생성이 완료 되었습니다.");
                // 생성 후 해당 Day의 단어 목록 페이지로 이동합니다.
                router.push(`/engword/${dayRef.current.value}`);
                router.refresh();
            }
            setIsLoading(false);
        }
    }

    return (
        <>
            <h1 className="text-3xl font-bold mb-12 text-black dark:text-white text-left">단어 추가</h1>
            <h2 className="text-left mb-6">
                <p className="text-zinc-500 mt-2 text-sm">기존에 등록된 Day를 선택하여 단어를 추가하세요.</p>
            </h2>
            <main className="w-full flex flex-col items-start">
                <div className="w-full space-y-8 bg-white dark:bg-zinc-950 p-8 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                    <form onSubmit={onSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="eng">English</Label>
                            <Input id="eng" ref={engRef} placeholder="e.g. computer" required className="bg-transparent" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="kor">Korean</Label>
                            <Input id="kor" ref={korRef} placeholder="예: 컴퓨터" required className="bg-transparent" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="day">Day Selection</Label>
                            <select
                                id="day"
                                ref={dayRef}
                                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                            >
                                {days.map((day) => (
                                    <option key={day.id} value={day.day} className="text-black">
                                        Day {day.day}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={isLoading || days.length === 0}>
                            {isLoading ? "저장 중..." : "단어 저장하기"}
                        </Button>

                        {days.length === 0 && <p className="text-sm text-red-500 text-center mt-2">등록된 Day가 없습니다. 먼저 Day를 추가해 주세요.</p>}
                    </form>
                </div>
            </main>
        </>
    );
}
