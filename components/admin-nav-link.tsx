"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export function AdminNavLink() {
    const { user, isAdmin, loading } = useAuth();

    // 관리자가 로그인한 경우에만 링크 활성화
    if (loading || !user || !isAdmin) {
        return null;
    }

    return (
        <Link href="/admin" className="hover:text-black dark:hover:text-white transition-colors">
            관리자
        </Link>
    );
}
