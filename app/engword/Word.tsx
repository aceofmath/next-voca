"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Volume2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

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
            toast.error("상태 변경 중 오류가 발생했습니다: " + error.message);
        }
    };

    const del = async () => {
        const { error } = await supabase.from("words").delete().eq("id", word.id);

        if (!error) {
            setWord({ ...word, id: 0 }); // 화면에서 즉시 제거를 위해 id를 0으로 설정
            toast.success("단어가 삭제되었습니다.");
        } else {
            toast.error("삭제 중 오류가 발생했습니다: " + error.message);
        }
    };

    const speak = useCallback(() => {
        if (typeof window !== "undefined" && window.speechSynthesis) {
            // 현재 진행 중인 음성이 있다면 중지
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(word.eng);
            utterance.lang = "en-US"; // 영어 발음 설정
            utterance.rate = 0.9; // 속도를 약간 늦춰서 명확하게 들리게 조절
            window.speechSynthesis.speak(utterance);
        }
    }, [word.eng]);

    if (word.id === 0) return null;

    return (
        <div
            className={`p-4 border rounded-xl shadow-sm transition-all ${
                isDone ? "bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-100 dark:border-zinc-800 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50" : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
            }`}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <Checkbox id={`word-${word.id}`} checked={isDone} onCheckedChange={() => toggleDone()} className="w-5 h-5" />
                    <Label htmlFor={`word-${word.id}`} className={`text-lg font-bold cursor-pointer select-none ${isDone ? "text-zinc-400 line-through" : "text-black dark:text-white"}`}>
                        {word.eng}
                    </Label>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100" onClick={speak} title="발음 듣기">
                        <Volume2 className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={toggleShow} className="h-8 px-3 text-xs md:text-sm">
                        {isShow ? "뜻 숨기기" : "뜻 보기"}
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="h-8 px-3 text-xs md:text-sm">
                                삭제
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>정말로 삭제하시겠습니까?</AlertDialogTitle>
                                <AlertDialogDescription>이 작업은 되돌릴 수 없습니다. 해당 단어가 목록에서 영구적으로 삭제됩니다.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>취소</AlertDialogCancel>
                                <AlertDialogAction onClick={del}>삭제</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
            <div className="pl-8">{isShow ? <p className={`text-base font-medium ${isDone ? "text-zinc-400" : "text-zinc-700 dark:text-zinc-300"}`}>{word.kor}</p> : <p className="text-zinc-300 dark:text-zinc-700 text-sm italic select-none">뜻이 숨겨져 있습니다.</p>}</div>
            <div className="pl-8 mt-4">
                <p className="text-pink-800 dark:text-pink-100">✅ 예문</p>
            </div>
            <div className="pl-8 mt-4">
                <p className="text-zinc-700 dark:text-zinc-300">{word.example}</p>
            </div>
        </div>
    );
}
