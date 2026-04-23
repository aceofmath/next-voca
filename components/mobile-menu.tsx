"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

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
                        <Link href="/about" className="text-lg font-medium text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors">
                            ABOUT
                        </Link>
                        <Link href="/engword" className="text-lg font-medium text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors">
                            영단어
                        </Link>
                        <Link href="#" className="text-lg font-medium text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors">
                            메뉴3
                        </Link>
                    </nav>
                    <hr className="border-zinc-200 dark:border-zinc-800" />
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">테마 설정</span>
                        <ThemeToggle />
                    </div>
                    <Button variant="default" className="w-full h-12 text-base font-semibold">
                        로그인
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
