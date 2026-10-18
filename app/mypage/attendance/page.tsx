"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
    Loader2,
    User,
    Calendar as CalendarIcon,
    LogIn,
    LogOut,
    XCircle,
    MapPin,
    Navigation,
    ExternalLink,
    Clock,
    CheckCircle2,
    CalendarOff,
    Sparkles,
    RefreshCw,
    BookOpen,
    ArrowRight,
    AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { getKSTISOString, getKSTDateString, getKSTNow } from "@/lib/dateUtils";
import { getDistanceInMeters, getCurrentPosition } from "@/lib/locationUtils";
import { fetchScheduleItems } from "@/lib/scheduleUtils";
import { fetchAllScheduleStudentsMap } from "@/lib/scheduleStudentUtils";
import { ScheduleItem } from "@/lib/scheduleTypes";
import { AttendanceTimeConfig, fetchAttendanceTimeConfig } from "@/lib/codeUtils";

interface AttendanceRecord {
    id: number;
    a_date: string;
    s_date: string | null;
    e_date: string | null;
    user_id: string;
}

interface TargetLocation {
    latitude: number;
    longitude: number;
    radius: number;
    name?: string;
}

// 요일 인덱스 (0: 일요일 ~ 6: 토요일) 매핑
const DAY_KEY_MAP: Record<number, string> = {
    0: "sun",
    1: "mon",
    2: "tue",
    3: "wed",
    4: "thu",
    5: "fri",
    6: "sat",
};

const DAY_KOR_MAP: Record<number, string> = {
    0: "일",
    1: "월",
    2: "화",
    3: "수",
    4: "목",
    5: "금",
    6: "토",
};

// HH:mm 문자열을 분 단위 정수로 변환 (오류 시 null)
const safeTimeToMinutes = (timeStr?: string | null): number | null => {
    if (!timeStr || typeof timeStr !== "string" || !timeStr.includes(":")) return null;
    const parts = timeStr.split(":");
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
};

// 분 단위를 HH:mm 형식 문자열로 변환
const minutesToTimeString = (totalMinutes: number): string => {
    const clamped = Math.max(0, Math.min(24 * 60 - 1, totalMinutes));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    const hStr = h < 10 ? `0${h}` : `${h}`;
    const mStr = m < 10 ? `0${m}` : `${m}`;
    return `${hStr}:${mStr}`;
};

