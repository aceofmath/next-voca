"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
    ScheduleItem,
    DayOfWeek,
    DAYS_OF_WEEK,
    COLOR_PALETTE,
    generateTimeSlots,
    timeToMinutes,
    minutesToTime,
} from "@/lib/scheduleTypes";
import {
    fetchScheduleItems,
    saveScheduleItem,
    deleteScheduleItem,
} from "@/lib/scheduleUtils";
import {
    fetchAllStudentProfiles,
    fetchEnrolledStudentIds,
    fetchAllScheduleStudentsMap,
    syncScheduleStudents,
    StudentProfile,
    ScheduleStudentMap,
} from "@/lib/scheduleStudentUtils";
import { fetchCommonCodes } from "@/lib/codeUtils";
import { CommonCode } from "@/lib/codeTypes";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Clock,
    Plus,
    Printer,
    RefreshCw,
    Filter,
    Trash2,
    Edit3,
    Calendar as CalendarIcon,
    User,
    MapPin,
    GraduationCap,
    AlertCircle,
    Check,
    Users,
    Search,
    Loader2,
} from "lucide-react";

interface TeacherUser {
    user_id: string;
    name: string;
}

const SLOT_HEIGHT = 46; // height in px for each 30-min slot
const START_HOUR_MINUTES = 9 * 60; // 09:00 = 540 minutes

