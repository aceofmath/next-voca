"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import {
    SidebarProvider,
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarFooter,
    SidebarInset,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbSeparator,
    BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import {
    LayoutDashboard,
    Users,
    CalendarCheck,
    Settings,
    LogOut,
    User,
    ShieldAlert,
    Loader2,
    ChevronsUpDown,
    Home,
    GraduationCap,
    HelpCircle,
    Bell,
    Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading, logout, loginWithGoogle } = useAuth();
    const pathname = usePathname();

    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [checkingAdmin, setCheckingAdmin] = useState<boolean>(true);

    // Check if user is logged in & has grade === 'A'
    useEffect(() => {
        async function checkAdminStatus() {
            if (authLoading) return;

            if (!user) {
                setIsAdmin(false);
                setCheckingAdmin(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from("profile")
                    .select("grade")
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (!error && data && data.grade === "A") {
                    setIsAdmin(true);
                } else {
                    setIsAdmin(false);
                }
            } catch (err) {
                console.error("Failed to check admin status:", err);
                setIsAdmin(false);
            } finally {
                setCheckingAdmin(false);
            }
        }

        checkAdminStatus();
    }, [user, authLoading]);

    // Loading State
    if (authLoading || checkingAdmin) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
                <p className="text-sm text-zinc-500 font-medium">관리자 권한 확인 중...</p>
            </div>
        );
    }

    // Access Denied State (Not logged in or grade !== 'A')
    if (!user || !isAdmin) {
        return (
            <div className="flex-1 container mx-auto max-w-xl px-4 py-20 flex items-center justify-center">
                <Card className="w-full text-center border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/10 shadow-lg">
                    <CardHeader className="items-center pb-2">
                        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 mb-4">
                            <ShieldAlert className="w-8 h-8" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400">
                            접근 권한 없음
                        </CardTitle>
                        <CardDescription className="text-zinc-600 dark:text-zinc-400 mt-2 text-base">
                            {!user
                                ? "관리자 페이지에 접근하려면 로그인이 필요합니다."
                                : "관리자 권한(grade: 'A')이 부여된 계정만 접근할 수 있습니다."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        {!user ? (
                            <Button size="lg" onClick={loginWithGoogle} className="font-semibold">
                                구글 로그인하기
                            </Button>
                        ) : (
                            <p className="text-xs text-zinc-500">
                                관리자 권한 부여가 필요하다면 시스템 관리자에게 문의하세요.
                            </p>
                        )}
                        <div>
                            <Button variant="outline" asChild size="sm">
                                <Link href="/">메인 홈으로 돌아가기</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Nav items definition
    const navItems = [
        {
            title: "대시보드 메인",
            url: "/admin",
            icon: LayoutDashboard,
        },
        {
            title: "회원 등급 관리",
            url: "/admin/member",
            icon: Users,
        },
        {
            title: "학생 출석 관리",
            url: "/admin/attendance",
            icon: CalendarCheck,
        },
    ];

    const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "관리자";
    const userEmail = user?.email || "";
    const avatarUrl = user?.user_metadata?.avatar_url || "";

    return (
        <SidebarProvider>
            <div className="flex min-h-[calc(100vh-4rem)] w-full">
                {/* 1. Dashboard Sidebar */}
                <Sidebar collapsible="icon" className="border-r border-zinc-200 dark:border-zinc-800">
                    <SidebarHeader className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton size="lg" asChild className="hover:bg-transparent">
                                    <Link href="/admin" className="flex items-center gap-3">
                                        <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
                                            <GraduationCap className="size-5" />
                                        </div>
                                        <div className="flex flex-col gap-0.5 leading-none">
                                            <span className="font-bold text-sm tracking-tight">JOKIM 관리자</span>
                                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Admin Console v1.0</span>
                                        </div>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarHeader>

                    <SidebarContent className="px-2 py-4">
                        <SidebarGroup>
                            <SidebarGroupLabel className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-2 mb-2">
                                Menu
                            </SidebarGroupLabel>
                            <SidebarMenu>
                                {navItems.map((item) => {
                                    const isActive = pathname === item.url || (item.url === "/admin" && pathname === "/admin");
                                    return (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                tooltip={item.title}
                                                className={isActive ? "bg-zinc-100 dark:bg-zinc-800 font-semibold text-blue-600 dark:text-blue-400" : ""}
                                            >
                                                <Link href={item.url} className="flex items-center gap-3">
                                                    <item.icon className="size-4" />
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        </SidebarGroup>
                    </SidebarContent>

                    {/* Footer / User Profile */}
                    <SidebarFooter className="border-t border-zinc-200 dark:border-zinc-800 p-2">
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <SidebarMenuButton
                                            size="lg"
                                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                        >
                                            <Avatar className="h-8 w-8 rounded-lg">
                                                <AvatarImage src={avatarUrl} alt={userName} />
                                                <AvatarFallback className="rounded-lg bg-zinc-200 dark:bg-zinc-700">
                                                    <User className="h-4 w-4" />
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="grid flex-1 text-left text-sm leading-tight">
                                                <span className="truncate font-semibold">{userName}</span>
                                                <span className="truncate text-xs text-zinc-500">{userEmail}</span>
                                            </div>
                                            <ChevronsUpDown className="ml-auto size-4" />
                                        </SidebarMenuButton>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                                        side="bottom"
                                        align="end"
                                        sideOffset={4}
                                    >
                                        <DropdownMenuLabel className="p-0 font-normal">
                                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                                <Avatar className="h-8 w-8 rounded-lg">
                                                    <AvatarImage src={avatarUrl} alt={userName} />
                                                    <AvatarFallback className="rounded-lg bg-zinc-200 dark:bg-zinc-700">
                                                        <User className="h-4 w-4" />
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="grid flex-1 text-left text-sm leading-tight">
                                                    <span className="truncate font-semibold">{userName}</span>
                                                    <span className="truncate text-xs text-zinc-500">{userEmail}</span>
                                                </div>
                                            </div>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild>
                                            <Link href="/" className="cursor-pointer">
                                                <Home className="mr-2 h-4 w-4" />
                                                메인 사이트로 이동
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer">
                                            <LogOut className="mr-2 h-4 w-4" />
                                            로그아웃
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarFooter>
                </Sidebar>

                {/* 2. Main Content Inset */}
                <SidebarInset className="flex-1 bg-zinc-50/50 dark:bg-zinc-950/50 min-w-0">
                    {/* Top Inset Header */}
                    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 px-4 bg-white dark:bg-zinc-900">
                        <div className="flex items-center gap-2">
                            <SidebarTrigger className="-ml-1" />
                            <Separator orientation="vertical" className="mr-2 h-4" />
                            <Breadcrumb>
                                <BreadcrumbList>
                                    <BreadcrumbItem className="hidden md:block">
                                        <BreadcrumbLink href="/admin">관리자 센터</BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator className="hidden md:block" />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage className="font-semibold">대시보드</BreadcrumbPage>
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>
                        </div>
                        <div className="flex items-center gap-2">
                            <ThemeToggle />
                        </div>
                    </header>

                    {/* Page Content */}
                    <div className="p-6 md:p-8">
                        {children}
                    </div>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}