// 분 단위를 한국어 시간 표기("1시간", "30분", "1시간 30분")로 변환
const formatMinutesKor = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}시간 ${m}분`;
    if (h > 0) return `${h}시간`;
    return `${m}분`;
};

// 특정 수업이 지정된 날짜의 요일에 해당하는지 확인
const isScheduleOnDate = (dayOfWeek: string, targetDate: Date): boolean => {
    if (!dayOfWeek) return false;
    const dayIdx = targetDate.getDay();
    const dayKey = DAY_KEY_MAP[dayIdx];
    const dayKor = DAY_KOR_MAP[dayIdx];
    const clean = dayOfWeek.toLowerCase().trim();
    return clean === dayKey || clean.startsWith(dayKey) || clean.includes(dayKor);
};

// 수업 시작 전(ATT_START_TIME) ~ 종료 후(ATT_END_TIME) 시간 윈도우 계산
const getScheduleAttendanceWindow = (
    item: ScheduleItem,
    startOffsetMinutes: number = 60,
    endOffsetMinutes: number = 30
) => {
    const startMin = safeTimeToMinutes(item.startTime);
    const endMin = safeTimeToMinutes(item.endTime);
    if (startMin === null || endMin === null) return null;

    const windowStartMin = Math.max(0, startMin - startOffsetMinutes);
    const windowEndMin = Math.min(24 * 60 - 1, endMin + endOffsetMinutes);

    return {
        startMin,
        endMin,
        windowStartMin,
        windowEndMin,
        windowStartStr: minutesToTimeString(windowStartMin),
        windowEndStr: minutesToTimeString(windowEndMin),
    };
};

export default function AttendancePage() {
    const { user, loading: authLoading, getAuthorDisplayName } = useAuth();

    const [isStudent, setIsStudent] = useState<boolean>(false);
    const [userGrade, setUserGrade] = useState<string | null>(null);
    const [checkingStatus, setCheckingStatus] = useState<boolean>(true);

    const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
    const [studentLoading, setStudentLoading] = useState<boolean>(false);

    // Current position state
    const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [targetLocation, setTargetLocation] = useState<TargetLocation | null>(null);
    const [fetchingLocation, setFetchingLocation] = useState<boolean>(false);

    // Current time state (10초마다 갱신하여 출석 가능 시간 실시간 반영)
    const [nowTime, setNowTime] = useState<Date>(getKSTNow());

    // Schedule state for student
    const [mySchedules, setMySchedules] = useState<ScheduleItem[]>([]);
    const [loadingSchedule, setLoadingSchedule] = useState<boolean>(true);

    // Attendance Time Config from code table (ATTENDANCE_TIME: ATT_START_TIME, ATT_END_TIME)
    const [attendanceTimeConfig, setAttendanceTimeConfig] = useState<AttendanceTimeConfig>({
        startMinutes: 60,
        endMinutes: 30,
    });

    const todayStr = useMemo(() => getKSTDateString(nowTime), [nowTime]);

    // Timer to update nowTime every 10 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            setNowTime(getKSTNow());
        }, 10000);
        return () => clearInterval(timer);
    }, []);

    // Load attendance time config from code table
    const loadAttendanceConfig = useCallback(async () => {
        try {
            const config = await fetchAttendanceTimeConfig();
            setAttendanceTimeConfig(config);
        } catch (err) {
            console.error("Failed to load attendance time config:", err);
        }
    }, []);

    useEffect(() => {
        loadAttendanceConfig();
    }, [loadAttendanceConfig]);

    // Check Student status (grade === 'S')
    useEffect(() => {
        async function checkStudentStatus() {
            if (!user) {
                setIsStudent(false);
                setUserGrade(null);
                setCheckingStatus(false);
                return;
            }
            try {
                const { data, error } = await supabase
                    .from("profile")
                    .select("grade")
                    .eq("user_id", user.id)
                    .single();

                if (!error && data) {
                    setUserGrade(data.grade);
                    setIsStudent(data.grade === "S");
                } else {
                    setUserGrade(null);
                    setIsStudent(false);
                }
            } catch (err) {
                console.error("Student check failed:", err);
                setIsStudent(false);
            } finally {
                setCheckingStatus(false);
            }
        }
        checkStudentStatus();
    }, [user]);

    // Fetch today's attendance
    const fetchTodayAttendance = useCallback(async () => {
        if (!user) return;
        setStudentLoading(true);
        try {
            const { data, error } = await supabase
                .from("attendance")
                .select("*")
                .eq("user_id", user.id)
                .eq("a_date", todayStr)
                .maybeSingle();

            if (error && error.code !== "PGRST116") {
                console.error("Error fetching today attendance:", error.message);
            } else {
                setTodayAttendance(data || null);
            }
        } catch (err) {
            console.error("Fetch attendance error:", err);
        } finally {
            setStudentLoading(false);
        }
    }, [user, todayStr]);

    // Load student's enrolled courses from schedules & schedule_students
    const loadScheduleData = useCallback(async () => {
        if (!user) return;
        setLoadingSchedule(true);
        try {
            const [allScheduleItems, studentMap] = await Promise.all([
                fetchScheduleItems(),
                fetchAllScheduleStudentsMap(),
            ]);

            // 학생인 경우: studentMap에 자신이 포함된 수업 필터링
            // 강사 등인 경우: instructor_id 매칭 지원
            const filtered = allScheduleItems.filter((item) => {
                if (userGrade === "T") {
                    return item.instructor_id === user.id;
                }
                const enrolled = studentMap[item.id] || [];
                return enrolled.includes(user.id);
            });

            setMySchedules(filtered);
        } catch (err) {
            console.error("Failed to load schedule data:", err);
        } finally {
            setLoadingSchedule(false);
        }
    }, [user, userGrade]);

    // Load current GPS position & Target academy location
    const loadMapLocation = useCallback(async () => {
        setFetchingLocation(true);
        try {
            // Fetch academy target location from DB
            const { data: locData } = await supabase
                .from("location")
                .select("*")
                .limit(1)
                .maybeSingle();

            if (locData && locData.latitude != null && locData.longitude != null) {
                setTargetLocation({
                    latitude: Number(locData.latitude),
                    longitude: Number(locData.longitude),
                    radius: Number(locData.allowedRadiusMeters ?? locData.radius ?? 100),
                    name: locData.name || "학원",
                });
            }

            // Get browser current position
            const pos = await getCurrentPosition();
            setUserCoords({
                lat: Number(pos.coords.latitude.toFixed(6)),
                lng: Number(pos.coords.longitude.toFixed(6)),
            });
        } catch (err) {
            console.error("Failed to load map position:", err);
        } finally {
            setFetchingLocation(false);
        }
    }, []);

    useEffect(() => {
        if (user && !checkingStatus) {
            if (isStudent) {
                fetchTodayAttendance();
                loadScheduleData();
            }
            loadMapLocation();
        }
    }, [user, isStudent, checkingStatus, fetchTodayAttendance, loadScheduleData, loadMapLocation]);

    // 오늘 요일에 해당하는 학생 수업 목록
    const todayMyClasses = useMemo(() => {
        return mySchedules.filter((sch) => isScheduleOnDate(sch.dayOfWeek, nowTime));
    }, [mySchedules, nowTime]);

    // 현재 시각(분)
    const currentMinutes = useMemo(() => {
        return nowTime.getHours() * 60 + nowTime.getMinutes();
    }, [nowTime]);

    // 현재 시각이 [시작 ATT_START_TIME분 전 ~ 종료 ATT_END_TIME분 후] 범위에 포함되는 유효 수업 목록
    const activeClasses = useMemo(() => {
        return todayMyClasses.filter((item) => {
            const win = getScheduleAttendanceWindow(
                item,
                attendanceTimeConfig.startMinutes,
                attendanceTimeConfig.endMinutes
            );
            if (!win) return false;
            return currentMinutes >= win.windowStartMin && currentMinutes <= win.windowEndMin;
        });
    }, [todayMyClasses, currentMinutes, attendanceTimeConfig]);

    // 출석 체크 허용 여부: 활성화된 수업이 1개 이상 존재할 때만 출석 체크 허용
    const isAttendanceAllowed = activeClasses.length > 0;

    // Helper to refresh state immediately
    const handleManualRefresh = () => {
        setNowTime(getKSTNow());
        loadAttendanceConfig();
        if (isStudent) {
            fetchTodayAttendance();
            loadScheduleData();
        }
        loadMapLocation();
    };

    // Helper to send email notification to admin users
    const triggerAttendanceEmail = async (type: "CHECK_IN" | "CHECK_OUT") => {
        if (!user) return;
        try {
            const studentName = getAuthorDisplayName(user.id) || user.email || "학생";
            const dateTime = format(getKSTNow(), "yyyy-MM-dd HH:mm:ss");

            await fetch("/api/attendance/notify-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentUserId: user.id,
                    studentName,
                    type,
                    dateTime,
                }),
            });
        } catch (err) {
            console.error("Attendance email notification error:", err);
        }
    };

    // Helper to verify location
    const verifyLocationPermission = async (): Promise<boolean> => {
        try {
            const { data: locData, error: locError } = await supabase
                .from("location")
                .select("*")
                .limit(1)
                .maybeSingle();

            if (locError) {
                console.error("Location table fetch error:", locError.message);
            }

            if (!locData || locData.latitude == null || locData.longitude == null) {
                return true;
            }

            const targetLat = Number(locData.latitude);
            const targetLon = Number(locData.longitude);
            const allowedRadius = locData.allowedRadiusMeters != null
                ? Number(locData.allowedRadiusMeters)
                : locData.radius != null
                    ? Number(locData.radius)
                    : 100;

            const position = await getCurrentPosition();
            const userLat = position.coords.latitude;
            const userLon = position.coords.longitude;

            // Update userCoords state
            setUserCoords({
                lat: Number(userLat.toFixed(6)),
                lng: Number(userLon.toFixed(6)),
            });

            const distance = getDistanceInMeters(userLat, userLon, targetLat, targetLon);

            if (distance > allowedRadius) {
                alert(`학원 근처(${allowedRadius}m 이내)에서만 출석 체크가 가능합니다.\n(현재 거리: 약 ${Math.round(distance)}m)`);
                return false;
            }

            return true;
        } catch (err: any) {
            console.error("Location verification error:", err);
            alert("위치 정보를 가져올 수 없습니다. 브라우저의 위치 권한(GPS)을 허용해 주세요.");
            return false;
        }
    };

    // Handlers for student buttons
    const handleCheckIn = async () => {
        if (!user) return;

        // 시작 전 ~ 종료 후 시간 유효성 확인
        if (!isAttendanceAllowed) {
            const startStr = formatMinutesKor(attendanceTimeConfig.startMinutes);
            const endStr = formatMinutesKor(attendanceTimeConfig.endMinutes);
            alert(`현재는 출석 체크 가능 시간이 아닙니다.\n수업 시작 ${startStr} 전부터 종료 ${endStr} 후까지만 등원 체크가 가능합니다.`);
            return;
        }

        if (todayAttendance?.s_date) {
            alert("이미 등원처리 되었습니다.");
            return;
        }

        setStudentLoading(true);
        try {
            const isLocationValid = await verifyLocationPermission();
            if (!isLocationValid) {
                setStudentLoading(false);
                return;
            }

            const kstNowIso = getKSTISOString();

            if (todayAttendance) {
                const { data, error } = await supabase
                    .from("attendance")
                    .update({ s_date: kstNowIso })
                    .eq("id", todayAttendance.id)
                    .select()
                    .single();

                if (!error && data) {
                    setTodayAttendance(data);
                    triggerAttendanceEmail("CHECK_IN");
                } else {
                    console.error("Check-in update error:", error?.message);
                }
            } else {
                const { data, error } = await supabase
                    .from("attendance")
                    .insert([
                        {
                            a_date: todayStr,
                            s_date: kstNowIso,
                            e_date: null,
                            user_id: user.id,
                        },
                    ])
                    .select()
                    .single();

                if (!error && data) {
                    setTodayAttendance(data);
                    triggerAttendanceEmail("CHECK_IN");
                } else {
                    console.error("Check-in insert error:", error?.message);
                }
            }
        } catch (err) {
            console.error("Check in exception:", err);
        } finally {
            setStudentLoading(false);
        }
    };

    const handleCheckOut = async () => {
        if (!user) return;

        // 시작 전 ~ 종료 후 시간 유효성 확인
        if (!isAttendanceAllowed) {
            const startStr = formatMinutesKor(attendanceTimeConfig.startMinutes);
            const endStr = formatMinutesKor(attendanceTimeConfig.endMinutes);
            alert(`현재는 출석 체크 가능 시간이 아닙니다.\n수업 시작 ${startStr} 전부터 종료 ${endStr} 후까지만 하원 체크가 가능합니다.`);
            return;
        }

        if (!todayAttendance || !todayAttendance.s_date) {
            alert("등원을 진행해야 합니다.");
            return;
        }

        if (todayAttendance.e_date) {
            alert("이미 하원처리 되었습니다.");
            return;
        }

        setStudentLoading(true);
        try {
            const isLocationValid = await verifyLocationPermission();
            if (!isLocationValid) {
                setStudentLoading(false);
                return;
            }

            const kstNowIso = getKSTISOString();
            const { data, error } = await supabase
                .from("attendance")
                .update({ e_date: kstNowIso })
                .eq("id", todayAttendance.id)
                .select()
                .single();

            if (!error && data) {
                setTodayAttendance(data);
                triggerAttendanceEmail("CHECK_OUT");
            } else {
                console.error("Check-out update error:", error?.message);
            }
        } catch (err) {
            console.error("Check out exception:", err);
        } finally {
            setStudentLoading(false);
        }
    };

    const hasCheckIn = Boolean(todayAttendance?.s_date);
    const hasCheckOut = Boolean(todayAttendance?.e_date);

    // Dynamic Google Maps iframe URL
    const mapLat = userCoords?.lat ?? targetLocation?.latitude ?? 37.5665;
    const mapLng = userCoords?.lng ?? targetLocation?.longitude ?? 126.9780;
    const googleMapsEmbedUrl = `https://maps.google.com/maps?q=${mapLat},${mapLng}&z=16&output=embed`;
    const googleMapsDirectUrl = `https://www.google.com/maps?q=${mapLat},${mapLng}`;

    return (
        <div className="w-full max-w-xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex flex-col items-center text-center space-y-2 mb-6">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-black dark:text-white">출석 체크</h1>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleManualRefresh}
                        title="새로고침"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 flex-wrap justify-center">
                    <CalendarIcon className="w-4 h-4 text-blue-500" />
                    <span>오늘: <strong className="text-foreground">{format(nowTime, "yyyy년 MM월 dd일 (EEEE)", { locale: ko })}</strong></span>
                    <span className="text-zinc-300 dark:text-zinc-700">|</span>
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="font-mono text-foreground font-semibold">{format(nowTime, "HH:mm:ss")}</span>
                </p>
            </div>

            {authLoading || checkingStatus || (isStudent && loadingSchedule) ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-500 w-full">
                    <Loader2 className="h-10 w-10 animate-spin mb-4" />
                    <p className="text-sm font-medium animate-pulse">출석 및 시간표 정보를 확인하는 중입니다...</p>
                </div>
            ) : !user ? (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-12 text-center shadow-sm w-full">
                    <User className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold mb-2">로그인이 필요합니다</h2>
                    <p className="text-sm text-muted-foreground">출석 정보를 확인하고 등/하원 체크를 하려면 먼저 로그인해주세요.</p>
                </div>
            ) : isStudent ? (
                <>
                    {/* 출석 체크 UI: 수업 시작 1시간 전 ~ 종료 1시간 후 범위에 포함될 때만 표시 */}
                    {isAttendanceAllowed ? (
                        <Card className="border border-zinc-200 dark:border-zinc-800 shadow-md overflow-hidden">
                            <CardHeader className="text-center pb-4 border-b border-zinc-100 dark:border-zinc-800/80 bg-gradient-to-b from-blue-50/40 to-transparent dark:from-blue-950/20">
                                <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold px-2.5 py-0.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                        출석 체크 가능 시간
                                    </Badge>
                                    {activeClasses.map((ac) => (
                                        <Badge
                                            key={ac.id}
                                            variant="outline"
                                            className="text-xs bg-white dark:bg-zinc-900 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 font-medium"
                                        >
                                            <BookOpen className="w-3 h-3 mr-1" />
                                            {ac.title} ({ac.startTime} ~ {ac.endTime})
                                        </Badge>
                                    ))}
                                </div>
                                <CardTitle className="text-lg md:text-xl font-bold">오늘의 출석 상태</CardTitle>
                                <CardDescription className="text-xs">
                                    등원 및 하원 버튼을 클릭하여 출석 상태를 기록하세요.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 pb-8 px-6 space-y-8">
                                {/* Status Info Display */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center transition-colors ${hasCheckIn
                                        ? "bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900"
                                        : "bg-zinc-50 border-zinc-200 dark:bg-zinc-900/50 dark:border-zinc-800"
                                        }`}>
                                        <span className="text-xs text-muted-foreground mb-1">등원 시간</span>
                                        <span className={`font-semibold text-sm md:text-base ${hasCheckIn ? "text-blue-700 dark:text-blue-300" : "text-zinc-400"}`}>
                                            {todayAttendance?.s_date ? format(new Date(todayAttendance.s_date), "HH:mm:ss") : "미등원"}
                                        </span>
                                    </div>

                                    <div className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center transition-colors ${hasCheckOut
                                        ? "bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-900"
                                        : "bg-zinc-50 border-zinc-200 dark:bg-zinc-900/50 dark:border-zinc-800"
                                        }`}>
                                        <span className="text-xs text-muted-foreground mb-1">하원 시간</span>
                                        <span className={`font-semibold text-sm md:text-base ${hasCheckOut ? "text-red-700 dark:text-red-300" : "text-zinc-400"}`}>
                                            {todayAttendance?.e_date ? format(new Date(todayAttendance.e_date), "HH:mm:ss") : "미하원"}
                                        </span>
                                    </div>
                                </div>

                                {/* Attendance Action Buttons */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Button
                                        size="lg"
                                        disabled={studentLoading}
                                        onClick={handleCheckIn}
                                        className={`h-24 flex flex-col items-center justify-center gap-1 text-base font-bold transition-all shadow-sm ${hasCheckIn
                                            ? "bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                                            : "bg-white hover:bg-zinc-100 text-zinc-900 border border-zinc-300 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:border-zinc-700"
                                            }`}
                                    >
                                        <LogIn className="w-6 h-6 mb-1" />
                                        {hasCheckIn && todayAttendance?.s_date ? (
                                            <>
                                                <span>등원 완료</span>
                                                <span className="text-xs font-normal opacity-90">
                                                    {format(new Date(todayAttendance.s_date), "HH:mm:ss")}
                                                </span>
                                            </>
                                        ) : (
                                            <span>등원</span>
                                        )}
                                    </Button>

                                    <Button
                                        size="lg"
                                        disabled={studentLoading}
                                        onClick={handleCheckOut}
                                        className={`h-24 flex flex-col items-center justify-center gap-1 text-base font-bold transition-all shadow-sm ${hasCheckOut
                                            ? "bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700"
                                            : "bg-white hover:bg-zinc-100 text-zinc-900 border border-zinc-300 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:border-zinc-700"
                                            }`}
                                    >
                                        <LogOut className="w-6 h-6 mb-1" />
                                        {hasCheckOut && todayAttendance?.e_date ? (
                                            <>
                                                <span>하원 완료</span>
                                                <span className="text-xs font-normal opacity-90">
                                                    {format(new Date(todayAttendance.e_date), "HH:mm:ss")}
                                                </span>
                                            </>
                                        ) : (
                                            <span>하원</span>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        /* 출석 체크 가능 시간이 아닐 때의 안내 카드 */
                        <Card className="border border-zinc-200 dark:border-zinc-800 shadow-md overflow-hidden">
                            <CardHeader className="text-center pb-4 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
                                <div className="flex items-center justify-center mb-2">
                                    <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                        <Clock className="w-6 h-6" />
                                    </div>
                                </div>
                                <CardTitle className="text-lg md:text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                    {todayMyClasses.length === 0 ? "오늘 예정된 수업이 없습니다" : "현재는 출석 체크 가능 시간이 아닙니다"}
                                </CardTitle>
                                <CardDescription className="text-xs max-w-md mx-auto mt-1 text-muted-foreground">
                                    {todayMyClasses.length === 0
                                        ? "출석시간표에 등록된 수업이 있는 날에만 출석 체크를 진행할 수 있습니다."
                                        : `출석 체크는 수업 시작 ${formatMinutesKor(attendanceTimeConfig.startMinutes)} 전부터 수업 종료 ${formatMinutesKor(attendanceTimeConfig.endMinutes)} 후까지만 가능합니다.`}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="pt-6 pb-6 px-6 space-y-6">
                                {/* 이전 출석 기록이 있다면 상태 표시 */}
                                {(todayAttendance?.s_date || todayAttendance?.e_date) && (
                                    <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 space-y-3">
                                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">오늘 기록된 출석 현황</span>
                                        <div className="grid grid-cols-2 gap-3 text-center">
                                            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                                                <span className="text-[11px] text-muted-foreground block mb-0.5">등원 시간</span>
                                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                                    {todayAttendance.s_date ? format(new Date(todayAttendance.s_date), "HH:mm:ss") : "미등원"}
                                                </span>
                                            </div>
                                            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                                                <span className="text-[11px] text-muted-foreground block mb-0.5">하원 시간</span>
                                                <span className="text-xs font-bold text-red-600 dark:text-red-400">
                                                    {todayAttendance.e_date ? format(new Date(todayAttendance.e_date), "HH:mm:ss") : "미하원"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 오늘 수업 일정 목록 및 출석 가능 시간대 안내 */}
                                {todayMyClasses.length > 0 ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                                <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
                                                오늘의 수업 일정 ({todayMyClasses.length}개)
                                            </span>
                                            <span className="text-muted-foreground text-[11px]">
                                                현재: <strong className="text-foreground font-mono">{format(nowTime, "HH:mm")}</strong>
                                            </span>
                                        </div>

                                        <div className="space-y-2.5">
                                            {todayMyClasses.map((item) => {
                                                const win = getScheduleAttendanceWindow(
                                                    item,
                                                    attendanceTimeConfig.startMinutes,
                                                    attendanceTimeConfig.endMinutes
                                                );
                                                let statusText = "";
                                                let statusBadgeClass = "";

                                                if (win) {
                                                    if (currentMinutes < win.windowStartMin) {
                                                        const diff = win.windowStartMin - currentMinutes;
                                                        const h = Math.floor(diff / 60);
                                                        const m = diff % 60;
                                                        statusText = `${h > 0 ? `${h}시간 ` : ""}${m}분 후 가능`;
                                                        statusBadgeClass = "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200";
                                                    } else if (currentMinutes > win.windowEndMin) {
                                                        statusText = "출석 마감";
                                                        statusBadgeClass = "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200";
                                                    } else {
                                                        statusText = "출석 가능";
                                                        statusBadgeClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200";
                                                    }
                                                }

                                                return (
                                                    <div
                                                        key={item.id}
                                                        className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                                    >
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                                                                    {item.title}
                                                                </span>
                                                                {win && (
                                                                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusBadgeClass}`}>
                                                                        {statusText}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                                                                <span className="flex items-center gap-1">
                                                                    <Clock className="w-3 h-3 text-blue-500" />
                                                                    수업: {item.startTime} ~ {item.endTime}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <MapPin className="w-3 h-3 text-red-500" />
                                                                    {item.room || "강의실"}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {win && (
                                                            <div className="sm:text-right bg-blue-50/60 dark:bg-blue-950/30 p-2 rounded-lg border border-blue-100 dark:border-blue-900/50">
                                                                <span className="text-[10px] text-muted-foreground block">출석 가능 시간</span>
                                                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                                                    {win.windowStartStr} ~ {win.windowEndStr}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 px-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-3">
                                        <CalendarOff className="w-8 h-8 text-zinc-400 mx-auto" />
                                        <p className="text-xs text-muted-foreground">
                                            오늘({format(nowTime, "EEEE", { locale: ko })})은 등록된 수강 과목이 없습니다.
                                        </p>
                                        <Button variant="outline" size="sm" asChild className="h-8 text-xs gap-1.5">
                                            <Link href="/mypage/schedule">
                                                나의 시간표 확인하기
                                                <ArrowRight className="w-3 h-3" />
                                            </Link>
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Google Maps Current Location View */}
                    <Card className="border border-zinc-200 dark:border-zinc-800 shadow-md">
                        <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-red-500" />
                                    <CardTitle className="text-base font-bold">현재 위치 (Google Maps)</CardTitle>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={loadMapLocation}
                                    disabled={fetchingLocation}
                                    className="h-8 gap-1 text-xs"
                                >
                                    {fetchingLocation ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Navigation className="w-3.5 h-3.5" />
                                    )}
                                    위치 갱신
                                </Button>
                            </div>
                            <CardDescription className="text-xs">
                                {userCoords ? (
                                    <>위도: <strong className="text-foreground">{userCoords.lat}</strong>, 경도: <strong className="text-foreground">{userCoords.lng}</strong></>
                                ) : (
                                    "GPS 위치 확인 중..."
                                )}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <div className="w-full h-72 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 relative bg-zinc-100 dark:bg-zinc-900">
                                {fetchingLocation && !userCoords && (
                                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-900/10 backdrop-blur-sm text-zinc-600 dark:text-zinc-400">
                                        <Loader2 className="w-6 h-6 animate-spin mb-2" />
                                        <span className="text-xs font-medium">GPS 좌표를 조회하고 있습니다...</span>
                                    </div>
                                )}
                                <iframe
                                    title="Google Maps Location"
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    loading="lazy"
                                    allowFullScreen
                                    src={googleMapsEmbedUrl}
                                />
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-1">
                                <span className="text-xs text-muted-foreground truncate">
                                    {targetLocation ? (
                                        `등록 학원: ${targetLocation.name || "학원"} (반경 ${targetLocation.radius}m)`
                                    ) : (
                                        "위치 정보 로딩 중..."
                                    )}
                                </span>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    asChild
                                    className="h-8 gap-1.5 text-xs whitespace-nowrap"
                                >
                                    <a href={googleMapsDirectUrl} target="_blank" rel="noopener noreferrer">
                                        Google 지도에서 보기
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/10 rounded-2xl max-w-xl mx-auto my-12 gap-4">
                    <XCircle className="w-12 h-12 text-amber-500" />
                    <h3 className="text-xl font-bold text-amber-700 dark:text-amber-400">출석체크 대상 아님</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        현재 계정의 등급(grade)이 학생(&apos;S&apos;)으로 설정되어 있지 않습니다.<br />
                        출석체크는 학원 관리자에게 학생 권한 부여를 요청하신 후 이용이 가능합니다.
                    </p>
                </div>
            )}
        </div>
    );
}

