"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNotices } from "@/hooks/useNotices";

export default function NoticePage() {
    const router = useRouter();
    const {
        notices,
        loading,
        currentPage,
        setCurrentPage,
        totalCount,
        totalPages,
        pageSize,
        searchInput,
        setSearchInput,
        searchType,
        setSearchType,
        activeSearchQuery,
        handleSearchSubmit,
        clearSearch,
        getPageNumbers,
        getAuthorDisplayName,
    } = useNotices();

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
                            onClick={clearSearch}
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
                                            <TableCell className="text-center text-zinc-500 dark:text-zinc-400 font-medium">{getAuthorDisplayName(notice.user_id)}</TableCell>
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
                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
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
                                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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
