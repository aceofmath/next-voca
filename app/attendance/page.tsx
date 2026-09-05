"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Loader2, User, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { getKSTISOString, getKSTDateString, getKSTNow } from "@/lib/dateUtils";
import { getDistanceInMeters, getCurrentPosition } from "@/lib/locationUtils";

interface AttendanceRecord {
    id: number;
    a_date: string; // YYYY-MM-DD
    s_date: string | null; // 등원일시 ISO string
    e_date: string | null; // 하원일시 ISO string
    user_id: string;
}

interface ProfileRecord {
    user_id: string;
    name: string;
    adminYn?: boolean | null;
}

export default function AttendancePage() {
    const { user, loading: authLoading, profileMap, getAuthorDisplayName } = useAuth();

    // Admin check state
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [checkingAdmin, setCheckingAdmin] = useState<boolean>(true);

    // Common state: Selected Month for Admin (YYYY-MM)
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

    // Student Attendance state
    const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
    const [studentLoading, setStudentLoading] = useState<boolean>(false);

    // Admin Monthly Attendance state
    const [monthlyAttendances, setMonthlyAttendances] = useState<AttendanceRecord[]>([]);
    const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
    const [adminLoading, setAdminLoading] = useState<boolean>(false);

    const todayStr = getKSTDateString();

    // 1. Check Admin status
    useEffect(() => {
        async function checkAdminStatus() {
            if (!user) {
                setIsAdmin(false);
                setCheckingAdmin(false);
                return;
            }
            try {
                const { data, error } = await supabase
                    .from("profile")
                    .select("adminYn")
                    .eq("user_id", user.id)
                    .single();

                if (!error && data) {
                    setIsAdmin(Boolean(data.adminYn));
                } else {
                    setIsAdmin(false);
                }
            } catch (err) {
                console.error("Admin check failed:", err);
                setIsAdmin(false);
            } finally {
                setCheckingAdmin(false);
            }
        }
        checkAdminStatus();
    }, [user]);

    // 2. Student Mode: Fetch today's attendance
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

    useEffect(() => {
        if (user && !isAdmin && !checkingAdmin) {
            fetchTodayAttendance();
        }
    }, [user, isAdmin, checkingAdmin, fetchTodayAttendance]);

    // 3. Admin Mode: Fetch profiles & monthly attendance
    const fetchAdminData = useCallback(async () => {
        if (!isAdmin) return;
        setAdminLoading(true);
        try {
            // Fetch non-admin profiles (students)
            const { data: profData } = await supabase.from("profile").select("user_id, name, adminYn");
            if (profData) {
                setProfiles(profData);
            }

            // Calculate start and end of month
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
    }, [isAdmin, currentMonth]);

    useEffect(() => {
        if (isAdmin && !checkingAdmin) {
            fetchAdminData();
        }
    }, [isAdmin, checkingAdmin, fetchAdminData]);

    // Helper to verify user is within allowed radius of location table coordinates
    const verifyLocationPermission = async (): Promise<boolean> => {
        try {
            // Fetch academy location from location table
            const { data: locData, error: locError } = await supabase
                .from("location")
                .select("*")
                .limit(1)
                .maybeSingle();

            if (locError) {
                console.error("Location table fetch error:", locError.message);
            }

            // If no location table record or missing coordinates, fallback/skip check
            if (!locData || locData.latitude == null || locData.longitude == null) {
                return true;
            }

            const targetLat = Number(locData.latitude);
            const targetLon = Number(locData.longitude);
            // Fetch allowed radius from location table allowedRadiusMeters column (fallback to radius or 100)
            const allowedRadius = locData.allowedRadiusMeters != null
                ? Number(locData.allowedRadiusMeters)
                : locData.radius != null
                    ? Number(locData.radius)
                    : 100;

            // Get current browser position
            const position = await getCurrentPosition();
            const userLat = position.coords.latitude;
            const userLon = position.coords.longitude;

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

        // 이미 등원처리가 되어있는 경우
        if (todayAttendance?.s_date) {
            alert("이미 등원처리 되었습니다.");
            return;
        }

        setStudentLoading(true);
        try {
            // 1. Verify location
            const isLocationValid = await verifyLocationPermission();
            if (!isLocationValid) {
                setStudentLoading(false);
                return;
            }

            const kstNowIso = getKSTISOString();

            if (todayAttendance) {
                // Update existing record if s_date is not set
                const { data, error } = await supabase
                    .from("attendance")
                    .update({ s_date: kstNowIso })
                    .eq("id", todayAttendance.id)
                    .select()
                    .single();

                if (!error && data) {
                    setTodayAttendance(data);
                } else {
                    console.error("Check-in update error:", error?.message);
                }
            } else {
                // Insert new record
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

        // 등원일시가 등록되지 않은 경우
        if (!todayAttendance || !todayAttendance.s_date) {
            alert("등원을 진행해야 합니다.");
            return;
        }

        // 이미 하원처리가 되어있는 경우
        if (todayAttendance.e_date) {
            alert("이미 하원처리 되었습니다.");
            return;
        }

        setStudentLoading(true);
        try {
            // 1. Verify location
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
            } else {
                console.error("Check-out update error:", error?.message);
            }
        } catch (err) {
            console.error("Check out exception:", err);
        } finally {
            setStudentLoading(false);
        }
    };

    // Admin edit dialog state
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<{ id?: number; user_id: string; name: string; a_date: string; s_date?: string | null; e_date?: string | null } | null>(null);
    const [editSDate, setEditSDate] = useState("");
    const [editEDate, setEditEDate] = useState("");
    const [savingEdit, setSavingEdit] = useState(false);

    const handleOpenAdminEdit = (student: ProfileRecord, a_date: string, record?: AttendanceRecord) => {
        setEditingStudent({
            id: record?.id,
            user_id: student.user_id,
            name: student.name,
            a_date,
            s_date: record?.s_date,
            e_date: record?.e_date,
        });

        // Format ISO strings to "YYYY-MM-DDTHH:mm" for datetime-local input
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
                // Update existing record
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
                // Insert new record if admin sets time for student without record
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

    return (
        <>
            {/* Header section */}
            <div className="flex flex-col md:flex-row items-center justify-center py-6 mb-6 md:mb-8 w-full gap-4 text-center">
                <h1 className="text-2xl md:text-3xl font-bold text-black dark:text-white">
                    {isAdmin ? "출석 관리 (관리자)" : "출석 체크"}
                </h1>
            </div>

            {authLoading || checkingAdmin ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-500 w-full">
                    <Loader2 className="h-10 w-10 animate-spin mb-4" />
                    <p className="text-sm font-medium animate-pulse">출석 정보를 불러오는 중입니다...</p>
                </div>
            ) : !user ? (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-12 text-center shadow-sm w-full">
                    <User className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold mb-2">로그인이 필요합니다</h2>
                    <p className="text-sm text-muted-foreground">출석 정보를 확인하고 등/하원 체크를 하려면 먼저 로그인해주세요.</p>
                </div>
            ) : isAdmin ? (
                <AdminView
                    currentMonth={currentMonth}
                    setCurrentMonth={setCurrentMonth}
                    adminLoading={adminLoading}
                    monthlyAttendances={monthlyAttendances}
                    profiles={profiles}
                    todayStr={todayStr}
                    onEditStudent={handleOpenAdminEdit}
                />
            ) : (
                <StudentView
                    todayAttendance={todayAttendance}
                    studentLoading={studentLoading}
                    handleCheckIn={handleCheckIn}
                    handleCheckOut={handleCheckOut}
                />
            )}

            {/* Admin Edit Modal Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-lg">
                    <DialogHeader>
                        <DialogTitle>출석 일시 수정 ({editingStudent?.name})</DialogTitle>
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
        </>
    );
}

// Sub-component: Admin View
function AdminView({
    currentMonth,
    setCurrentMonth,
    adminLoading,
    monthlyAttendances,
    profiles,
    todayStr,
    onEditStudent,
}: {
    currentMonth: Date;
    setCurrentMonth: (d: Date) => void;
    adminLoading: boolean;
    monthlyAttendances: AttendanceRecord[];
    profiles: ProfileRecord[];
    todayStr: string;
    onEditStudent: (student: ProfileRecord, a_date: string, record?: AttendanceRecord) => void;
}) {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth(); // 0-indexed
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

    const studentProfiles = profiles.filter((p) => !p.adminYn);

    return (
        <div className="w-full space-y-6 px-12 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-blue-600">관리자 모드</Badge>
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">학생들의 월별 출석 현황을 확인하고 클릭하여 등/하원 일시를 수정할 수 있습니다.</p>
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
                                                {/* 해당 날짜에 attendance 데이터가 하나라도 있는 경우에만 결석 대상자 포함 표시 */}
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
                                                            onClick={() => onEditStudent(student, dateString, record)}
                                                            className="flex flex-col p-1 rounded border border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/50 gap-0.5 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                                            title="클릭하여 등/하원 일시 수정"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="truncate max-w-[60px] font-medium">{student.name}</span>
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
        </div>
    );
}

// Sub-component: Student View
function StudentView({
    todayAttendance,
    studentLoading,
    handleCheckIn,
    handleCheckOut,
}: {
    todayAttendance: AttendanceRecord | null;
    studentLoading: boolean;
    handleCheckIn: () => void;
    handleCheckOut: () => void;
}) {
    const hasCheckIn = Boolean(todayAttendance?.s_date);
    const hasCheckOut = Boolean(todayAttendance?.e_date);

    return (
        <div className="w-full max-w-xl mx-auto py-8 space-y-6">
            <div className="flex flex-col items-center text-center space-y-2 mb-6">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4 text-blue-500" />
                    <span>오늘 날짜: <strong className="text-foreground">{format(getKSTNow(), "yyyy년 MM월 dd일 (EEEE)", { locale: ko })}</strong></span>
                </p>
            </div>

            <Card className="border border-zinc-200 dark:border-zinc-800 shadow-md">
                <CardHeader className="text-center pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
                    <CardTitle className="text-lg md:text-xl font-bold">오늘의 출석 상태</CardTitle>
                    <CardDescription>등원 및 하원 버튼을 클릭하여 출석 상태를 기록하세요.</CardDescription>
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
                        {/* 등원 버튼 */}
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

                        {/* 하원 버튼 */}
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
        </div>
    );
}
