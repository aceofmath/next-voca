"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Loader2, User, Plus, CalendarIcon, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useTodos } from "@/hooks/useTodos";

export default function TodosPage() {
    const {
        user,
        todos,
        loading,
        filter,
        setFilter,
        totalCount,
        inProgressCount,
        completedCount,
        isDialogOpen,
        setIsDialogOpen,
        editingTodo,
        title,
        setTitle,
        content,
        setContent,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        handleOpenAddDialog,
        handleOpenEditDialog,
        handleDeleteTodo,
        handleSaveTodo,
        toggleComplete,
        resetForm,
        getAuthorDisplayName,
        getLoggedInUserName,
    } = useTodos();

    return (
        <>
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 w-full gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-black dark:text-white">할일 관리</h1>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-500 w-full">
                    <Loader2 className="h-10 w-10 animate-spin mb-4" />
                    <p className="text-sm font-medium animate-pulse">할 일을 불러오는 중입니다...</p>
                </div>
            ) : (
                <div className="w-full space-y-6">
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden w-full">
                        <Card className="border-0 shadow-none">
                            <CardHeader className="flex flex-col gap-4 pb-4">
                                <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                                    <CardTitle className="text-xl md:text-2xl font-bold">할 일 목록</CardTitle>

                                    <Button
                                        className="flex items-center gap-1.5 text-xs md:text-sm h-9 px-3 shrink-0"
                                        disabled={!user}
                                        onClick={handleOpenAddDialog}
                                        title={!user ? "로그인이 필요합니다" : "할 일 추가"}
                                    >
                                        <Plus className="w-4 h-4" />
                                        {user ? "할 일 추가" : "추가 (로그인 필요)"}
                                    </Button>
                                </div>

                                {/* 필터 탭 */}
                                <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 w-full sm:w-auto self-start">
                                    <Button
                                        variant={filter === "all" ? "default" : "ghost"}
                                        size="sm"
                                        onClick={() => setFilter("all")}
                                        className="flex-1 sm:flex-initial h-8 text-xs font-medium px-3"
                                    >
                                        전체 <span className="ml-1 text-[11px] opacity-70">({totalCount})</span>
                                    </Button>
                                    <Button
                                        variant={filter === "in_progress" ? "default" : "ghost"}
                                        size="sm"
                                        onClick={() => setFilter("in_progress")}
                                        className="flex-1 sm:flex-initial h-8 text-xs font-medium px-3"
                                    >
                                        진행중 <span className="ml-1 text-[11px] opacity-70">({inProgressCount})</span>
                                    </Button>
                                    <Button
                                        variant={filter === "completed" ? "default" : "ghost"}
                                        size="sm"
                                        onClick={() => setFilter("completed")}
                                        className="flex-1 sm:flex-initial h-8 text-xs font-medium px-3"
                                    >
                                        완료 <span className="ml-1 text-[11px] opacity-70">({completedCount})</span>
                                    </Button>
                                </div>

                                {/* 모달 다이얼로그 */}
                                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                                    setIsDialogOpen(open);
                                    if (!open) resetForm();
                                }}>
                                    <DialogContent className="sm:max-w-[500px] w-[92vw] max-h-[90vh] overflow-y-auto rounded-lg">
                                        <DialogHeader>
                                            <DialogTitle>{editingTodo ? "할 일 수정" : "새 할 일 등록"}</DialogTitle>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-2 md:py-4">
                                            <div className="grid gap-2">
                                                <label className="text-sm font-medium">제목</label>
                                                <Input
                                                    placeholder="할 일 제목을 입력하세요"
                                                    value={title}
                                                    onChange={(e) => setTitle(e.target.value)}
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <label className="text-sm font-medium">작성자</label>
                                                <Input
                                                    value={editingTodo ? getAuthorDisplayName(editingTodo.user_id) : (getLoggedInUserName() || "로그인 유저")}
                                                    disabled
                                                    className="bg-muted text-muted-foreground cursor-not-allowed"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <label className="text-sm font-medium">시작일자</label>
                                                    <DatePicker date={startDate} setDate={setStartDate} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <label className="text-sm font-medium">종료일자</label>
                                                    <DatePicker date={endDate} setDate={setEndDate} />
                                                </div>
                                            </div>

                                            <div className="grid gap-2">
                                                <label className="text-sm font-medium">내용</label>
                                                <Textarea
                                                    placeholder="세부 내용을 입력하세요"
                                                    rows={3}
                                                    value={content}
                                                    onChange={(e) => setContent(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter className="flex-row justify-end gap-2">
                                            <Button variant="outline" onClick={() => {
                                                setIsDialogOpen(false);
                                                resetForm();
                                            }}>
                                                취소
                                            </Button>
                                            <Button onClick={handleSaveTodo}>{editingTodo ? "수정" : "등록"}</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>

                            <CardContent className="p-2 sm:p-6 pt-0">
                                {todos.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground border rounded-lg">
                                        {filter === "all"
                                            ? "등록된 할 일이 없습니다."
                                            : filter === "in_progress"
                                                ? "진행 중인 할 일이 없습니다."
                                                : "완료된 할 일이 없습니다."}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {todos.map((todo) => (
                                            <div
                                                key={todo.id}
                                                className={`p-4 rounded-lg border transition-all ${todo.is_completed
                                                    ? "bg-muted/40 border-zinc-200 dark:border-zinc-800"
                                                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm"
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between gap-3 mb-2">
                                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                                        <Checkbox
                                                            checked={todo.is_completed}
                                                            onCheckedChange={() => toggleComplete(todo.id, todo.is_completed)}
                                                            className="mt-1 shrink-0"
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <div className={`font-semibold text-sm break-words ${todo.is_completed ? "line-through text-muted-foreground" : "text-zinc-900 dark:text-zinc-100"}`}>
                                                                {todo.title}
                                                            </div>
                                                            {todo.contents && (
                                                                <p className="text-xs text-muted-foreground mt-1 break-words whitespace-pre-wrap">
                                                                    {todo.contents}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="shrink-0">
                                                        {todo.is_completed ? (
                                                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5">
                                                                완료
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px] px-1.5 py-0.5">
                                                                진행중
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 mt-2 gap-2">
                                                    <div className="flex items-center gap-3 flex-wrap min-w-0">
                                                        <span className="flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
                                                            <User className="w-3 h-3 text-muted-foreground shrink-0" />
                                                            <span className="truncate max-w-[120px]">{getAuthorDisplayName(todo.user_id)}</span>
                                                        </span>
                                                        <span className="text-[11px] text-zinc-400">
                                                            기간: {todo.s_date ? format(new Date(todo.s_date), "yyyy-MM-dd") : "-"} ~ {todo.e_date ? format(new Date(todo.e_date), "yyyy-MM-dd") : "-"}
                                                        </span>
                                                        {todo.created_at && (
                                                            <span className="text-[11px] text-zinc-400 hidden sm:inline">
                                                                등록: {format(new Date(todo.created_at), "yyyy-MM-dd")}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400"
                                                            onClick={() => handleOpenEditDialog(todo)}
                                                            title="할 일 수정"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                            onClick={() => handleDeleteTodo(todo.id)}
                                                            title="할 일 삭제"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </>
    );
}

// DatePicker 서브 컴포넌트
function DatePicker({
    date,
    setDate,
}: {
    date: Date | undefined;
    setDate: (date: Date | undefined) => void;
}) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={`w-full justify-start text-left font-normal ${!date && "text-muted-foreground"}`}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "yyyy-MM-dd") : <span>날짜 선택</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    locale={ko}
                />
            </PopoverContent>
        </Popover>
    );
}