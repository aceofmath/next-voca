"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import noticeData from "../data.json";

interface Notice {
    id: number;
    title: string;
    type: string;
    date: string;
}

export default function NoticePage() {
    // import한 데이터를 초기 상태값으로 사용합니다.
    const [notices] = useState<Notice[]>(noticeData);

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
                                <TableHead className="w-[50px]">ID</TableHead>
                                <TableHead>제목</TableHead>
                                <TableHead className="text-right">자료1</TableHead>
                                <TableHead className="text-right">등록일</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {notices.map((notice) => (
                                <TableRow key={notice.id}>
                                    <TableCell className="font-medium">{notice.id}</TableCell>
                                    <TableCell>{notice.title}</TableCell>
                                    <TableCell className="text-right">{notice.type}</TableCell>
                                    <TableCell className="text-right">{notice.date}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
