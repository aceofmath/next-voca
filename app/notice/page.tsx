"use client";

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import noticeData from "../data.json";
import { supabase } from "@/lib/supabaseClient";

interface Notice {
    id: number;
    title: string;
    content: string;
    created_at: string;
    read_cnt: number;
}

export default function NoticePage() {
    // import한 데이터를 초기 상태값으로 사용합니다.
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDays = async () => {
            // supabase에서 days 테이블의 데이터를 가져와 day 컬럼 기준 오름차순 정렬
            const { data, error } = await supabase.from("notice").select("*").order("created_at", { ascending: true });

            if (error) {
                console.error("데이터를 불러오는 중 에러 발생:", error.message);
            } else {
                console.log("데이터 불러오기 성공:", data);
                setNotices(data || []);
            }
            setLoading(false);
        };
        fetchDays();
    }, []);

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-black dark:text-white text-left">공지사항</h1>
            {notices.length === 0 ? (
                <p className="text-center text-zinc-500 dark:text-zinc-400">등록된 공지사항이 없습니다.</p>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-center">ID</TableHead>
                                <TableHead className="w-2/3">제목</TableHead>
                                <TableHead className="text-center">조회수</TableHead>
                                <TableHead className="text-center">등록일</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {notices.map((notice) => (
                                <TableRow key={notice.id}>
                                    <TableCell className="text-center font-medium">{notice.id}</TableCell>
                                    <TableCell>{notice.title}</TableCell>
                                    <TableCell className="text-center">{notice.read_cnt}</TableCell>
                                    <TableCell className="text-center">{notice.created_at.split("T")[0]}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
