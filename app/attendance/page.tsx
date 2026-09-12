"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Loader2, User, Calendar as CalendarIcon, LogIn, LogOut, XCircle, MapPin, Navigation, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { getKSTISOString, getKSTDateString, getKSTNow } from "@/lib/dateUtils";
import { getDistanceInMeters, getCurrentPosition } from "@/lib/locationUtils";

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

export default function AttendancePage() {
    const { user, loading: authLoading, getAuthorDisplayName } = useAuth();

    const [isStudent, setIsStudent] = useState<boolean>(false);
    const [checkingStatus, setCheckingStatus] = useState<boolean>(true);

    const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
    const [studentLoading, setStudentLoading] = useState<boolean>(false);

    // Current position state
    const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [targetLocation, setTargetLocation] = useState<TargetLocation | null>(null);
    const [fetchingLocation, setFetchingLocation] = useState<boolean>(false);

    const todayStr = getKSTDateString();

    // Check Student status (grade === 'S')
    useEffect(() => {
        async function checkStudentStatus() {
            if (!user) {
                setIsStudent(false);
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
                    setIsStudent(data.grade === "S");
                } else {
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
            }
            loadMapLocation();
        }
    }, [user, isStudent, checkingStatus, fetchTodayAttendance, loadMapLocation]);

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
        <main className="flex-1 w-full max-w-xl mx-auto py-12 px-6 space-y-6">
            <div className="flex flex-col items-center text-center space-y-2 mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-black dark:text-white">출석 체크</h1>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4 text-blue-500" />
                    <span>오늘 날짜: <strong className="text-foreground">{format(getKSTNow(), "yyyy년 MM월 dd일 (EEEE)", { locale: ko })}</strong></span>
                </p>
            </div>

            {authLoading || checkingStatus ? (
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
            ) : isStudent ? (
                <>
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
                                        "위치 정보 동동"
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
        </main>
    );
}

