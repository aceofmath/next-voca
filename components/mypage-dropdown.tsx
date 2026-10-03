"use client";

import Link from "next/link";
import { ChevronDown, LayoutDashboard, CheckSquare, CalendarCheck } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function MyPageDropdown() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="p-0 h-auto font-medium text-xs md:text-sm text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-transparent focus-visible:ring-0 gap-1 cursor-pointer"
                >
                    <span>마이페이지</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44 bg-white dark:bg-zinc-950">
                <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/mypage" className="flex items-center gap-2 w-full py-2">
                        <LayoutDashboard className="w-4 h-4 text-blue-500" />
                        <span>대시보드</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/mypage/todos" className="flex items-center gap-2 w-full py-2">
                        <CheckSquare className="w-4 h-4 text-amber-500" />
                        <span>할일 관리</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/mypage/attendance" className="flex items-center gap-2 w-full py-2">
                        <CalendarCheck className="w-4 h-4 text-emerald-500" />
                        <span>출석체크</span>
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