export default function AdminSchedulePage() {
    const [items, setItems] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [dbRooms, setDbRooms] = useState<CommonCode[]>([]);
    const [dbGrades, setDbGrades] = useState<CommonCode[]>([]);
    const [dbDays, setDbDays] = useState<CommonCode[]>([]);
    const [dbTeachers, setDbTeachers] = useState<TeacherUser[]>([]);

    // Filters
    const [filterInstructor, setFilterInstructor] = useState<string>("all");
    const [filterRoom, setFilterRoom] = useState<string>("all");
    const [filterGrade, setFilterGrade] = useState<string>("all");

    // Dialog state
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
    const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
    const [activeTab, setActiveTab] = useState<string>("info");

    // Form inputs (stores user_id for instructor, code_value for room & targetGrade)
    const [formTitle, setFormTitle] = useState<string>("");
    const [formInstructor, setFormInstructor] = useState<string>(""); // user_id
    const [formRoom, setFormRoom] = useState<string>("");             // code_value
    const [formTargetGrade, setFormTargetGrade] = useState<string>("");   // code_value
    const [formDayOfWeek, setFormDayOfWeek] = useState<DayOfWeek>("mon");
    const [formStartTime, setFormStartTime] = useState<string>("10:00");
    const [formEndTime, setFormEndTime] = useState<string>("12:00");
    const [formColor, setFormColor] = useState<string>("#3b82f6");
    const [formDescription, setFormDescription] = useState<string>("");
    const [formError, setFormError] = useState<string | null>(null);

    // 수강생 관리 상태
    const [allStudents, setAllStudents] = useState<StudentProfile[]>([]);
    const [enrolledStudentMap, setEnrolledStudentMap] = useState<ScheduleStudentMap>({});
    const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
    const [studentSearchQuery, setStudentSearchQuery] = useState<string>("");
    const [loadingStudents, setLoadingStudents] = useState<boolean>(false);
    const [savingStudents, setSavingStudents] = useState<boolean>(false);

    const timeSlots = useMemo(() => generateTimeSlots(), []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [scheduleData, roomCodes, gradeCodes, dayCodes, teacherRes, studentsRes, studentMapRes] = await Promise.all([
                fetchScheduleItems(),
                fetchCommonCodes("ROOM"),
                fetchCommonCodes("GRADE"),
                fetchCommonCodes("DAY"),
                supabase.from("profile").select("user_id, name, grade").eq("grade", "T").order("name"),
                fetchAllStudentProfiles(),
                fetchAllScheduleStudentsMap(),
            ]);

            setItems(scheduleData);
            setDbRooms(roomCodes.filter((c) => c.isUse && c.supCategory !== null && c.supCategory !== undefined));
            setDbGrades(gradeCodes.filter((c) => c.isUse && c.supCategory !== null && c.supCategory !== undefined));
            setDbDays(dayCodes.filter((c) => c.isUse && c.supCategory !== null && c.supCategory !== undefined));

            const teachersList: TeacherUser[] = (teacherRes.data || []).map((p: any) => ({
                user_id: p.user_id,
                name: p.name || "미지정 강사",
            }));
            setDbTeachers(teachersList);
            setAllStudents(studentsRes);
            setEnrolledStudentMap(studentMapRes);
        } catch (err) {
            console.error("Failed to load schedule items, common codes, teachers & students:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Dynamic Days List from Common Codes (DAY category)
    const daysList = useMemo(() => {
        if (dbDays.length > 0) {
            return dbDays.map((d) => ({
                key: d.codeValue as DayOfWeek,
                label: d.codeName,
                short: d.codeName.replace("요일", ""),
            }));
        }
        return DAYS_OF_WEEK;
    }, [dbDays]);

    // Lookup mappings for UI rendering
    const teacherMap = useMemo(() => {
        const map: Record<string, string> = {};
        dbTeachers.forEach((t) => {
            map[t.user_id] = t.name;
        });
        return map;
    }, [dbTeachers]);

    const roomMap = useMemo(() => {
        const map: Record<string, string> = {};
        dbRooms.forEach((r) => {
            map[r.codeValue] = r.codeName;
        });
        return map;
    }, [dbRooms]);

    const gradeMap = useMemo(() => {
        const map: Record<string, string> = {};
        dbGrades.forEach((g) => {
            map[g.codeValue] = g.codeName;
        });
        return map;
    }, [dbGrades]);

    const studentMap = useMemo(() => {
        const map: Record<string, StudentProfile> = {};
        allStudents.forEach((s) => {
            map[s.user_id] = s;
        });
        return map;
    }, [allStudents]);

    // 강사 필터 드롭다운 옵션 목록 생성
    const instructorFilterOptions = useMemo(() => {
        const set = new Set<string>();
        dbTeachers.forEach((t) => set.add(t.user_id));
        items.forEach((i) => {
            if (i.instructor_id) set.add(i.instructor_id);
        });
        return Array.from(set);
    }, [items, dbTeachers]);

    const roomFilterOptions = useMemo(() => {
        const set = new Set<string>();
        dbRooms.forEach((r) => set.add(r.codeValue));
        items.forEach((i) => {
            if (i.room) set.add(i.room);
        });
        return Array.from(set);
    }, [items, dbRooms]);

    const gradeFilterOptions = useMemo(() => {
        const set = new Set<string>();
        dbGrades.forEach((g) => set.add(g.codeValue));
        items.forEach((i) => {
            if (i.targetGrade) set.add(i.targetGrade);
        });
        return Array.from(set);
    }, [items, dbGrades]);

    // 필터 조건에 맞는 시간표 아이템 필터링
    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            if (filterInstructor !== "all" && item.instructor_id !== filterInstructor) return false;
            if (filterRoom !== "all" && item.room !== filterRoom) return false;
            if (filterGrade !== "all" && item.targetGrade !== filterGrade) return false;
            return true;
        });
    }, [items, filterInstructor, filterRoom, filterGrade]);

    // 학생 검색 필터링
    const filteredStudents = useMemo(() => {
        if (!studentSearchQuery.trim()) return allStudents;
        const q = studentSearchQuery.trim().toLowerCase();
        return allStudents.filter((s) => {
            const nameMatch = s.name.toLowerCase().includes(q);
            const gradeName = s.grade ? (gradeMap[s.grade] || s.grade) : "";
            const gradeMatch = gradeName.toLowerCase().includes(q);
            return nameMatch || gradeMatch;
        });
    }, [allStudents, studentSearchQuery, gradeMap]);

    // Open Modal for New Schedule
    const handleOpenCreate = (day: DayOfWeek = "mon", startTime: string = "09:00") => {
        setEditingItem(null);
        setFormTitle("");
        setFormInstructor(dbTeachers[0]?.user_id || "");
        setFormRoom(dbRooms[0]?.codeValue || "");
        setFormTargetGrade(dbGrades[0]?.codeValue || "");
        setFormDayOfWeek(day);
        setFormStartTime(startTime);

        const startMin = timeToMinutes(startTime);
        const endMin = Math.min(startMin + 120, 24 * 60);
        setFormEndTime(minutesToTime(endMin));
        setFormColor(COLOR_PALETTE[0].value);
        setFormDescription("");
        setFormError(null);
        setActiveTab("info");
        setEnrolledIds(new Set());
        setStudentSearchQuery("");
        setIsDialogOpen(true);
    };

    // Open Modal for Edit
    const handleOpenEdit = async (item: ScheduleItem, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingItem(item);
        setFormTitle(item.title);

        setFormInstructor(item.instructor_id || dbTeachers[0]?.user_id || "");
        setFormRoom(item.room || dbRooms[0]?.codeValue || "");
        setFormTargetGrade(item.targetGrade || dbGrades[0]?.codeValue || "");
        setFormDayOfWeek(item.dayOfWeek || "mon");
        setFormStartTime(item.startTime || "09:00");
        setFormEndTime(item.endTime || "10:00");
        setFormColor(item.color || "#3b82f6");
        setFormDescription(item.description || "");
        setFormError(null);
        setActiveTab("info");
        setStudentSearchQuery("");
        setIsDialogOpen(true);

        // 해당 시간표 수강생 로드
        setLoadingStudents(true);
        try {
            const ids = await fetchEnrolledStudentIds(item.id);
            setEnrolledIds(new Set(ids));
        } catch (err) {
            console.error("Failed to load enrolled students:", err);
        } finally {
            setLoadingStudents(false);
        }
    };

    // 학생 선택 toggle
    const handleToggleStudent = (userId: string) => {
        setEnrolledIds((prev) => {
            const next = new Set(prev);
            if (next.has(userId)) {
                next.delete(userId);
            } else {
                next.add(userId);
            }
            return next;
        });
    };

    // 전체 학생 선택/해제
    const handleSelectAllStudents = () => {
        if (enrolledIds.size === filteredStudents.length && filteredStudents.length > 0) {
            setEnrolledIds(new Set());
        } else {
            const newSet = new Set(enrolledIds);
            filteredStudents.forEach((s) => newSet.add(s.user_id));
            setEnrolledIds(newSet);
        }
    };

    // Save item & sync enrolled students
    const handleSave = async () => {
        setFormError(null);
        if (!formTitle.trim()) {
            setFormError("수업명을 입력해 주세요.");
            setActiveTab("info");
            return;
        }
        if (!formInstructor) {
            setFormError("담당 강사를 선택해 주세요.");
            setActiveTab("info");
            return;
        }

        const startMin = timeToMinutes(formStartTime);
        const endMin = timeToMinutes(formEndTime);

        if (endMin <= startMin) {
            setFormError("종료 시간은 시작 시간보다 이후여야 합니다.");
            setActiveTab("info");
            return;
        }

        const scheduleId = editingItem ? editingItem.id : `sched-${Date.now()}`;

        const newItem: ScheduleItem = {
            id: scheduleId,
            title: formTitle.trim(),
            instructor_id: formInstructor,
            room: formRoom,
            targetGrade: formTargetGrade,
            dayOfWeek: formDayOfWeek,
            startTime: formStartTime,
            endTime: formEndTime,
            color: formColor,
            description: formDescription.trim(),
            createdAt: editingItem?.createdAt || new Date().toISOString(),
        };

        setSavingStudents(true);
        try {
            // 1. 시간표 정보 저장
            const updated = await saveScheduleItem(newItem);
            setItems(updated);

            // 2. 수강생 정보 동기화 저장
            const studentIdList = Array.from(enrolledIds);
            await syncScheduleStudents(scheduleId, studentIdList);

            // 3. 로컬 수강생 맵 상태 갱신
            setEnrolledStudentMap((prev) => ({
                ...prev,
                [scheduleId]: studentIdList,
            }));

            setIsDialogOpen(false);
            toast.success(editingItem ? "수업 정보 및 수강생이 수정되었습니다." : "새 수업 및 수강생이 등록되었습니다.");
        } catch (err: any) {
            console.error("Failed to save schedule:", err);
            const errMsg = err?.message || "시간표 및 수강생 저장 중 오류가 발생했습니다.";
            setFormError(errMsg);
            toast.error(errMsg);
        } finally {
            setSavingStudents(false);
        }
    };

    // Delete item
    const handleDelete = async () => {
        if (!editingItem) return;
        if (!confirm(`'${editingItem.title}' 수업을 시간표에서 삭제하시겠습니까?`)) return;

        try {
            const updated = await deleteScheduleItem(editingItem.id);
            setItems(updated);
            // 수강생 정보도 삭제 동기화
            await syncScheduleStudents(editingItem.id, []);
            setEnrolledStudentMap((prev) => {
                const copy = { ...prev };
                delete copy[editingItem.id];
                return copy;
            });
            setIsDialogOpen(false);
            toast.success("수업이 삭제되었습니다.");
        } catch (err) {
            console.error("Failed to delete schedule:", err);
            toast.error("삭제 처리 중 오류가 발생했습니다.");
        }
    };

    // Print handle
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Clock className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                        학원 주간 시간표 관리
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        월요일부터 일요일까지 오전 09:00 ~ 24:00 (30분 단위) 수업 일정 및 수강 학생을 관리합니다.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2">
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        새로고침
                    </Button>

                    <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                        <Printer className="w-4 h-4" />
                        인쇄 / PDF 저장
                    </Button>

                    <Button size="sm" onClick={() => handleOpenCreate("mon", "09:00")} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="w-4 h-4" />
                        수업 추가
                    </Button>
                </div>
            </div>

            {/* Filter controls */}
            <Card className="shadow-sm print:hidden">
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            <Filter className="w-4 h-4 text-blue-500" />
                            필터 검색:
                        </div>

                        {/* Instructor Filter */}
                        <div className="w-40">
                            <Select value={filterInstructor} onValueChange={setFilterInstructor}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="담당 강사" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">전체 강사</SelectItem>
                                    {instructorFilterOptions.map((userId) => (
                                        <SelectItem key={userId} value={userId}>
                                            {teacherMap[userId] || userId}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Room Filter */}
                        <div className="w-36">
                            <Select value={filterRoom} onValueChange={setFilterRoom}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="강의실" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">전체 강의실</SelectItem>
                                    {roomFilterOptions.map((val) => (
                                        <SelectItem key={val} value={val}>
                                            {roomMap[val] || val}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Grade Filter */}
                        <div className="w-36">
                            <Select value={filterGrade} onValueChange={setFilterGrade}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="수강 대상" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">전체 대상</SelectItem>
                                    {gradeFilterOptions.map((val) => (
                                        <SelectItem key={val} value={val}>
                                            {gradeMap[val] || val}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {(filterInstructor !== "all" || filterRoom !== "all" || filterGrade !== "all") && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setFilterInstructor("all");
                                    setFilterRoom("all");
                                    setFilterGrade("all");
                                }}
                                className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                            >
                                필터 초기화
                            </Button>
                        )}
                    </div>

                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        총 <span className="font-semibold text-blue-600 dark:text-blue-400">{filteredItems.length}</span>개 수업 표시 중
                    </div>
                </CardContent>
            </Card>

            {/* Print Header */}
            <div className="hidden print:block mb-6">
                <h1 className="text-2xl font-bold text-center">JOKIM 수학까페학원 - 주간 시간표</h1>
                <p className="text-xs text-center text-zinc-500 mt-1">
                    운영 시간: 오전 09:00 ~ 24:00 (월요일 ~ 일요일)
                </p>
            </div>

            {/* Timetable Grid Container */}
            <Card className="shadow-md border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="min-w-[900px] relative select-none">
                        {/* Days Header */}
                        <div className="grid grid-cols-8 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 sticky top-0 z-20">
                            <div className="p-3 text-center text-xs font-bold text-zinc-500 border-r border-zinc-200 dark:border-zinc-800">
                                시간 / 요일
                            </div>
                            {daysList.map((day) => {
                                const dayCount = filteredItems.filter((i) => i.dayOfWeek === day.key).length;
                                const isWeekend = day.key === "sat" || day.key === "sun";
                                return (
                                    <div
                                        key={day.key}
                                        className={`p-3 text-center border-r border-zinc-200 dark:border-zinc-800 last:border-r-0 ${
                                            isWeekend ? "bg-amber-50/40 dark:bg-amber-950/10" : ""
                                        }`}
                                    >
                                        <div className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
                                            {day.label}
                                        </div>
                                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                            ({dayCount}개 수업)
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Grid Rows Container */}
                        <div className="relative">
                            {timeSlots.map((slot) => {
                                const isHour = slot.endsWith(":00");
                                return (
                                    <div
                                        key={slot}
                                        className={`grid grid-cols-8 border-b ${
                                            isHour
                                                ? "border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/40"
                                                : "border-zinc-100 dark:border-zinc-850"
                                        }`}
                                        style={{ height: `${SLOT_HEIGHT}px` }}
                                    >
                                        <div className="flex items-center justify-center border-r border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-500 bg-zinc-50 dark:bg-zinc-900">
                                            {slot}
                                        </div>

                                        {daysList.map((day) => (
                                            <div
                                                key={`${day.key}-${slot}`}
                                                onClick={() => handleOpenCreate(day.key, slot)}
                                                className="border-r border-zinc-200 dark:border-zinc-800 last:border-r-0 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 cursor-pointer transition-colors"
                                                title={`${day.label} ${slot} 수업 추가`}
                                            />
                                        ))}
                                    </div>
                                );
                            })}

                            {/* Schedule Items Absolute Overlay Layer */}
                            <div className="absolute top-0 left-0 w-full h-full pointer-events-none grid grid-cols-8">
                                <div />

                                {daysList.map((day) => {
                                    const dayItems = filteredItems.filter((i) => i.dayOfWeek === day.key);
                                    return (
                                        <div key={day.key} className="relative w-full h-full border-r border-transparent">
                                            {dayItems.map((item) => {
                                                const startMin = timeToMinutes(item.startTime);
                                                const endMin = timeToMinutes(item.endTime);

                                                const topPx = ((startMin - START_HOUR_MINUTES) / 30) * SLOT_HEIGHT;
                                                const heightPx = Math.max(((endMin - startMin) / 30) * SLOT_HEIGHT - 2, SLOT_HEIGHT - 2);

                                                const displayInstructor = teacherMap[item.instructor_id] || "강사 미지정";
                                                const displayRoom = roomMap[item.room] || item.room || "강의실 미지정";
                                                const displayGrade = gradeMap[item.targetGrade] || item.targetGrade || "전체";

                                                // 등록된 수강생 정보 계산
                                                const enrolledStudentIds = enrolledStudentMap[item.id] || [];
                                                const studentCount = enrolledStudentIds.length;
                                                const studentNames = enrolledStudentIds
                                                    .map((sId) => studentMap[sId]?.name || "학생")
                                                    .join(", ");
                                                const tooltipTitle = `${item.title}\n강사: ${displayInstructor} | 강의실: ${displayRoom}\n수강생(${studentCount}명): ${studentNames || "없음"}`;

                                                return (
                                                    <div
                                                        key={item.id}
                                                        onClick={(e) => handleOpenEdit(item, e)}
                                                        title={tooltipTitle}
                                                        className="absolute left-1 right-1 rounded-md p-2 shadow-sm border text-white pointer-events-auto cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md hover:z-30 overflow-hidden flex flex-col justify-between"
                                                        style={{
                                                            top: `${topPx + 1}px`,
                                                            height: `${heightPx}px`,
                                                            backgroundColor: item.color || "#3b82f6",
                                                            borderColor: "rgba(0,0,0,0.15)",
                                                        }}
                                                    >
                                                        <div>
                                                            <div className="flex items-center justify-between gap-1">
                                                                <span className="font-bold text-xs leading-tight line-clamp-1">
                                                                    {item.title}
                                                                </span>
                                                                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-white/20 text-white border-0 font-medium shrink-0">
                                                                    {displayGrade}
                                                                </Badge>
                                                            </div>

                                                            <div className="text-[11px] opacity-90 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                                                <span className="flex items-center gap-0.5">
                                                                    <User className="w-3 h-3" />
                                                                    {displayInstructor}
                                                                </span>
                                                                <span className="flex items-center gap-0.5">
                                                                    <MapPin className="w-3 h-3" />
                                                                    {displayRoom}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* 수강생 인원 표시 뱃지 */}
                                                        {heightPx >= 50 && (
                                                            <div className="text-[10px] font-medium opacity-90 mt-1 flex items-center justify-between pt-1 border-t border-white/20">
                                                                <span className="flex items-center gap-1 bg-black/20 px-1.5 py-0.5 rounded text-[10px]">
                                                                    <Users className="w-3 h-3" />
                                                                    {studentCount}명 수강
                                                                </span>
                                                                <span className="opacity-80">{item.startTime} ~ {item.endTime}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Create / Edit Dialog with Tabs */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[580px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            <CalendarIcon className="w-5 h-5 text-blue-600" />
                            {editingItem ? "수업 정보 및 수강생 수정" : "새 수업 등록"}
                        </DialogTitle>
                        <DialogDescription>
                            수업 정보와 등록 수강생 목록을 관리할 수 있습니다.
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="info" className="flex items-center gap-2 text-xs font-semibold">
                                <CalendarIcon className="w-3.5 h-3.5" />
                                수업 정보
                            </TabsTrigger>
                            <TabsTrigger value="students" className="flex items-center gap-2 text-xs font-semibold">
                                <Users className="w-3.5 h-3.5" />
                                수강생 관리 ({enrolledIds.size}명)
                            </TabsTrigger>
                        </TabsList>

                        {/* TAB 1: 수업 정보 */}
                        <TabsContent value="info" className="space-y-4 py-2 mt-2">
                            {formError && (
                                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-700 dark:text-red-300 text-xs rounded-md flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    {formError}
                                </div>
                            )}

                            {/* Title */}
                            <div className="space-y-1.5">
                                <Label htmlFor="title" className="text-xs font-semibold">
                                    수업명 <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="title"
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    placeholder="예: 고1 수학 개념완성반"
                                    className="h-9 text-sm"
                                />
                            </div>

                            {/* Instructor & Room */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="instructor" className="text-xs font-semibold">
                                        담당 강사 선택 <span className="text-red-500">*</span>
                                    </Label>
                                    <Select value={formInstructor} onValueChange={setFormInstructor}>
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue placeholder="담당 강사 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {dbTeachers.map((t) => (
                                                <SelectItem key={t.user_id} value={t.user_id}>
                                                    {t.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="room" className="text-xs font-semibold">
                                        강의실
                                    </Label>
                                    <Select value={formRoom} onValueChange={setFormRoom}>
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue placeholder="강의실 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {dbRooms.map((r) => (
                                                <SelectItem key={r.id} value={r.codeValue}>
                                                    {r.codeName} {r.description ? `(${r.description})` : ""}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Target Grade & Day */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="targetGrade" className="text-xs font-semibold">
                                        수강 대상
                                    </Label>
                                    <Select value={formTargetGrade} onValueChange={setFormTargetGrade}>
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue placeholder="수강 대상 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {dbGrades.map((g) => (
                                                <SelectItem key={g.id} value={g.codeValue}>
                                                    {g.codeName} {g.description ? `(${g.description})` : ""}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">요일 선택</Label>
                                    <Select value={formDayOfWeek} onValueChange={(val) => setFormDayOfWeek(val as DayOfWeek)}>
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue placeholder="요일 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {daysList.map((d) => (
                                                <SelectItem key={d.key} value={d.key}>
                                                    {d.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Start Time & End Time */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">시작 시간 (30분 단위)</Label>
                                    <Select value={formStartTime} onValueChange={setFormStartTime}>
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-52">
                                            {timeSlots.map((time) => (
                                                <SelectItem key={`start-${time}`} value={time}>
                                                    {time}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">종료 시간 (30분 단위)</Label>
                                    <Select value={formEndTime} onValueChange={setFormEndTime}>
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-52">
                                            {timeSlots.map((time) => (
                                                <SelectItem key={`end-${time}`} value={time}>
                                                    {time}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Color Selection */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">시간표 대표 색상</Label>
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                    {COLOR_PALETTE.map((c) => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => setFormColor(c.value)}
                                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${c.bg} ${
                                                formColor === c.value ? "ring-2 ring-offset-2 ring-zinc-900 dark:ring-white scale-110" : "opacity-80 hover:opacity-100"
                                            }`}
                                            title={c.label}
                                        >
                                            {formColor === c.value && <Check className="w-4 h-4 text-white" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <Label htmlFor="description" className="text-xs font-semibold">
                                    커리큘럼 및 수업 메모
                                </Label>
                                <Textarea
                                    id="description"
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    placeholder="수업 상세 내용 또는 전달 사항을 작성하세요."
                                    className="text-sm min-h-[60px] resize-none"
                                />
                            </div>
                        </TabsContent>

                        {/* TAB 2: 수강생 관리 */}
                        <TabsContent value="students" className="space-y-3 py-2 mt-2">
                            <div className="flex items-center justify-between gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                                    <Input
                                        placeholder="학생 이름 또는 학년 검색..."
                                        value={studentSearchQuery}
                                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                                        className="pl-9 h-9 text-xs"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSelectAllStudents}
                                    className="h-9 text-xs shrink-0"
                                >
                                    {enrolledIds.size === filteredStudents.length && filteredStudents.length > 0
                                        ? "전체 해제"
                                        : "전체 선택"}
                                </Button>
                            </div>

                            <div className="text-xs text-zinc-500 flex items-center justify-between px-1">
                                <span>선택된 수강생: <strong className="text-blue-600 font-semibold">{enrolledIds.size}명</strong> / 총 {allStudents.length}명</span>
                                {loadingStudents && (
                                    <span className="flex items-center gap-1 text-zinc-400">
                                        <Loader2 className="w-3 h-3 animate-spin" /> 수강생 목록 로딩 중...
                                    </span>
                                )}
                            </div>

                            <div className="border border-zinc-200 dark:border-zinc-800 rounded-md max-h-[280px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                                {filteredStudents.length === 0 ? (
                                    <div className="p-8 text-center text-xs text-zinc-400">
                                        {studentSearchQuery ? "검색 조건에 맞는 학생이 없습니다." : "등록된 학생 프로필이 없습니다."}
                                    </div>
                                ) : (
                                    filteredStudents.map((st) => {
                                        const isChecked = enrolledIds.has(st.user_id);
                                        const displayGrade = st.grade ? (gradeMap[st.grade] || st.grade) : "학년 미지정";
                                        return (
                                            <div
                                                key={st.user_id}
                                                onClick={() => handleToggleStudent(st.user_id)}
                                                className={`flex items-center justify-between p-2.5 text-xs cursor-pointer transition-colors ${
                                                    isChecked
                                                        ? "bg-blue-50/60 dark:bg-blue-950/30"
                                                        : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Checkbox
                                                        checked={isChecked}
                                                        onCheckedChange={() => handleToggleStudent(st.user_id)}
                                                    />
                                                    <div>
                                                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                                            {st.name}
                                                        </span>
                                                        {st.Email && (
                                                            <span className="text-[11px] text-zinc-400 ml-2">
                                                                ({st.Email})
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-normal">
                                                    {displayGrade}
                                                </Badge>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-2 border-t">
                        {editingItem ? (
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={handleDelete}
                                className="gap-1 text-xs"
                                disabled={savingStudents}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                삭제
                            </Button>
                        ) : (
                            <div />
                        )}

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsDialogOpen(false)}
                                disabled={savingStudents}
                            >
                                취소
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleSave}
                                disabled={savingStudents}
                                className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
                            >
                                {savingStudents && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                저장하기
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
