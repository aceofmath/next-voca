"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

export default function EngWordLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <main className="flex-1 flex flex-col md:flex-row py-10 md:py-20 px-4 md:px-8 max-w-6xl mx-auto w-full gap-8 md:gap-12">
            {/* 상단/왼쪽 영역: 메뉴 */}
            <aside className="w-full md:w-1/5 flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                <Button asChild variant={pathname === "/engword" ? "default" : "outline"} size="default" className="flex-1 md:flex-none md:w-full md:h-10 justify-center md:justify-start text-xs md:text-base font-medium whitespace-nowrap px-3">
                    <Link href="/engword">메인 목록</Link>
                </Button>
                <Button asChild variant={pathname === "/engword/word" ? "default" : "outline"} size="default" className="flex-1 md:flex-none md:w-full md:h-10 justify-center md:justify-start text-xs md:text-base font-medium whitespace-nowrap px-3">
                    <Link href="/engword/word">단어 추가</Link>
                </Button>
                <Button asChild variant={pathname === "/engword/day" ? "default" : "outline"} size="default" className="flex-1 md:flex-none md:w-full md:h-10 justify-center md:justify-start text-xs md:text-base font-medium whitespace-nowrap px-3">
                    <Link href="/engword/day">Day 추가</Link>
                </Button>
            </aside>

            {/* 하단/오른쪽 영역: 콘텐츠 */}
            <section className="w-full md:w-4/5 flex flex-col items-start">{children}</section>
        </main>
    );
}
