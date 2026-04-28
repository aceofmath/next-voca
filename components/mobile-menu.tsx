"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
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
                    <nav className="flex flex-col gap-4">
                        <SheetClose asChild>
                            <Link href="/about" className="text-lg font-medium text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors mx-2">
                                ABOUT
                            </Link>
                        </SheetClose>
                        <SheetClose asChild>
                            <Link href="/engword" className="text-lg font-medium text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors mx-2">
                                영단어
                            </Link>
                        </SheetClose>
                        <SheetClose asChild>
                            <Link href="/notice" className="text-lg font-medium text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors mx-2">
                                공지사항
                            </Link>
                        </SheetClose>
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
