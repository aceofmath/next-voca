"use client";

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Notice {
    id: number;
    title: string;
    content: string;
    created_at: string;
    read_cnt: number;
    user_id?: string | null;
}

export default function NoticePage() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [profileMap, setProfileMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const pageSize = 10;

    // Search states
    const [searchInput, setSearchInput] = useState("");
    const [searchType, setSearchType] = useState("title_content");
    const [activeSearchQuery, setActiveSearchQuery] = useState("");
    const [activeSearchType, setActiveSearchType] = useState("title_content");

    const fetchNotices = async () => {
        setLoading(true);

        // Fetch profile data to map user_id -> profile.name
        const { data: profileData } = await supabase.from("profile").select("user_id, name");
        const map: Record<string, string> = {};
        if (profileData) {
            profileData.forEach((p) => {
                if (p.user_id && p.name) {
                    map[p.user_id] = p.name;
                }
            });
        }
        setProfileMap(map);

        let queryBuilder = supabase
            .from("notice")
            .select("*", { count: "exact" });

        // Apply search filters
        if (activeSearchQuery.trim()) {
            const encodedQuery = `%${activeSearchQuery}%`;
            if (activeSearchType === "title") {
                queryBuilder = queryBuilder.ilike("title", encodedQuery);
            } else if (activeSearchType === "content") {
                queryBuilder = queryBuilder.ilike("content", encodedQuery);
            } else {
                queryBuilder = queryBuilder.or(`title.ilike.${encodedQuery},content.ilike.${encodedQuery}`);
            }
        }

        // Apply pagination
        const from = (currentPage - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, count, error } = await queryBuilder
            .order("created_at", { ascending: false })
            .range(from, to);

        if (error) {
            console.error("데이터를 불러오는 중 에러 발생:", error.message);
        } else {
            setNotices(data || []);
            const total = count || 0;
            setTotalCount(total);
            setTotalPages(Math.ceil(total / pageSize));
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchNotices();
    }, [currentPage, activeSearchQuery, activeSearchType]);

    const handleSearchSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setActiveSearchQuery(searchInput);
        setActiveSearchType(searchType);
        setCurrentPage(1); // Reset to first page on new search
    };

    const getAuthorDisplayName = (notice: Notice) => {
        if (!notice.user_id) return "-";
        return profileMap[notice.user_id] || "-";
    };

    // Helper to calculate a sliding window of page numbers
    const getPageNumbers = () => {
        const windowSize = 5;
        const pages = [];
        let start = Math.max(1, currentPage - Math.floor(windowSize / 2));
        let end = Math.min(totalPages, start + windowSize - 1);
        
        if (end - start + 1 < windowSize) {
            start = Math.max(1, end - windowSize + 1);
        }
        
        for (let i = start; i <= end; i++) {
            if (i >= 1 && i <= totalPages) {
                pages.push(i);
            }
        }
        return pages;
    };

    return (
        <>
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 w-full gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-black dark:text-white">공지사항</h1>
                
                {/* Search Bar */}
                <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-auto md:max-w-md">
                    <select 
                        value={searchType}
                        onChange={(e) => setSearchType(e.target.value)}
                        className="flex h-10 w-28 rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm text-black dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300 focus-visible:ring-offset-2"
                    >
                        <option value="title_content" className="bg-white dark:bg-zinc-950 text-black dark:text-white">제목+내용</option>
                        <option value="title" className="bg-white dark:bg-zinc-950 text-black dark:text-white">제목</option>
                        <option value="content" className="bg-white dark:bg-zinc-950 text-black dark:text-white">내용</option>
                    </select>
                    <div className="relative flex-1 md:w-60">
                        <Input 
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="검색어를 입력하세요..."
                            className="bg-transparent pr-8"
                        />
                        {searchInput && (
                            <button 
                                type="button" 
                                onClick={() => setSearchInput("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    <Button type="submit" variant="secondary" className="gap-1.5 font-semibold">
                        <Search className="w-4 h-4" />
                        검색
                    </Button>
                </form>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-500 w-full">
                    <Loader2 className="h-10 w-10 animate-spin mb-4" />
                    <p className="text-sm font-medium animate-pulse">공지사항을 불러오는 중입니다...</p>
                </div>
            ) : notices.length === 0 ? (
                <div className="text-center py-20 w-full space-y-4">
                    <p className="text-zinc-500 dark:text-zinc-400">등록된 공지사항이 없거나 검색 결과가 없습니다.</p>
                    {activeSearchQuery && (
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                setSearchInput("");
                                setActiveSearchQuery("");
                                setCurrentPage(1);
                            }}
                        >
                            전체 목록 보기
                        </Button>
                    )}
                </div>
            ) : (
                <div className="w-full space-y-6">
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden w-full">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="text-center w-16">ID</TableHead>
                                    <TableHead className="w-1/2">제목</TableHead>
                                    <TableHead className="text-center w-24">조회수</TableHead>
                                    <TableHead className="text-center w-28">작성자</TableHead>
                                    <TableHead className="text-center w-32">등록일</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {notices.map((notice, index) => {
                                    const sequenceNumber = totalCount - (currentPage - 1) * pageSize - index;
                                    return (
                                        <TableRow 
                                            key={notice.id} 
                                            onClick={() => router.push(`/notice/${notice.id}`)}
                                            className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                                        >
                                            <TableCell className="text-center font-medium text-zinc-500 dark:text-zinc-400">{sequenceNumber}</TableCell>
                                            <TableCell className="font-medium text-black dark:text-white">{notice.title}</TableCell>
                                            <TableCell className="text-center text-zinc-500 dark:text-zinc-400">{notice.read_cnt}</TableCell>
                                            <TableCell className="text-center text-zinc-500 dark:text-zinc-400 font-medium">{getAuthorDisplayName(notice)}</TableCell>
                                            <TableCell className="text-center text-zinc-500 dark:text-zinc-400">
                                                {notice.created_at ? notice.created_at.split("T")[0] : ""}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-1.5 mt-6">
                            <Button 
                                type="button"
                                variant="outline" 
                                size="icon" 
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                                disabled={currentPage === 1}
                                className="h-9 w-9"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            
                            {getPageNumbers().map((page) => (
                                <Button
                                    key={page}
                                    type="button"
                                    variant={currentPage === page ? "default" : "outline"}
                                    onClick={() => setCurrentPage(page)}
                                    className="h-9 w-9 font-semibold"
                                >
                                    {page}
                                </Button>
                            ))}

                            <Button 
                                type="button"
                                variant="outline" 
                                size="icon" 
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                                disabled={currentPage === totalPages}
                                className="h-9 w-9"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
