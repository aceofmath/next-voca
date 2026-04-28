"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Word from "../Word"; // Word 컴포넌트 경로 수정

export default function Day() {
    const params = useParams();
    const day = params.day;
    const [words, setWords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [allShown, setAllShown] = useState(false);

    const toggleAllMeanings = () => {
        const nextState = !allShown;
        setAllShown(nextState);
        const event = new CustomEvent("toggle-all-meanings", { detail: nextState });
        window.dispatchEvent(event);
    };

    useEffect(() => {
        const fetchWords = async () => {
            if (!day || Array.isArray(day)) return;

            // day를 숫자로 변환하여 쿼리 (DB 타입에 맞춤)
            const { data, error } = await supabase.from("words").select("*").eq("day", parseInt(day)).order("id", { ascending: true });

            if (!error) {
                setWords(data || []);
            }
            setLoading(false);
        };
        fetchWords();
    }, [day]);

    if (loading) {
        return (
            <main className="flex-1 flex flex-col items-center justify-center py-20 w-full text-zinc-500">
                <Loader2 className="h-10 w-10 animate-spin mb-4" />
                <p className="text-sm font-medium animate-pulse">단어 목록을 불러오는 중입니다...</p>
            </main>
        );
    }

    return (
        <div className="w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-6">
                <h2 className="text-3xl font-bold text-black dark:text-white">✏️ Day {day}</h2>
                <Button variant="outline" onClick={toggleAllMeanings} className={`w-full md:w-auto shadow-sm font-semibold ${allShown ? "text-zinc-500" : "text-blue-600 dark:text-blue-400"}`}>
                    {allShown ? "전체 뜻 숨기기" : "전체 뜻 보기"}
                </Button>
            </div>

            <div className="flex flex-col gap-4">
                {words.map((word) => (
                    <Word word={word} key={word.id} />
                ))}
            </div>

            {words.length === 0 && <p className="text-center py-12 text-zinc-500 italic">등록된 단어가 없습니다.</p>}
        </div>
    );
}
