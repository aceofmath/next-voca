"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, CheckSquare, CalendarCheck } from "lucide-react";

export default function MyPageLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const tabs = [
        {
            name: "대시보드",
            href: "/mypage",
            icon: LayoutDashboard,
            exact: true,
        },
        {
            name: "할일 관리",
            href: "/mypage/todos",
            icon: CheckSquare,
            exact: false,
        },
        {
            name: "출석체크",
            href: "/mypage/attendance",
            icon: CalendarCheck,
            exact: false,
        },
    ];

    return (
        <main className="flex-1 py-6 md:py-10 px-4 md:px-8 max-w-6xl mx-auto w-full">
            {/* 마이페이지 헤더 */}
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    마이페이지
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    개인 할 일 목록 및 출석체크 현황을 관리하세요.
                </p>
            </div>

            {/* 마이페이지 서브 탭 네비게이션 */}
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 mb-6 overflow-x-auto scrollbar-hide">
                {tabs.map((tab) => {
                    const isActive = tab.exact
                        ? pathname === tab.href
                        : pathname.startsWith(tab.href);
                    const Icon = tab.icon;

                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px",
                                isActive
                                    ? "border-black dark:border-white text-black dark:text-white font-semibold"
                                    : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{tab.name}</span>
                        </Link>
                    );
                })}
            </div>

            {/* 페이지 본문 콘텐츠 */}
            <section className="w-full">{children}</section>
        </main>
    );
}
