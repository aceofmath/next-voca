"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "./useAuth";

export interface Notice {
    id: number;
    title: string;
    content: string;
    created_at: string;
    read_cnt: number;
    user_id?: string | null;
}

export function useNotices() {
    const { getAuthorDisplayName } = useAuth();
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);

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

    const fetchNotices = useCallback(async () => {
        setLoading(true);

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
    }, [currentPage, activeSearchQuery, activeSearchType, pageSize]);

    useEffect(() => {
        fetchNotices();
    }, [fetchNotices]);

    const handleSearchSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setActiveSearchQuery(searchInput);
        setActiveSearchType(searchType);
        setCurrentPage(1);
    };

    const clearSearch = () => {
        setSearchInput("");
        setActiveSearchQuery("");
        setCurrentPage(1);
    };

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

    return {
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
    };
}
