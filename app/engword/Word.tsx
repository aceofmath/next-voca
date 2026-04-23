"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

export default function Word({ word: w }: { word: any }) {
    const [word, setWord] = useState(w);
    const [isShow, setIsShow] = useState(false);
    const [isDone, setIsDone] = useState(word.isDone);

    const toggleShow = () => setIsShow(!isShow);

    const toggleDone = async () => {
        const nextDone = !isDone;
        // Supabase DB 업데이트
        const { error } = await supabase.from("words").update({ isDone: nextDone }).eq("id", word.id);

        if (!error) {
            setIsDone(nextDone);
        } else {
            alert("상태 변경 중 오류가 발생했습니다: " + error.message);
        }
    };

    const del = async () => {
        if (window.confirm("삭제 하시겠습니까?")) {
            const { error } = await supabase.from("words").delete().eq("id", word.id);

            if (!error) {
                setWord({ ...word, id: 0 }); // 화면에서 즉시 제거를 위해 id를 0으로 설정
            } else {
                alert("삭제 중 오류가 발생했습니다: " + error.message);
            }
        }
    };

    if (word.id === 0) return null;

    return (
        <tr className={isDone ? "text-zinc-400 bg-zinc-50/50 dark:bg-zinc-900/30" : "text-black dark:text-white"}>
            <td className="px-3 py-3 md:px-6 md:py-4">
                <input type="checkbox" checked={isDone} onChange={toggleDone} className="w-4 h-4 rounded border-zinc-300" />
            </td>
            <td className="px-3 py-3 md:px-6 md:py-4 font-medium">{word.eng}</td>
            <td className="px-3 py-3 md:px-6 md:py-4">{isShow ? word.kor : <span className="text-zinc-300 dark:text-zinc-700 select-none">******</span>}</td>
            <td className="px-3 py-3 md:px-6 md:py-4 text-right space-x-2 whitespace-nowrap">
                <Button variant="outline" size="sm" onClick={toggleShow}>
                    {isShow ? "뜻 숨기기" : "뜻 보기"}
                </Button>
                <Button variant="destructive" size="sm" onClick={del}>
                    삭제
                </Button>
            </td>
        </tr>
    );
}
