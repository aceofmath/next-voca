"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { getKSTDateString } from "@/lib/dateUtils";

interface AttendanceRecord {
    id: number;
    a_date: string;
    s_date: string | null;
    e_date: string | null;
    user_id: string;
}

interface ProfileRecord {
    user_id: string;
    name: string;
    Email?: string | null;
    grade?: string | null;
}

export default function AdminAttendancePage() {
    const { user } = useAuth();
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [monthlyAttendances, setMonthlyAttendances] = useState<AttendanceRecord[]>([]);
    const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
    const [adminLoading, setAdminLoading] = useState<boolean>(false);

    const todayStr = getKSTDateString();

    // Fetch profiles & monthly attendance
    const fetchAdminData = useCallback(async () => {
        setAdminLoading(true);
        try {
            const { data: profData } = await supabase.from("profile").select("user_id, name, Email, grade");
            if (profData) {
                setProfiles(profData);
            }

            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth() + 1;
            const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endOfMonth = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

            const { data: attData, error } = await supabase
                .from("attendance")
                .select("*")
                .gte("a_date", startOfMonth)
                .lte("a_date", endOfMonth);

            if (error) {
                console.error("Error fetching monthly attendances:", error.message);
            } else {
                setMonthlyAttendances(attData || []);
            }
        } catch (err) {
            console.error("Admin data fetch error:", err);
        } finally {
            setAdminLoading(false);
        }
    }, [currentMonth]);

    useEffect(() => {
        fetchAdminData();
    }, [fetchAdminData]);

    // Admin edit dialog state
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<{ id?: number; user_id: string; name: string; Email?: string | null; a_date: string; s_date?: string | null; e_date?: string | null } | null>(null);
    const [editSDate, setEditSDate] = useState("");
    const [editEDate, setEditEDate] = useState("");
    const [savingEdit, setSavingEdit] = useState(false);

    const handleOpenAdminEdit = (student: ProfileRecord, a_date: string, record?: AttendanceRecord) => {
        setEditingStudent({
            id: record?.id,
            user_id: student.user_id,
            name: student.name,
            Email: student.Email,
            a_date,
            s_date: record?.s_date,
            e_date: record?.e_date,
        });

        const formatForInput = (isoStr?: string | null) => {
            if (!isoStr) return "";
            try {
                const d = new Date(isoStr);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, "0");
                const day = String(d.getDate()).padStart(2, "0");
                const hours = String(d.getHours()).padStart(2, "0");
                const minutes = String(d.getMinutes()).padStart(2, "0");
                return `${year}-${month}-${day}T${hours}:${minutes}`;
            } catch {
                return "";
            }
        };

        setEditSDate(formatForInput(record?.s_date));
        setEditEDate(formatForInput(record?.e_date));
        setEditDialogOpen(true);
    };

    const handleSaveAdminEdit = async () => {
        if (!editingStudent) return;
        setSavingEdit(true);

        const toIso = (localDtStr: string) => {
            if (!localDtStr) return null;
            return new Date(localDtStr).toISOString();
        };

        const s_date_iso = toIso(editSDate);
        const e_date_iso = toIso(editEDate);

        try {
            if (editingStudent.id) {
                const { error } = await supabase
                    .from("attendance")
                    .update({
                        s_date: s_date_iso,
                        e_date: e_date_iso,
                    })
                    .eq("id", editingStudent.id);

                if (error) {
                    console.error("Admin edit error:", error.message);
                    alert("수정에 실패했습니다.");
                }
            } else {
                const { error } = await supabase
                    .from("attendance")
                    .insert([
                        {
                            a_date: editingStudent.a_date,
                            s_date: s_date_iso,
                            e_date: e_date_iso,
                            user_id: editingStudent.user_id,
                        },
                    ]);

                if (error) {
                    console.error("Admin insert error:", error.message);
                    alert("등록에 실패했습니다.");
                }
            }

            setEditDialogOpen(false);
            fetchAdminData();
        } catch (err) {
            console.error("Admin save exception:", err);
        } finally {
            setSavingEdit(false);
        }
    };

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();

    const daysArray: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
        daysArray.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
        daysArray.push(d);
    }

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(year, month - 1, 1));
    };
    const handleNextMonth = () => {
        setCurrentMonth(new Date(year, month + 1, 1));
    };

    const studentProfiles = profiles.filter((p) => p.grade === "S");

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">학생 출석 관리</h1>
                        <Badge variant="default" className="bg-blue-600">관리자 전용</Badge>
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">학생(grade: &apos;S&apos;)들의 월별 출석 현황을 확인하고 클릭하여 등/하원 일시를 수정할 수 있습니다.</p>
                </div>

                {/* Month Navigator */}
                <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 self-start sm:self-auto">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-semibold px-2 min-w-[100px] text-center">
                        {format(currentMonth, "yyyy년 MM월", { locale: ko })}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {adminLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-500 w-full">
                    <Loader2 className="h-8 w-8 animate-spin mb-3" />
                    <p className="text-sm animate-pulse">월별 출석 현황을 계산 중입니다...</p>
                </div>
            ) : (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden w-full">
                    <Card className="border-0 shadow-none">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xl font-bold">월별 출석 현황 달력</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 md:p-6">
                            {/* Calendar Grid Header */}
                            <div className="grid grid-cols-7 text-center font-semibold text-xs md:text-sm py-2 border-b border-zinc-200 dark:border-zinc-800 mb-2">
                                <div className="text-red-500">일</div>
                                <div>월</div>
                                <div>화</div>
                                <div>수</div>
                                <div>목</div>
                                <div>금</div>
                                <div className="text-blue-500">토</div>
                            </div>

                            {/* Calendar Days Grid */}
                            <div className="grid grid-cols-7 gap-1 md:gap-2">
                                {daysArray.map((dayNum, idx) => {
                                    if (dayNum === null) {
                                        return <div key={`empty-${idx}`} className="min-h-[90px] md:min-h-[120px] bg-zinc-50/50 dark:bg-zinc-900/30 rounded-lg p-1" />;
                                    }

                                    const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                                    const isSunday = idx % 7 === 0;
                                    const isSaturday = idx % 7 === 6;

                                    const dateRecords = monthlyAttendances.filter((att) => att.a_date === dateString);

                                    return (
                                        <div
                                            key={`day-${dayNum}`}
                                            className={`min-h-[90px] md:min-h-[120px] border rounded-lg p-1.5 md:p-2 flex flex-col justify-start bg-white dark:bg-zinc-900 ${dateString === todayStr ? "ring-2 ring-blue-500 border-blue-500" : "border-zinc-200 dark:border-zinc-800"
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span
                                                    className={`text-xs md:text-sm font-bold ${isSunday ? "text-red-500" : isSaturday ? "text-blue-500" : "text-zinc-700 dark:text-zinc-300"
                                                        }`}
                                                >
                                                    {dayNum}
                                                </span>
                                                {dateString === todayStr && (
                                                    <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-1 rounded">오늘</span>
                                                )}
                                            </div>

                                            {/* List student status for this day */}
                                            <div className="space-y-1.5 overflow-y-auto max-h-[100px] md:max-h-[120px] text-[10px] md:text-xs">
                                                {dateRecords.length > 0 && studentProfiles.map((student) => {
                                                    const record = dateRecords.find((r) => r.user_id === student.user_id);
                                                    let statusText = "결석";
                                                    let statusClass = "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";

                                                    if (record) {
                                                        if (record.s_date && record.e_date) {
                                                            statusText = "하원완료";
                                                            statusClass = "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
                                                        } else if (record.s_date) {
                                                            statusText = "등원";
                                                            statusClass = "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
                                                        }
                                                    }

                                                    return (
                                                        <div
                                                            key={student.user_id}
                                                            onClick={() => handleOpenAdminEdit(student, dateString, record)}
                                                            className="flex flex-col p-1 rounded border border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/50 gap-0.5 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                                            title="클릭하여 등/하원 일시 수정"
                                                        >
                                                            <div className="flex items-center justify-between gap-1 overflow-hidden">
                                                                <span className="truncate font-medium min-w-0" title={student.Email ? `${student.name}(${student.Email.split("@")[0]})` : student.name}>
                                                                    {student.name}{student.Email ? `(${student.Email.split("@")[0]})` : ""}
                                                                </span>
                                                                <span className={`px-1 rounded font-semibold text-[9px] shrink-0 ${statusClass}`}>
                                                                    {statusText}
                                                                </span>
                                                            </div>
                                                            {record && (
                                                                <div className="text-[9px] text-muted-foreground leading-tight truncate">
                                                                    {record.s_date && `등원: ${format(new Date(record.s_date), "HH:mm")}`}
                                                                    {record.s_date && record.e_date && " / "}
                                                                    {record.e_date && `하원: ${format(new Date(record.e_date), "HH:mm")}`}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Admin Edit Modal Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-lg">
                    <DialogHeader>
                        <DialogTitle>
                            출석 일시 수정 ({editingStudent?.name}{editingStudent?.Email ? `(${editingStudent.Email.split("@")[0]})` : ""})
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label className="text-xs font-semibold text-muted-foreground">기준 일자</label>
                            <Input value={editingStudent?.a_date || ""} disabled className="bg-muted" />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-xs font-semibold text-muted-foreground">등원 일시</label>
                            <Input
                                type="datetime-local"
                                value={editSDate}
                                onChange={(e) => setEditSDate(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-xs font-semibold text-muted-foreground">하원 일시</label>
                            <Input
                                type="datetime-local"
                                value={editEDate}
                                onChange={(e) => setEditEDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex-row justify-end gap-2">
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            취소
                        </Button>
                        <Button onClick={handleSaveAdminEdit} disabled={savingEdit}>
                            {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : "저장"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
