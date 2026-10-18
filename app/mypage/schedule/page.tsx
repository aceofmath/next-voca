"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import {
    ScheduleItem,
    DayOfWeek,
    DAYS_OF_WEEK,
    generateTimeSlots,
    timeToMinutes,
    minutesToTime,
} from "@/lib/scheduleTypes";
import { fetchScheduleItems } from "@/lib/scheduleUtils";
import {
    fetchAllStudentProfiles,
    fetchAllScheduleStudentsMap,
    fetchEnrolledStudentIds,
    StudentProfile,
    ScheduleStudentMap,
} from "@/lib/scheduleStudentUtils";
import { fetchCommonCodes } from "@/lib/codeUtils";
import { CommonCode } from "@/lib/codeTypes";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
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
    User,
    MapPin,
    GraduationCap,
    BookOpen,
    Users,
    Search,
    Loader2,
    Calendar as CalendarIcon,
    CheckCircle2,
    LayoutGrid,
    List,
    ChevronRight,
    Sparkles,
    AlertCircle,
} from "lucide-react";

interface TeacherProfile {
    user_id: string;
    name: string;
}

const SLOT_HEIGHT = 46;
const START_HOUR_MINUTES = 9 * 60;

export default function MySchedulePage() {
    const { user, loading: authLoading } = useAuth();

    const [userGrade, setUserGrade] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>("");
    const [fetchingGrade, setFetchingGrade] = useState<boolean>(true);

    const [allScheduleItems, setAllScheduleItems] = useState<ScheduleItem[]>([]);
    const [studentMap, setStudentMap] = useState<ScheduleStudentMap>({});
    const [allStudents, setAllStudents] = useState<StudentProfile[]>([]);
    const [teachers, setTeachers] = useState<TeacherProfile[]>([]);

    const [dbRooms, setDbRooms] = useState<CommonCode[]>([]);
    const [dbGrades, setDbGrades] = useState<CommonCode[]>([]);
    const [dbDays, setDbDays] = useState<CommonCode[]>([]);

    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [viewMode, setViewMode] = useState<"card" | "timetable">("card");

    // Filter states
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [selectedDayFilter, setSelectedDayFilter] = useState<string>("all");

    // Modal state for viewing student list (For Teachers)
    const [selectedCourseForStudents, setSelectedCourseForStudents] = useState<ScheduleItem | null>(null);
    const [enrolledStudentList, setEnrolledStudentList] = useState<StudentProfile[]>([]);
    const [loadingStudentsModal, setLoadingStudentsModal] = useState<boolean>(false);

    // 1. Fetch current user profile & grade
    useEffect(() => {
        async function fetchUserProfile() {
            if (!user) {
                setFetchingGrade(false);
                return;
            }
            try {
                const { data, error } = await supabase
                    .from("profile")
                    .select("name, grade")
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (!error && data) {
                    setUserGrade(data.grade || "S");
                    setUserName(data.name || user.email?.split("@")[0] || "사용자");
                } else {
                    setUserGrade("S"); // fallback to Student
                }
            } catch (err) {
                console.error("Failed to fetch user grade:", err);
                setUserGrade("S");
            } finally {
                setFetchingGrade(false);
            }
        }
        fetchUserProfile();
    }, [user]);

    // 2. Load all schedule data
    const loadScheduleData = useCallback(async () => {
        setLoadingData(true);
        try {
            const [
                scheduleData,
                mapData,
                studentsData,
                roomCodes,
                gradeCodes,
                dayCodes,
                teacherRes,
            ] = await Promise.all([
                fetchScheduleItems(),
                fetchAllScheduleStudentsMap(),
                fetchAllStudentProfiles(),
                fetchCommonCodes("ROOM"),
                fetchCommonCodes("GRADE"),
                fetchCommonCodes("DAY"),
                supabase.from("profile").select("user_id, name").eq("grade", "T").order("name"),
            ]);

            setAllScheduleItems(scheduleData);
            setStudentMap(mapData);
            setAllStudents(studentsData);
            setDbRooms(roomCodes.filter((c) => c.isUse && c.supCategory !== null && c.supCategory !== undefined));
            setDbGrades(gradeCodes.filter((c) => c.isUse && c.supCategory !== null && c.supCategory !== undefined));
            setDbDays(dayCodes.filter((c) => c.isUse && c.supCategory !== null && c.supCategory !== undefined));

            if (teacherRes.data) {
                setTeachers(teacherRes.data.map((t: any) => ({ user_id: t.user_id, name: t.name || "강사" })));
            }
        } catch (err) {
            console.error("Error loading schedule data:", err);
        } finally {
            setLoadingData(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            loadScheduleData();
        }
    }, [user, loadScheduleData]);

    // Lookup Maps
    const teacherMap = useMemo(() => {
        const map: Record<string, string> = {};
        teachers.forEach((t) => (map[t.user_id] = t.name));
        return map;
    }, [teachers]);

    const roomMap = useMemo(() => {
        const map: Record<string, string> = {};
        dbRooms.forEach((r) => (map[r.codeValue] = r.codeName));
        return map;
    }, [dbRooms]);

    const gradeMap = useMemo(() => {
        const map: Record<string, string> = {};
        dbGrades.forEach((g) => (map[g.codeValue] = g.codeName));
        return map;
    }, [dbGrades]);

    const dayMap = useMemo(() => {
        const map: Record<string, string> = {};
        dbDays.forEach((d) => (map[d.codeValue] = d.codeName));
        return map;
    }, [dbDays]);

    const studentProfileMap = useMemo(() => {
        const map: Record<string, StudentProfile> = {};
        allStudents.forEach((s) => (map[s.user_id] = s));
        return map;
    }, [allStudents]);

    // 3. Filter My Schedule Items based on Role (Student 'S' vs Teacher 'T')
    const myScheduleItems = useMemo(() => {
        if (!user) return [];

        if (userGrade === "T") {
            // Teacher: Classes where instructor_id === user.id
            return allScheduleItems.filter((item) => item.instructor_id === user.id);
        } else {
            // Student: Classes where user.id is in studentMap[item.id]
            return allScheduleItems.filter((item) => {
                const enrolledStudentIds = studentMap[item.id] || [];
                return enrolledStudentIds.includes(user.id);
            });
        }
    }, [user, userGrade, allScheduleItems, studentMap]);

    // 4. Apply User UI Filters (Search & Day)
    const filteredMyScheduleItems = useMemo(() => {
        return myScheduleItems.filter((item) => {
            if (selectedDayFilter !== "all" && item.dayOfWeek !== selectedDayFilter) {
                return false;
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const titleMatch = item.title.toLowerCase().includes(q);
                const teacherMatch = (teacherMap[item.instructor_id] || "").toLowerCase().includes(q);
                const roomMatch = (roomMap[item.room] || item.room || "").toLowerCase().includes(q);
                return titleMatch || teacherMatch || roomMatch;
            }
            return true;
        });
    }, [myScheduleItems, selectedDayFilter, searchQuery, teacherMap, roomMap]);

    // Helper to open student list modal for teachers
    const handleOpenStudentsModal = async (course: ScheduleItem) => {
        setSelectedCourseForStudents(course);
        setLoadingStudentsModal(true);
        try {
            const studentIds = await fetchEnrolledStudentIds(course.id);
            const profiles = studentIds.map((id) => studentProfileMap[id] || { user_id: id, name: "학생" });
            setEnrolledStudentList(profiles);
        } catch (err) {
            console.error("Failed to load enrolled students:", err);
        } finally {
            setLoadingStudentsModal(false);
        }
    };

    const daysList = useMemo(() => {
        if (dbDays.length > 0) {
            return dbDays.map((d) => ({
                key: d.codeValue as DayOfWeek,
                label: d.codeName,
            }));
        }
        return DAYS_OF_WEEK;
    }, [dbDays]);

    const timeSlots = useMemo(() => generateTimeSlots(), []);

    if (authLoading || fetchingGrade || loadingData) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 w-full">
                <Loader2 className="h-10 w-10 animate-spin mb-4" />
                <p className="text-sm font-medium animate-pulse">나의시간표 정보를 불러오는 중입니다...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-12 text-center shadow-sm w-full">
                <User className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                <h2 className="text-lg font-semibold mb-2">로그인이 필요합니다</h2>
                <p className="text-sm text-muted-foreground">나의시간표를 확인하려면 먼저 로그인해 주세요.</p>
            </div>
        );
    }

    const isTeacher = userGrade === "T";

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-purple-950 via-zinc-900 to-zinc-950 p-6 text-white shadow-sm">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-purple-500/20 text-purple-200 border-purple-400/30 text-xs">
                                {isTeacher ? "선생님 모드" : "수강생 모드"}
                            </Badge>
                            <span className="text-xs text-zinc-300">| {userName}님의 시간표</span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                            {isTeacher ? "👨‍🏫 담당 수업 주간 시간표" : "🎓 수강 중인 강의시간표"}
                        </h2>
                        <p className="text-xs text-zinc-300 mt-1">
                            {isTeacher
                                ? "선생님께서 담당하고 계신 학원 수업 및 수강 등록된 학생 목록을 관리하세요."
                                : "등록된 수강 과목의 강의실, 수업 시간 및 선생님 정보를 한눈에 확인하세요."}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 bg-white/10 p-1 rounded-lg">
                        <Button
                            variant={viewMode === "card" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("card")}
                            className="h-8 text-xs gap-1.5"
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            {isTeacher ? "프로젝트 리스트 뷰" : "코스 카드 뷰"}
                        </Button>
                        <Button
                            variant={viewMode === "timetable" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("timetable")}
                            className="h-8 text-xs gap-1.5"
                        >
                            <List className="w-3.5 h-3.5" />
                            주간 타임테이블
                        </Button>
                    </div>
                </div>
            </div>

            {/* Filter Section */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="수업명, 강의실 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 text-xs"
                        />
                    </div>
                    {searchQuery && (
                        <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="h-9 text-xs">
                            초기화
                        </Button>
                    )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <Select value={selectedDayFilter} onValueChange={setSelectedDayFilter}>
                        <SelectTrigger className="w-36 h-9 text-xs">
                            <SelectValue placeholder="요일 선택" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">전체 요일</SelectItem>
                            {daysList.map((d) => (
                                <SelectItem key={d.key} value={d.key}>
                                    {d.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                        총 <strong className="text-foreground">{filteredMyScheduleItems.length}</strong>개 수업
                    </div>
                </div>
            </div>

            {/* CONTENT VIEW 1: CARD VIEW */}
            {viewMode === "card" && (
                <>
                    {filteredMyScheduleItems.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-12 text-center">
                            <BookOpen className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
                            <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                                {isTeacher ? "담당 중인 수업이 없습니다" : "수강 중인 수업이 없습니다"}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                {isTeacher
                                    ? "시간표 관리자 페이지에서 선생님을 담당 강사로 지정해 주세요."
                                    : "학원에 등록된 수강 수업이 존재하지 않거나 할당되지 않았습니다."}
                            </p>
                        </div>
                    ) : isTeacher ? (
                        /* TEACHER ROLE: Project List UI Style (shadcnuikit.com/dashboard/project-list) */
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                {filteredMyScheduleItems.map((item) => {
                                    const enrolledIds = studentMap[item.id] || [];
                                    const roomName = roomMap[item.room] || item.room || "강의실 미지정";
                                    const gradeName = gradeMap[item.targetGrade] || item.targetGrade || "전체 학년";
                                    const dayName = dayMap[item.dayOfWeek] || item.dayOfWeek;

                                    return (
                                        <Card
                                            key={item.id}
                                            className="border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all overflow-hidden shadow-sm"
                                        >
                                            <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4" style={{ borderLeftColor: item.color || "#3b82f6" }}>
                                                {/* Left Info */}
                                                <div className="space-y-2 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 border-zinc-300 dark:border-zinc-700">
                                                            {dayName}
                                                        </Badge>
                                                        <Badge className="bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-200 text-xs">
                                                            {gradeName}
                                                        </Badge>
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {item.startTime} ~ {item.endTime}
                                                        </span>
                                                    </div>

                                                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                                        {item.title}
                                                    </h3>

                                                    {item.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-1">
                                                            {item.description}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Center Room & Student Stat */}
                                                <div className="flex items-center gap-6 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                                                            <MapPin className="w-4 h-4 text-blue-500" />
                                                        </div>
                                                        <div>
                                                            <span className="text-[11px] text-muted-foreground block">강의실</span>
                                                            <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">{roomName}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40">
                                                            <Users className="w-4 h-4 text-purple-500" />
                                                        </div>
                                                        <div>
                                                            <span className="text-[11px] text-muted-foreground block">수강 인원</span>
                                                            <span className="font-semibold text-xs text-purple-600 dark:text-purple-400">{enrolledIds.length}명</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right Action Button */}
                                                <div className="flex items-center justify-end">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleOpenStudentsModal(item)}
                                                        className="text-xs gap-1.5 h-9"
                                                    >
                                                        <Users className="w-3.5 h-3.5 text-zinc-500" />
                                                        수강생 명단 보기
                                                        <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        /* STUDENT ROLE: Courses Dashboard UI Style (shadcnuikit.com/dashboard/apps/courses) */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredMyScheduleItems.map((item) => {
                                const teacherName = teacherMap[item.instructor_id] || "선생님 미지정";
                                const roomName = roomMap[item.room] || item.room || "강의실 미지정";
                                const gradeName = gradeMap[item.targetGrade] || item.targetGrade || "전체";
                                const dayName = dayMap[item.dayOfWeek] || item.dayOfWeek;

                                return (
                                    <Card
                                        key={item.id}
                                        className="border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between overflow-hidden group shadow-sm hover:shadow-md"
                                    >
                                        <div className="h-2 w-full" style={{ backgroundColor: item.color || "#3b82f6" }} />

                                        <CardHeader className="pb-3 pt-4">
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <Badge className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 text-[11px] font-semibold">
                                                    {dayName} 수강
                                                </Badge>
                                                <Badge variant="outline" className="text-[10px] text-zinc-500">
                                                    {gradeName}
                                                </Badge>
                                            </div>
                                            <CardTitle className="text-lg font-bold group-hover:text-blue-600 transition-colors">
                                                {item.title}
                                            </CardTitle>
                                            {item.description && (
                                                <CardDescription className="text-xs line-clamp-2 mt-1">
                                                    {item.description}
                                                </CardDescription>
                                            )}
                                        </CardHeader>

                                        <CardContent className="space-y-3 pt-0 text-xs">
                                            <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg space-y-2">
                                                <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                                                    <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                                                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                                                        수업 시간
                                                    </span>
                                                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                                        {item.startTime} ~ {item.endTime}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                                                    <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                                                        <MapPin className="w-3.5 h-3.5 text-red-500" />
                                                        강의실
                                                    </span>
                                                    <span className="font-semibold">{roomName}</span>
                                                </div>

                                                <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                                                    <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                                                        <User className="w-3 h-3.5 text-emerald-500" />
                                                        담당 선생님
                                                    </span>
                                                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{teacherName}</span>
                                                </div>
                                            </div>
                                        </CardContent>

                                        <CardFooter className="pt-2 pb-4 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-muted-foreground flex justify-between items-center">
                                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                수강 등록 완료
                                            </span>
                                        </CardFooter>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* CONTENT VIEW 2: WEEKLY TIMETABLE GRID VIEW */}
            {viewMode === "timetable" && (
                <Card className="shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <div className="min-w-[900px] relative select-none">
                            {/* Days Header */}
                            <div className="grid grid-cols-8 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 sticky top-0 z-20">
                                <div className="p-3 text-center text-xs font-bold text-zinc-500 border-r border-zinc-200 dark:border-zinc-800">
                                    시간 / 요일
                                </div>
                                {daysList.map((day) => {
                                    const dayCount = filteredMyScheduleItems.filter((i) => i.dayOfWeek === day.key).length;
                                    return (
                                        <div
                                            key={day.key}
                                            className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800 last:border-r-0"
                                        >
                                            <div className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
                                                {day.label}
                                            </div>
                                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                                ({dayCount}개)
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Grid Slots */}
                            <div className="relative">
                                {timeSlots.map((slot) => {
                                    const isHour = slot.endsWith(":00");
                                    return (
                                        <div
                                            key={slot}
                                            className={`grid grid-cols-8 border-b ${isHour
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
                                                    className="border-r border-zinc-200 dark:border-zinc-800 last:border-r-0"
                                                />
                                            ))}
                                        </div>
                                    );
                                })}

                                {/* Schedule Item Cards Overlay */}
                                <div className="absolute top-0 left-0 w-full h-full pointer-events-none grid grid-cols-8">
                                    <div />
                                    {daysList.map((day) => {
                                        const dayItems = filteredMyScheduleItems.filter((i) => i.dayOfWeek === day.key);
                                        return (
                                            <div key={day.key} className="relative w-full h-full border-r border-transparent">
                                                {dayItems.map((item) => {
                                                    const startMin = timeToMinutes(item.startTime);
                                                    const endMin = timeToMinutes(item.endTime);

                                                    const topPx = ((startMin - START_HOUR_MINUTES) / 30) * SLOT_HEIGHT;
                                                    const heightPx = Math.max(((endMin - startMin) / 30) * SLOT_HEIGHT - 2, SLOT_HEIGHT - 2);

                                                    const displayTeacher = teacherMap[item.instructor_id] || "선생님";
                                                    const displayRoom = roomMap[item.room] || item.room || "강의실";

                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className="absolute left-1 right-1 rounded-md p-2 shadow-sm border text-white pointer-events-auto overflow-hidden flex flex-col justify-between"
                                                            style={{
                                                                top: `${topPx + 1}px`,
                                                                height: `${heightPx}px`,
                                                                backgroundColor: item.color || "#3b82f6",
                                                                borderColor: "rgba(0,0,0,0.15)",
                                                            }}
                                                        >
                                                            <div>
                                                                <div className="font-bold text-xs leading-tight line-clamp-1">
                                                                    {item.title}
                                                                </div>
                                                                <div className="text-[11px] opacity-90 mt-1 flex flex-wrap items-center gap-x-2">
                                                                    <span>{displayTeacher}</span>
                                                                    <span>| {displayRoom}</span>
                                                                </div>
                                                            </div>
                                                            <div className="text-[10px] opacity-80 pt-1">
                                                                {item.startTime} ~ {item.endTime}
                                                            </div>
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
            )}

            {/* TEACHER: Enrolled Students Modal */}
            <Dialog open={!!selectedCourseForStudents} onOpenChange={(open) => !open && setSelectedCourseForStudents(null)}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                            <Users className="w-5 h-5 text-purple-600" />
                            {selectedCourseForStudents?.title} - 수강생 명단
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            현재 클래스에 수강 등록된 학생 목록입니다.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        {loadingStudentsModal ? (
                            <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                                <span className="text-xs">수강생 명단을 불러오는 중...</span>
                            </div>
                        ) : enrolledStudentList.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground border rounded-lg bg-zinc-50 dark:bg-zinc-900 text-xs">
                                등록된 수강생이 없습니다.
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {enrolledStudentList.map((st, idx) => (
                                    <div
                                        key={st.user_id}
                                        className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center justify-center">
                                                {idx + 1}
                                            </span>
                                            <div>
                                                <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 block">
                                                    {st.name}
                                                </span>
                                                {st.Email && <span className="text-xs text-muted-foreground">{st.Email}</span>}
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className="text-[10px]">
                                            학생
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
