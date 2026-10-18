"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
    format,
    addDays,
    subDays,
    addWeeks,
    subWeeks,
    addMonths,
    subMonths,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    isSameDay,
} from "date-fns";
import { ko } from "date-fns/locale";
import {
    Loader2,
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    BookOpen,
    Users,
    Clock,
    Filter,
    CheckCircle2,
    CalendarDays,
    CalendarRange,
    UserCheck,
    UserX,
    Sparkles,
    Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { getKSTDateString } from "@/lib/dateUtils";
import { fetchScheduleItems } from "@/lib/scheduleUtils";
import { fetchAllScheduleStudentsMap, ScheduleStudentMap } from "@/lib/scheduleStudentUtils";
import { ScheduleItem } from "@/lib/scheduleTypes";

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

type ViewMode = "day" | "week" | "month";

// 요일 인덱스 (0: 일요일 ~ 6: 토요일) -> 시간표 day_of_week 키 매핑
const DAY_KEY_MAP: Record<number, string> = {
    0: "sun",
    1: "mon",
    2: "tue",
    3: "wed",
    4: "thu",
    5: "fri",
    6: "sat",
};

const DAY_LABELS: Record<string, string> = {
    mon: "월",
    tue: "화",
    wed: "수",
    thu: "목",
    fri: "금",
    sat: "토",
    sun: "일",
};

export default function AdminAttendancePage() {
    const { user } = useAuth();

    // 뷰 모드: 일(day), 주(week), 월(month)
    const [viewMode, setViewMode] = useState<ViewMode>("day");

    // 기준 날짜 (기본: 오늘)
    const [currentDate, setCurrentDate] = useState<Date>(new Date());

    const [monthlyAttendances, setMonthlyAttendances] = useState<AttendanceRecord[]>([]);
    const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [scheduleStudentsMap, setScheduleStudentsMap] = useState<ScheduleStudentMap>({});
    const [selectedScheduleId, setSelectedScheduleId] = useState<string>("all");
    const [adminLoading, setAdminLoading] = useState<boolean>(false);

    const todayStr = getKSTDateString();

    // 프로필, 시간표 강좌, 수강생 매핑, 출석 기록 조회
    const fetchAdminData = useCallback(async () => {
        setAdminLoading(true);
        try {
            const [profRes, schedulesRes, studentMapRes] = await Promise.all([
                supabase.from("profile").select("user_id, name, Email, grade"),
                fetchScheduleItems(),
                fetchAllScheduleStudentsMap(),
            ]);

            if (profRes.data) {
                setProfiles(profRes.data);
            }
            setSchedules(schedulesRes || []);
            setScheduleStudentsMap(studentMapRes || {});

            // 일, 주, 월 전환 시 커버할 수 있도록 월과 주의 합집합 범위 계산
            const monthStart = startOfMonth(currentDate);
            const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
            const rangeStart = monthStart < weekStart ? monthStart : weekStart;

            const monthEnd = endOfMonth(currentDate);
            const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
            const rangeEnd = monthEnd > weekEnd ? monthEnd : weekEnd;

            const startStr = format(rangeStart, "yyyy-MM-dd");
            const endStr = format(rangeEnd, "yyyy-MM-dd");

            const { data: attData, error } = await supabase
                .from("attendance")
                .select("*")
                .gte("a_date", startStr)
                .lte("a_date", endStr);

            if (error) {
                console.error("Error fetching attendances:", error.message);
            } else {
                setMonthlyAttendances(attData || []);
            }
        } catch (err) {
            console.error("Admin data fetch error:", err);
        } finally {
            setAdminLoading(false);
        }
    }, [currentDate]);

    useEffect(() => {
        fetchAdminData();
    }, [fetchAdminData]);

    // 프로필 ID 맵
    const profileMap = useMemo(() => {
        const map: Record<string, ProfileRecord> = {};
        profiles.forEach((p) => {
            map[p.user_id] = p;
        });
        return map;
    }, [profiles]);

    // 전체 수강생 고유 ID 집합
    const allEnrolledStudentIds = useMemo(() => {
        const set = new Set<string>();
        Object.values(scheduleStudentsMap).forEach((ids) => {
            ids.forEach((id) => set.add(id));
        });
        return set;
    }, [scheduleStudentsMap]);

    // Admin edit dialog state
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<{
        id?: number;
        user_id: string;
        name: string;
        Email?: string | null;
        a_date: string;
        s_date?: string | null;
        e_date?: string | null;
    } | null>(null);
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
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, "0");
                const day = String(d.getDate()).padStart(2, "0");
                const hours = String(d.getHours()).padStart(2, "0");
                const minutes = String(d.getMinutes()).padStart(2, "0");
                return `${y}-${m}-${day}T${hours}:${minutes}`;
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

    // 네비게이션 제어
    const handlePrev = () => {
        if (viewMode === "day") {
            setCurrentDate((prev) => subDays(prev, 1));
        } else if (viewMode === "week") {
            setCurrentDate((prev) => subWeeks(prev, 1));
        } else {
            setCurrentDate((prev) => subMonths(prev, 1));
        }
    };

    const handleNext = () => {
        if (viewMode === "day") {
            setCurrentDate((prev) => addDays(prev, 1));
        } else if (viewMode === "week") {
            setCurrentDate((prev) => addWeeks(prev, 1));
        } else {
            setCurrentDate((prev) => addMonths(prev, 1));
        }
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    // 날짜 레이블 생성
    const navigationLabel = useMemo(() => {
        if (viewMode === "day") {
            return format(currentDate, "yyyy년 MM월 dd일 (EEE)", { locale: ko });
        }
        if (viewMode === "week") {
            const start = startOfWeek(currentDate, { weekStartsOn: 1 });
            const end = endOfWeek(currentDate, { weekStartsOn: 1 });
            return `${format(start, "yyyy.MM.dd")} ~ ${format(end, "MM.dd")}`;
        }
        return format(currentDate, "yyyy년 MM월", { locale: ko });
    }, [viewMode, currentDate]);

    // 날짜별 학생 및 출석 데이터 계산 헬퍼 함수
    const getStudentsForDate = useCallback(
        (targetDate: Date) => {
            const dateString = format(targetDate, "yyyy-MM-dd");
            const dayOfWeekKey = DAY_KEY_MAP[targetDate.getDay()];

            // 1. 해당 요일에 배정된 강좌 필터링
            const activeSchedulesOnDay = schedules.filter((s) => {
                const isDayMatch = s.dayOfWeek === dayOfWeekKey;
                if (selectedScheduleId === "all") return isDayMatch;
                return isDayMatch && s.id === selectedScheduleId;
            });

            // 2. 해당 요일 강좌에 등록된 수강생 ID 목록 및 수강 강좌명 수집
            const studentCourseMap: Record<string, string[]> = {};
            activeSchedulesOnDay.forEach((sch) => {
                const enrolledIds = scheduleStudentsMap[sch.id] || [];
                enrolledIds.forEach((sId) => {
                    if (!studentCourseMap[sId]) {
                        studentCourseMap[sId] = [];
                    }
                    studentCourseMap[sId].push(sch.title);
                });
            });

            // 3. 해당 일자의 실제 출석 기록
            const dateRecords = monthlyAttendances.filter((att) => att.a_date === dateString);

            // 4. 대상 학생 ID 집합
            const targetStudentIds = new Set<string>([
                ...Object.keys(studentCourseMap),
                ...dateRecords.map((r) => r.user_id),
            ]);

            const dayStudentProfiles = Array.from(targetStudentIds)
                .map((id) => profileMap[id] || { user_id: id, name: "학생", Email: null, grade: "S" })
                .filter((p) => p.grade === "S" || targetStudentIds.has(p.user_id))
                .sort((a, b) => a.name.localeCompare(b.name, "ko"));

            return {
                dateString,
                activeSchedulesOnDay,
                studentCourseMap,
                dateRecords,
                dayStudentProfiles,
                hasClasses: activeSchedulesOnDay.length > 0,
            };
        },
        [schedules, selectedScheduleId, scheduleStudentsMap, monthlyAttendances, profileMap]
    );

    // ==========================================
    // 1. 일간(Day) 뷰 렌더링 컴포넌트
    // ==========================================
    const renderDayView = () => {
        const { dateString, activeSchedulesOnDay, studentCourseMap, dateRecords, dayStudentProfiles } =
            getStudentsForDate(currentDate);

        const attendedCount = dateRecords.filter((r) => r.s_date).length;
        const leftCount = dateRecords.filter((r) => r.s_date && r.e_date).length;
        const totalTargetCount = dayStudentProfiles.length;
        const absentCount = Math.max(0, totalTargetCount - attendedCount);

        return (
            <div className="space-y-4">
                {/* 일간 통계 요약 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Card className="border p-3 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                            <Users className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[11px] text-muted-foreground">당일 대상 수강생</div>
                            <div className="text-base font-bold text-center">{totalTargetCount}명</div>
                        </div>
                    </Card>

                    <Card className="border p-3 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                            <UserCheck className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[11px] text-muted-foreground">등원 완료</div>
                            <div className="text-base font-bold text-center text-emerald-600 dark:text-emerald-400">
                                {attendedCount}명
                            </div>
                        </div>
                    </Card>

                    <Card className="border p-3 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[11px] text-muted-foreground">하원 완료</div>
                            <div className="text-base font-bold text-center text-purple-600 dark:text-purple-400">{leftCount}명</div>
                        </div>
                    </Card>

                    <Card className="border p-3 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                            <UserX className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[11px] text-muted-foreground">미등원 / 결석</div>
                            <div className="text-base font-bold text-center text-rose-600 dark:text-rose-400">{absentCount}명</div>
                        </div>
                    </Card>
                </div>

                {/* 일간 상세 테이블 / 리스트 */}
                {dayStudentProfiles.length === 0 ? (
                    <Card className="border border-dashed p-12 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                            <CalendarIcon className="w-8 h-8 opacity-40 mb-1" />
                            <p className="text-base font-semibold">배정된 시간표 및 출석 대상 학생이 없습니다.</p>
                            <p className="text-xs">
                                {activeSchedulesOnDay.length > 0
                                    ? "시간표는 개설되어 있으나 등록된 수강생이 없습니다."
                                    : "해당 요일에는 개설된 수업이 없습니다."}
                            </p>
                        </div>
                    </Card>
                ) : (
                    <Card className="border shadow-sm">
                        <CardHeader className="pb-3 border-b">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-bold">
                                        {format(currentDate, "yyyy년 MM월 dd일 (EEEE)", { locale: ko })} 출석 명단
                                    </CardTitle>
                                    <CardDescription className="text-xs mt-0.5">
                                        학생 행을 클릭하여 등/하원 일시를 직접 수정하거나 등록할 수 있습니다.
                                    </CardDescription>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                    총 {dayStudentProfiles.length}명
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-zinc-50 dark:bg-zinc-900/50">
                                        <TableHead className="w-[180px]">학생명</TableHead>
                                        <TableHead>수강 강좌</TableHead>
                                        <TableHead className="w-[120px] text-center">출석 상태</TableHead>
                                        <TableHead className="w-[140px] text-center">등원 시간</TableHead>
                                        <TableHead className="w-[140px] text-center">하원 시간</TableHead>
                                        <TableHead className="w-[100px] text-center">관리</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {dayStudentProfiles.map((student) => {
                                        const record = dateRecords.find((r) => r.user_id === student.user_id);
                                        const courses = studentCourseMap[student.user_id] || [];
                                        const isEnrolledOnDay = courses.length > 0;

                                        let statusBadge = (
                                            <Badge variant="secondary" className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                                결석 / 미등원
                                            </Badge>
                                        );

                                        if (record) {
                                            if (record.s_date && record.e_date) {
                                                statusBadge = (
                                                    <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300 border-rose-200">
                                                        하원완료
                                                    </Badge>
                                                );
                                            } else if (record.s_date) {
                                                statusBadge = (
                                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-300 border-blue-200">
                                                        등원
                                                    </Badge>
                                                );
                                            }
                                        }

                                        return (
                                            <TableRow
                                                key={student.user_id}
                                                className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                                                onClick={() => handleOpenAdminEdit(student, dateString, record)}
                                            >
                                                <TableCell className="font-semibold">
                                                    <div className="flex items-center gap-1.5">
                                                        <span>{student.name}</span>
                                                        {student.Email && (
                                                            <span className="text-[11px] text-muted-foreground font-normal">
                                                                ({student.Email.split("@")[0]})
                                                            </span>
                                                        )}
                                                        {!isEnrolledOnDay && (
                                                            <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-300">
                                                                추가출석
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {courses.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {courses.map((c, i) => (
                                                                <span key={i} className="inline-block bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[11px] text-foreground font-medium">
                                                                    {c}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-zinc-400">시간표 미배정</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">{statusBadge}</TableCell>
                                                <TableCell className="text-center text-xs font-medium">
                                                    {record?.s_date ? format(new Date(record.s_date), "HH:mm:ss") : "-"}
                                                </TableCell>
                                                <TableCell className="text-center text-xs font-medium">
                                                    {record?.e_date ? format(new Date(record.e_date), "HH:mm:ss") : "-"}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 px-2 text-xs gap-1"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenAdminEdit(student, dateString, record);
                                                        }}
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                        수정
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    };

    // ==========================================
    // 2. 주간(Week) 뷰 렌더링 컴포넌트
    // ==========================================
    const renderWeekView = () => {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                    {weekDays.map((dayDate, dayIdx) => {
                        const { dateString, activeSchedulesOnDay, studentCourseMap, dateRecords, dayStudentProfiles } =
                            getStudentsForDate(dayDate);

                        const isToday = dateString === todayStr;
                        const isSunday = dayIdx === 6;
                        const isSaturday = dayIdx === 5;

                        return (
                            <div
                                key={dateString}
                                className={`border rounded-xl p-2.5 flex flex-col justify-start bg-white dark:bg-zinc-900 transition-all min-h-[300px] ${isToday ? "ring-2 ring-blue-500 border-blue-500 shadow-sm" : "border-zinc-200 dark:border-zinc-800"
                                    }`}
                            >
                                {/* Column Header */}
                                <div className="pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span
                                            className={`text-sm font-bold ${isSunday ? "text-red-500" : isSaturday ? "text-blue-500" : "text-zinc-800 dark:text-zinc-200"
                                                }`}
                                        >
                                            {format(dayDate, "E (dd일)", { locale: ko })}
                                        </span>
                                        {isToday && (
                                            <span className="text-[9px] bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-1 rounded font-semibold">
                                                오늘
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground font-medium">
                                        {dayStudentProfiles.length}명
                                    </span>
                                </div>

                                {/* Class Tag */}
                                {activeSchedulesOnDay.length > 0 ? (
                                    <div className="mb-2 space-y-1">
                                        {activeSchedulesOnDay.map((sch) => (
                                            <div
                                                key={sch.id}
                                                className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-muted-foreground truncate"
                                                title={`${sch.title} (${sch.startTime}~${sch.endTime})`}
                                            >
                                                {sch.title}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-[10px] text-center text-zinc-400 py-1 mb-2">개설 수업 없음</div>
                                )}

                                {/* Students List */}
                                <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[380px]">
                                    {dayStudentProfiles.length === 0 ? (
                                        <div className="py-6 text-center text-zinc-300 dark:text-zinc-600 text-xs">수강생 없음</div>
                                    ) : (
                                        dayStudentProfiles.map((student) => {
                                            const record = dateRecords.find((r) => r.user_id === student.user_id);
                                            const courses = studentCourseMap[student.user_id] || [];

                                            let statusText = "결석";
                                            let statusClass = "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";

                                            if (record) {
                                                if (record.s_date && record.e_date) {
                                                    statusText = "하원";
                                                    statusClass = "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
                                                } else if (record.s_date) {
                                                    statusText = "등원";
                                                    statusClass = "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
                                                }
                                            }

                                            return (
                                                <div
                                                    key={student.user_id}
                                                    onClick={() => handleOpenAdminEdit(student, dateString, record)}
                                                    className="p-1.5 rounded-lg border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors text-[10px]"
                                                    title="클릭하여 등/하원 일시 수정"
                                                >
                                                    <div className="flex items-center justify-between gap-1">
                                                        <span className="font-semibold truncate">{student.name}</span>
                                                        <span className={`px-1 py-0.2 rounded font-bold text-[8px] shrink-0 ${statusClass}`}>
                                                            {statusText}
                                                        </span>
                                                    </div>
                                                    {record?.s_date && (
                                                        <div className="text-[9px] text-muted-foreground mt-0.5 truncate">
                                                            등: {format(new Date(record.s_date), "HH:mm")}
                                                            {record.e_date && ` / 하: ${format(new Date(record.e_date), "HH:mm")}`}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // ==========================================
    // 3. 월간(Month) 뷰 렌더링 컴포넌트
    // ==========================================
    const renderMonthView = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfWeek = new Date(year, month, 1).getDay();

        const daysArray: (number | null)[] = [];
        for (let i = 0; i < firstDayOfWeek; i++) {
            daysArray.push(null);
        }
        for (let d = 1; d <= daysInMonth; d++) {
            daysArray.push(d);
        }

        return (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden w-full">
                <Card className="border-0 shadow-none">
                    <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/60 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg md:text-xl font-bold">시간표 기반 월별 출석부 달력</CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                                각 날짜의 요일에 수업이 배정된 수강생만 표시됩니다. 학생 카드를 클릭하여 등/하원 일시를 수정하거나 직접 출석 등록할 수 있습니다.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-3 md:p-5">
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
                                    return <div key={`empty-${idx}`} className="min-h-[90px] md:min-h-[130px] bg-zinc-50/50 dark:bg-zinc-900/30 rounded-lg p-1" />;
                                }

                                const dateObj = new Date(year, month, dayNum);
                                const { dateString, activeSchedulesOnDay, studentCourseMap, dateRecords, dayStudentProfiles, hasClasses } =
                                    getStudentsForDate(dateObj);

                                const isSunday = idx % 7 === 0;
                                const isSaturday = idx % 7 === 6;

                                return (
                                    <div
                                        key={`day-${dayNum}`}
                                        className={`min-h-[90px] md:min-h-[130px] border rounded-lg p-1.5 md:p-2 flex flex-col justify-start bg-white dark:bg-zinc-900 transition-colors ${dateString === todayStr
                                            ? "ring-2 ring-blue-500 border-blue-500 shadow-sm"
                                            : "border-zinc-200 dark:border-zinc-800"
                                            }`}
                                    >
                                        {/* Date Header */}
                                        <div className="flex items-center justify-between mb-1 pb-1 border-b border-zinc-100 dark:border-zinc-800/60">
                                            <div className="flex items-center gap-1">
                                                <span
                                                    className={`text-xs md:text-sm font-bold ${isSunday ? "text-red-500" : isSaturday ? "text-blue-500" : "text-zinc-700 dark:text-zinc-300"
                                                        }`}
                                                >
                                                    {dayNum}
                                                </span>
                                                {dateString === todayStr && (
                                                    <span className="text-[9px] bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-1 py-0.2 rounded font-medium">
                                                        오늘
                                                    </span>
                                                )}
                                            </div>

                                            {hasClasses && (
                                                <span className="text-[9px] text-muted-foreground font-medium" title={`${activeSchedulesOnDay.length}개 수업`}>
                                                    {activeSchedulesOnDay.length}개 반
                                                </span>
                                            )}
                                        </div>

                                        {/* Student List for this day */}
                                        <div className="space-y-1 overflow-y-auto max-h-[110px] md:max-h-[130px] text-[10px] md:text-xs">
                                            {dayStudentProfiles.length === 0 ? (
                                                <div className="py-2 text-center text-zinc-300 dark:text-zinc-600 text-[10px]">
                                                    {hasClasses ? "등록 수강생 없음" : "수업 없음"}
                                                </div>
                                            ) : (
                                                dayStudentProfiles.map((student) => {
                                                    const record = dateRecords.find((r) => r.user_id === student.user_id);
                                                    const courses = studentCourseMap[student.user_id] || [];
                                                    const isEnrolledOnDay = courses.length > 0;

                                                    let statusText = "결석";
                                                    let statusClass = "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";

                                                    if (record) {
                                                        if (record.s_date && record.e_date) {
                                                            statusText = "하원완료";
                                                            statusClass = "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
                                                        } else if (record.s_date) {
                                                            statusText = "등원";
                                                            statusClass = "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
                                                        }
                                                    }

                                                    return (
                                                        <div
                                                            key={student.user_id}
                                                            onClick={() => handleOpenAdminEdit(student, dateString, record)}
                                                            className={`flex flex-col p-1 rounded border gap-0.5 cursor-pointer transition-colors ${record
                                                                ? "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                                : "border-zinc-100 dark:border-zinc-800/40 bg-white dark:bg-zinc-900/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                                                                }`}
                                                            title={`클릭하여 등/하원 일시 수정\n${courses.length > 0 ? `수강 강좌: ${courses.join(", ")}` : "시간표 미배정"}`}
                                                        >
                                                            <div className="flex items-center justify-between gap-1 overflow-hidden">
                                                                <span className="truncate font-medium min-w-0 flex items-center gap-1">
                                                                    <span>{student.name}</span>
                                                                    {!isEnrolledOnDay && (
                                                                        <span className="text-[8px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-0.5 rounded shrink-0">
                                                                            추가
                                                                        </span>
                                                                    )}
                                                                </span>
                                                                <span className={`px-1 rounded font-semibold text-[8px] shrink-0 ${statusClass}`}>
                                                                    {statusText}
                                                                </span>
                                                            </div>

                                                            {/* Time or Course info */}
                                                            <div className="text-[8px] text-muted-foreground leading-tight truncate">
                                                                {record?.s_date ? (
                                                                    <span>
                                                                        등: {format(new Date(record.s_date), "HH:mm")}
                                                                        {record.e_date && ` / 하: ${format(new Date(record.e_date), "HH:mm")}`}
                                                                    </span>
                                                                ) : courses.length > 0 ? (
                                                                    <span className="opacity-80 truncate">{courses[0]}</span>
                                                                ) : (
                                                                    <span className="opacity-50">미출석</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">수강생 출석 관리</h1>
                        <Badge variant="default" className="bg-blue-600">시간표 연동</Badge>
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">
                        일간, 주간, 월간 단위로 출석 현황을 모니터링하고 시간표 수강생들의 등/하원 일시를 관리할 수 있습니다.
                    </p>
                </div>

                {/* Filters, ViewMode Tabs & Navigation Bar */}
                <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
                    {/* ViewMode Tabs (일 / 주 / 월) */}
                    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                        <TabsList className="h-9">
                            <TabsTrigger value="day" className="text-xs px-3">
                                일간
                            </TabsTrigger>
                            <TabsTrigger value="week" className="text-xs px-3">
                                주간
                            </TabsTrigger>
                            <TabsTrigger value="month" className="text-xs px-3">
                                월간
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* 강좌 선택 필터 */}
                    <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                        <Filter className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 whitespace-nowrap">강좌:</span>
                        <Select value={selectedScheduleId} onValueChange={setSelectedScheduleId}>
                            <SelectTrigger className="h-8 text-xs border-0 bg-transparent shadow-none w-[160px] sm:w-[190px] focus:ring-0">
                                <SelectValue placeholder="전체 강좌 시간표" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                <SelectItem value="all">전체 강좌 (모든 시간표)</SelectItem>
                                {schedules.map((sch) => (
                                    <SelectItem key={sch.id} value={sch.id}>
                                        [{DAY_LABELS[sch.dayOfWeek] || sch.dayOfWeek}] {sch.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date Navigation */}
                    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleToday}>
                            오늘
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrev} title="이전">
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-xs font-semibold px-2 min-w-[100px] text-center">
                            {navigationLabel}
                        </span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNext} title="다음">
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Quick Status Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm p-3 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                        <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-[11px] text-muted-foreground">개설 강좌</div>
                        <div className="text-base font-bold text-center">{schedules.length}개 강좌</div>
                    </div>
                </Card>

                <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm p-3 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                        <Users className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-[11px] text-muted-foreground">시간표 수강생</div>
                        <div className="text-base font-bold text-center">{allEnrolledStudentIds.size}명 등록</div>
                    </div>
                </Card>

                <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm p-3 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                        <CalendarIcon className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-[11px] text-muted-foreground">조회 기간 출석 기록</div>
                        <div className="text-base font-bold text-center">{monthlyAttendances.length}건</div>
                    </div>
                </Card>

                <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm p-3 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                        <Clock className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-[11px] text-muted-foreground">선택된 강좌</div>
                        <div className="text-xs font-semibold truncate max-w-[120px]" title={selectedScheduleId === "all" ? "전체 강좌" : schedules.find(s => s.id === selectedScheduleId)?.title}>
                            {selectedScheduleId === "all" ? "전체 강좌" : schedules.find(s => s.id === selectedScheduleId)?.title}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Main Content Area */}
            {adminLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-500 w-full">
                    <Loader2 className="h-8 w-8 animate-spin mb-3" />
                    <p className="text-sm animate-pulse">출석 현황을 계산 중입니다...</p>
                </div>
            ) : viewMode === "day" ? (
                renderDayView()
            ) : viewMode === "week" ? (
                renderWeekView()
            ) : (
                renderMonthView()
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
