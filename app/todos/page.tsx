"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabaseClient";
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

interface Todo {
    id: number;
    s_date: string;
    e_date: string;
    title: string;
    contents: string;
    created_at: string;
    user_id?: string | null;
    is_completed: boolean;
}

type FilterType = "all" | "in_progress" | "completed";

export default function TodosPage() {
    // Form 및 유저 상태
    const [user, setUser] = useState<any>(null);
    const [todos, setTodos] = useState<Todo[]>([]);
    const [filter, setFilter] = useState<FilterType>("all");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [startDate, setStartDate] = useState<Date | undefined>(new Date());
    const [endDate, setEndDate] = useState<Date | undefined>(new Date());

    const [profileMap, setProfileMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    // 로그인 유저 정보 모니터링
    useEffect(() => {
        const checkUser = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            setUser(user);
        };
        checkUser();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchTodos = async () => {
        setLoading(true);

        // Fetch profile data to map user_id -> profile.name
        const { data: profileData } = await supabase.from("profile").select("user_id, name");
        const map: Record<string, string> = {};
        if (profileData) {
            profileData.forEach((p) => {
                if (p.user_id && p.name) {
                    map[p.user_id] = p.name;
                }
            });
        }
        setProfileMap(map);

        const { data, error } = await supabase
            .from("todos")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching todos:", error.message);
        } else {
            setTodos(data || []);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchTodos();
    }, []);

    const getAuthorDisplayName = (todo: Todo) => {
        if (!todo.user_id) return "-";
        return profileMap[todo.user_id] || "-";
    };

    const getLoggedInUserName = () => {
        if (!user) return "";
        return (
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            (user.id ? profileMap[user.id] : "") ||
            "사용자"
        );
    };

    // 완료 상태 토글
    const toggleComplete = async (id: number, currentCompleted: boolean) => {
        setTodos((prev) =>
            prev.map((todo) =>
                todo.id === id ? { ...todo, is_completed: !currentCompleted } : todo
            )
        );

        const { error } = await supabase
            .from("todos")
            .update({ is_completed: !currentCompleted })
            .eq("id", id);

        if (error) {
            console.error("Error updating todo completion:", error.message);
            setTodos((prev) =>
                prev.map((todo) =>
                    todo.id === id ? { ...todo, is_completed: currentCompleted } : todo
                )
            );
        }
    };

    // 할 일 삭제
    const handleDeleteTodo = async (id: number) => {
        if (!user) {
            alert("삭제하려면 로그인이 필요합니다.");
            return;
        }

        if (!confirm("이 할 일을 정말로 삭제하시겠습니까?")) return;

        setTodos((prev) => prev.filter((t) => t.id !== id));

        const { error } = await supabase
            .from("todos")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Error deleting todo:", error.message);
            alert("삭제에 실패했습니다.");
            fetchTodos();
        }
    };

    // 모달 열기 - 등록
    const handleOpenAddDialog = () => {
        if (!user) return;
        setEditingTodo(null);
        resetForm();
        setIsDialogOpen(true);
    };

    // 모달 열기 - 수정
    const handleOpenEditDialog = (todo: Todo) => {
        if (!user) {
            alert("수정하려면 로그인이 필요합니다.");
            return;
        }
        setEditingTodo(todo);
        setTitle(todo.title);
        setContent(todo.contents || "");
        setStartDate(todo.s_date ? new Date(todo.s_date) : new Date());
        setEndDate(todo.e_date ? new Date(todo.e_date) : new Date());
        setIsDialogOpen(true);
    };

    // 저장 (등록 / 수정 공통)
    const handleSaveTodo = async () => {
        if (!title || !startDate || !endDate) return;

        if (!user) {
            alert("로그인이 필요합니다.");
            return;
        }

        if (editingTodo) {
            // 수정 모드
            const updateData = {
                title,
                contents: content,
                s_date: startDate.toISOString(),
                e_date: endDate.toISOString(),
            };

            const { error } = await supabase
                .from("todos")
                .update(updateData)
                .eq("id", editingTodo.id);

            if (error) {
                console.error("Error updating todo:", error.message);
            }

            setTodos((prev) =>
                prev.map((t) => (t.id === editingTodo.id ? { ...t, ...updateData } : t))
            );
        } else {
            // 등록 모드
            const newTodoData = {
                title,
                contents: content,
                s_date: startDate.toISOString(),
                e_date: endDate.toISOString(),
                user_id: user.id,
                is_completed: false,
            };

            const { data, error } = await supabase
                .from("todos")
                .insert([newTodoData])
                .select();

            if (error) {
                console.error("Error adding todo:", error.message);
                const fallbackTodo: Todo = {
                    id: Date.now(),
                    ...newTodoData,
                    created_at: new Date().toISOString(),
                };
                setTodos((prev) => [fallbackTodo, ...prev]);
            } else if (data && data.length > 0) {
                setTodos((prev) => [data[0], ...prev]);
            } else {
                fetchTodos();
            }
        }

        resetForm();
        setIsDialogOpen(false);
    };

    const resetForm = () => {
        setTitle("");
        setContent("");
        setStartDate(new Date());
        setEndDate(new Date());
        setEditingTodo(null);
    };

    // 필터링 계산
    const totalCount = todos.length;
    const inProgressCount = todos.filter((t) => !t.is_completed).length;
    const completedCount = todos.filter((t) => t.is_completed).length;

    const filteredTodos = todos.filter((todo) => {
        if (filter === "in_progress") return !todo.is_completed;
        if (filter === "completed") return todo.is_completed;
        return true;
    });

    return (
        <>
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 w-full gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-black dark:text-white">할일 목록</h1>
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
                                                    value={editingTodo ? getAuthorDisplayName(editingTodo) : (getLoggedInUserName() || "로그인 유저")}
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
                                {filteredTodos.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground border rounded-lg">
                                        {filter === "all" 
                                            ? "등록된 할 일이 없습니다." 
                                            : filter === "in_progress" 
                                            ? "진행 중인 할 일이 없습니다." 
                                            : "완료된 할 일이 없습니다."}
                                    </div>
                                ) : (
                                    <>
                                        {/* Mobile view (< md) */}
                                        <div className="space-y-3 block md:hidden">
                                            {filteredTodos.map((todo) => (
                                                <div
                                                    key={todo.id}
                                                    className={`p-4 rounded-lg border transition-all ${
                                                        todo.is_completed
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
                                                                    <p className="text-xs text-muted-foreground mt-1 break-words line-clamp-2">
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
                                                        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                                                            <span className="flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
                                                                <User className="w-3 h-3 text-muted-foreground shrink-0" />
                                                                <span className="truncate max-w-[90px]">{getAuthorDisplayName(todo)}</span>
                                                            </span>
                                                            <span className="text-[11px] text-zinc-400">
                                                                {todo.s_date ? format(new Date(todo.s_date), "MM-dd") : "-"} ~ {todo.e_date ? format(new Date(todo.e_date), "MM-dd") : "-"}
                                                            </span>
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

                                        {/* Desktop view (>= md) */}
                                        <div className="hidden md:block rounded-md border overflow-hidden">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[60px] text-center">완료</TableHead>
                                                        <TableHead>제목 / 내용</TableHead>
                                                        <TableHead className="w-[100px]">작성자</TableHead>
                                                        <TableHead className="w-[120px]">시작일</TableHead>
                                                        <TableHead className="w-[120px]">종료일</TableHead>
                                                        <TableHead className="w-[120px]">등록일</TableHead>
                                                        <TableHead className="w-[90px] text-center">상태</TableHead>
                                                        <TableHead className="w-[100px] text-center">관리</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredTodos.map((todo) => (
                                                        <TableRow key={todo.id} className={todo.is_completed ? "bg-muted/40" : ""}>
                                                            <TableCell className="text-center">
                                                                <Checkbox
                                                                    checked={todo.is_completed}
                                                                    onCheckedChange={() => toggleComplete(todo.id, todo.is_completed)}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className={`font-medium ${todo.is_completed ? "line-through text-muted-foreground" : ""}`}>
                                                                    {todo.title}
                                                                </div>
                                                                {todo.contents && (
                                                                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                                                        {todo.contents}
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-sm">
                                                                <div className="flex items-center gap-1">
                                                                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                                                                    {getAuthorDisplayName(todo)}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-sm text-muted-foreground">
                                                                {todo.s_date ? format(new Date(todo.s_date), "yyyy-MM-dd") : "-"}
                                                            </TableCell>
                                                            <TableCell className="text-sm text-muted-foreground">
                                                                {todo.e_date ? format(new Date(todo.e_date), "yyyy-MM-dd") : "-"}
                                                            </TableCell>
                                                            <TableCell className="text-sm text-muted-foreground">
                                                                {todo.created_at ? format(new Date(todo.created_at), "yyyy-MM-dd") : "-"}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                {todo.is_completed ? (
                                                                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                                                                        완료
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                                                                        진행중
                                                                    </Badge>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <div className="flex items-center justify-center gap-1">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                                                                        onClick={() => handleOpenEditDialog(todo)}
                                                                        title="할 일 수정"
                                                                    >
                                                                        <Pencil className="w-4 h-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                                        onClick={() => handleDeleteTodo(todo.id)}
                                                                        title="할 일 삭제"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </>
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