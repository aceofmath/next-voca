"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, LayoutDashboard, CheckSquare, CalendarCheck } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { AuthStatus } from "./auth-status";

export function MobileMenu() {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Toggle menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] bg-white dark:bg-zinc-950">
                <SheetHeader>
                    <SheetTitle className="text-left">메뉴</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-6 mt-8">
                    <nav className="flex flex-col gap-3">
                        <SheetClose asChild>
                            <Link href="/about" className="text-lg font-medium text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors mx-2 py-1">
                                ABOUT
                            </Link>
                        </SheetClose>
                        <SheetClose asChild>
                            <Link href="/engword" className="text-lg font-medium text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors mx-2 py-1">
                                영단어
                            </Link>
                        </SheetClose>
                        <SheetClose asChild>
                            <Link href="/notice" className="text-lg font-medium text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors mx-2 py-1">
                                공지사항
                            </Link>
                        </SheetClose>

                        {/* 마이페이지 그룹 */}
                        <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                            <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mx-2">
                                마이페이지
                            </span>
                            <div className="flex flex-col gap-1 pl-2">
                                <SheetClose asChild>
                                    <Link href="/mypage" className="flex items-center gap-2.5 text-base font-medium text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900">
                                        <LayoutDashboard className="w-4 h-4 text-blue-500" />
                                        <span>대시보드</span>
                                    </Link>
                                </SheetClose>
                                <SheetClose asChild>
                                    <Link href="/mypage/todos" className="flex items-center gap-2.5 text-base font-medium text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900">
                                        <CheckSquare className="w-4 h-4 text-amber-500" />
                                        <span>할일 관리</span>
                                    </Link>
                                </SheetClose>
                                <SheetClose asChild>
                                    <Link href="/mypage/attendance" className="flex items-center gap-2.5 text-base font-medium text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900">
                                        <CalendarCheck className="w-4 h-4 text-emerald-500" />
                                        <span>출석체크</span>
                                    </Link>
                                </SheetClose>
                            </div>
                        </div>
                    </nav>
                    <hr className="border-zinc-200 dark:border-zinc-800" />
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mx-2">테마 설정</span>
                        <SheetClose asChild>
                            <ThemeToggle />
                        </SheetClose>
                    </div>
                    <SheetClose asChild>
                        <AuthStatus isMobile />
                    </SheetClose>
                </div>
            </SheetContent>
        </Sheet>
    );
}
