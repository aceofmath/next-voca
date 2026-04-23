"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import Word from "../Word"; // Word 컴포넌트 경로 수정

export default function Day() {
    const params = useParams();
    const day = params.day;
    const [words, setWords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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
        return <main className="flex-1 flex items-center justify-center text-zinc-500">Loading...</main>;
    }

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-black dark:text-white">Day {day}</h2>
                <Button asChild variant="ghost" size="sm">
                    <Link href="/engword">← 목록으로 돌아가기</Link>
                </Button>
            </div>

            <div className="w-full overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                <table className="w-full text-left border-collapse min-w-[600px] md:min-w-full">
                    <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                        <tr>
                            <th className="px-3 py-3 md:px-6 md:py-4 text-sm font-semibold text-zinc-500 w-16">상태</th>
                            <th className="px-3 py-3 md:px-6 md:py-4 text-sm font-semibold text-zinc-500">단어 (English)</th>
                            <th className="px-3 py-3 md:px-6 md:py-4 text-sm font-semibold text-zinc-500">뜻 (Korean)</th>
                            <th className="px-3 py-3 md:px-6 md:py-4 text-sm font-semibold text-zinc-500 text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                        {words.map((word) => (
                            <Word word={word} key={word.id} />
                        ))}
                    </tbody>
                </table>
            </div>
            {words.length === 0 && <p className="text-center py-12 text-zinc-500 italic">등록된 단어가 없습니다.</p>}
        </div>
    );
}
