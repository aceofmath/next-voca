"use client";

import React, { useEffect, useState, useMemo } from "react";
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
import { fetchCommonCodes } from "@/lib/codeUtils";
import { CommonCode } from "@/lib/codeTypes";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
} from "lucide-react";

const SLOT_HEIGHT = 46; // height in px for each 30-min slot
const START_HOUR_MINUTES = 9 * 60; // 09:00 = 540 minutes

export default function AdminSchedulePage() {
    const [items, setItems] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [dbRooms, setDbRooms] = useState<CommonCode[]>([]);
    const [dbGrades, setDbGrades] = useState<CommonCode[]>([]);

    // Filters
    const [filterInstructor, setFilterInstructor] = useState<string>("all");
    const [filterRoom, setFilterRoom] = useState<string>("all");
    const [filterGrade, setFilterGrade] = useState<string>("all");

    // Dialog state
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
    const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);

    // Form inputs
    const [formTitle, setFormTitle] = useState<string>("");
    const [formInstructor, setFormInstructor] = useState<string>("");
    const [formRoom, setFormRoom] = useState<string>("");
    const [formTargetGrade, setFormTargetGrade] = useState<string>("");
    const [formDayOfWeek, setFormDayOfWeek] = useState<DayOfWeek>("mon");
    const [formStartTime, setFormStartTime] = useState<string>("10:00");
    const [formEndTime, setFormEndTime] = useState<string>("12:00");
    const [formColor, setFormColor] = useState<string>("#3b82f6");
    const [formDescription, setFormDescription] = useState<string>("");
    const [formError, setFormError] = useState<string | null>(null);

    const timeSlots = useMemo(() => generateTimeSlots(), []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [scheduleData, roomCodes, gradeCodes] = await Promise.all([
                fetchScheduleItems(),
                fetchCommonCodes("ROOM"),
                fetchCommonCodes("GRADE"),
            ]);
            setItems(scheduleData);
            setDbRooms(roomCodes.filter((c) => c.isUse));
            setDbGrades(gradeCodes.filter((c) => c.isUse));
        } catch (err) {
            console.error("Failed to load schedule items & common codes:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Unique lists for filter dropdowns
    const instructorOptions = useMemo(() => {
        const set = new Set(items.map((i) => i.instructor).filter(Boolean));
        return Array.from(set);
    }, [items]);

    const roomOptions = useMemo(() => {
        const set = new Set([...dbRooms.map((r) => r.codeName), ...items.map((i) => i.room)].filter(Boolean));
        return Array.from(set);
    }, [items, dbRooms]);

    const gradeOptions = useMemo(() => {
        const set = new Set([...dbGrades.map((g) => g.codeName), ...items.map((i) => i.targetGrade)].filter(Boolean));
        return Array.from(set);
    }, [items, dbGrades]);

    // Filtered items
    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            if (filterInstructor !== "all" && item.instructor !== filterInstructor) return false;
            if (filterRoom !== "all" && item.room !== filterRoom) return false;
            if (filterGrade !== "all" && item.targetGrade !== filterGrade) return false;
            return true;
        });
    }, [items, filterInstructor, filterRoom, filterGrade]);

    // Open Modal for New Schedule
    const handleOpenCreate = (day: DayOfWeek = "mon", startTime: string = "09:00") => {
        setEditingItem(null);
        setFormTitle("");
        setFormInstructor("");
        setFormRoom(dbRooms[0]?.codeName || "101호");
        setFormTargetGrade(dbGrades[0]?.codeName || "고1");
        setFormDayOfWeek(day);
        setFormStartTime(startTime);
        // Default end time + 1 hr
        const startMin = timeToMinutes(startTime);
        const endMin = Math.min(startMin + 120, 24 * 60);
        setFormEndTime(minutesToTime(endMin));
        setFormColor(COLOR_PALETTE[0].value);
        setFormDescription("");
        setFormError(null);
        setIsDialogOpen(true);
    };

    // Open Modal for Edit
    const handleOpenEdit = (item: ScheduleItem, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingItem(item);
        setFormTitle(item.title);
        setFormInstructor(item.instructor);
        setFormRoom(item.room);
        setFormTargetGrade(item.targetGrade);
        setFormDayOfWeek(item.dayOfWeek);
        setFormStartTime(item.startTime);
        setFormEndTime(item.endTime);
        setFormColor(item.color || "#3b82f6");
        setFormDescription(item.description || "");
        setFormError(null);
        setIsDialogOpen(true);
    };

    // Save item
    const handleSave = async () => {
        if (!formTitle.trim()) {
            setFormError("수업명을 입력해 주세요.");
            return;
        }
        if (!formInstructor.trim()) {
            setFormError("담당 강사명을 입력해 주세요.");
            return;
        }

        const startMin = timeToMinutes(formStartTime);
        const endMin = timeToMinutes(formEndTime);

        if (endMin <= startMin) {
            setFormError("종료 시간은 시작 시간보다 이후여야 합니다.");
            return;
        }

        const newItem: ScheduleItem = {
            id: editingItem ? editingItem.id : `sched-${Date.now()}`,
            title: formTitle.trim(),
            instructor: formInstructor.trim(),
            room: formRoom.trim() || "강의실 미지정",
            targetGrade: formTargetGrade.trim() || "전체",
            dayOfWeek: formDayOfWeek,
            startTime: formStartTime,
            endTime: formEndTime,
            color: formColor,
            description: formDescription.trim(),
            createdAt: editingItem?.createdAt || new Date().toISOString(),
        };

        try {
            const updated = await saveScheduleItem(newItem);
            setItems(updated);
            setIsDialogOpen(false);
        } catch (err) {
            console.error("Failed to save schedule:", err);
            setFormError("시간표 저장에 실패했습니다.");
        }
    };

    // Delete item
    const handleDelete = async () => {
        if (!editingItem) return;
        if (!confirm(`'${editingItem.title}' 수업을 시간표에서 삭제하시겠습니까?`)) return;

        try {
            const updated = await deleteScheduleItem(editingItem.id);
            setItems(updated);
            setIsDialogOpen(false);
        } catch (err) {
            console.error("Failed to delete schedule:", err);
            alert("삭제 처리 중 오류가 발생했습니다.");
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
                        월요일부터 일요일까지 오전 09:00 ~ 24:00 (30분 단위) 수업 일정 및 강좌를 관리합니다.
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
                                    {instructorOptions.map((ins) => (
                                        <SelectItem key={ins} value={ins}>
                                            {ins}
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
                                    {roomOptions.map((r) => (
                                        <SelectItem key={r} value={r}>
                                            {r}
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
                                    {gradeOptions.map((g) => (
                                        <SelectItem key={g} value={g}>
                                            {g}
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

            {/* Print Header (Visible only when printing) */}
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
                            {/* Time Column Header */}
                            <div className="p-3 text-center text-xs font-bold text-zinc-500 border-r border-zinc-200 dark:border-zinc-800">
                                시간 / 요일
                            </div>
                            {/* Mon ~ Sun Headers */}
                            {DAYS_OF_WEEK.map((day) => {
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
                            {/* Background Time Slots Rows */}
                            {timeSlots.map((slot, index) => {
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
                                        {/* Time Label */}
                                        <div className="flex items-center justify-center border-r border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-500 bg-zinc-50 dark:bg-zinc-900">
                                            {slot}
                                        </div>

                                        {/* Blank Clickable Cells for Mon~Sun */}
                                        {DAYS_OF_WEEK.map((day) => (
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
                                {/* Left Empty Column (for Time Labels alignment) */}
                                <div />

                                {/* 7 Day Columns */}
                                {DAYS_OF_WEEK.map((day) => {
                                    const dayItems = filteredItems.filter((i) => i.dayOfWeek === day.key);
                                    return (
                                        <div key={day.key} className="relative w-full h-full border-r border-transparent">
                                            {dayItems.map((item) => {
                                                const startMin = timeToMinutes(item.startTime);
                                                const endMin = timeToMinutes(item.endTime);

                                                // Top position & Height calculation
                                                const topPx = ((startMin - START_HOUR_MINUTES) / 30) * SLOT_HEIGHT;
                                                const heightPx = Math.max(((endMin - startMin) / 30) * SLOT_HEIGHT - 2, SLOT_HEIGHT - 2);

                                                return (
                                                    <div
                                                        key={item.id}
                                                        onClick={(e) => handleOpenEdit(item, e)}
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
                                                                    {item.targetGrade}
                                                                </Badge>
                                                            </div>

                                                            <div className="text-[11px] opacity-90 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                                                <span className="flex items-center gap-0.5">
                                                                    <User className="w-3 h-3" />
                                                                    {item.instructor}
                                                                </span>
                                                                <span className="flex items-center gap-0.5">
                                                                    <MapPin className="w-3 h-3" />
                                                                    {item.room}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {heightPx >= 60 && (
                                                            <div className="text-[10px] opacity-80 mt-1 pt-1 border-t border-white/20 flex items-center justify-between">
                                                                <span>{item.startTime} ~ {item.endTime}</span>
                                                                <Edit3 className="w-3 h-3 opacity-70" />
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

            {/* Create / Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[540px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            <CalendarIcon className="w-5 h-5 text-blue-600" />
                            {editingItem ? "수업 정보 수정" : "새 수업 등록"}
                        </DialogTitle>
                        <DialogDescription>
                            시간표에 등록할 수업 정보 및 요일, 시간을 입력해 주세요.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
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
                                    담당 강사 <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="instructor"
                                    value={formInstructor}
                                    onChange={(e) => setFormInstructor(e.target.value)}
                                    placeholder="예: 김수학 원장"
                                    className="h-9 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="room" className="text-xs font-semibold">
                                    강의실 선택 (공통코드)
                                </Label>
                                <Select value={formRoom} onValueChange={setFormRoom}>
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder="강의실 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {dbRooms.map((r) => (
                                            <SelectItem key={r.id} value={r.codeName}>
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
                                    수강 대상 선택 (공통코드)
                                </Label>
                                <Select value={formTargetGrade} onValueChange={setFormTargetGrade}>
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder="수강 대상 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {dbGrades.map((g) => (
                                            <SelectItem key={g.id} value={g.codeName}>
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
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DAYS_OF_WEEK.map((d) => (
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
                                className="text-sm min-h-[70px] resize-none"
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-2 border-t">
                        {editingItem ? (
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={handleDelete}
                                className="gap-1 text-xs"
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
                            >
                                취소
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleSave}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                저장하기
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
