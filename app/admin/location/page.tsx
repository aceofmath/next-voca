"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentPosition } from "@/lib/locationUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Save, Navigation, RefreshCw, AlertCircle, CheckCircle2, MousePointerClick } from "lucide-react";

// Dynamic import for Leaflet map component (SSR disabled)
const MapPicker = dynamic(() => import("@/components/MapPicker"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full min-h-[360px] flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-900 rounded-lg gap-2 text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-sm font-medium">대화형 지도를 로딩 중입니다...</span>
        </div>
    ),
});

interface LocationData {
    id?: number;
    latitude: number;
    longitude: number;
    allowedRadiusMeters: number;
    name?: string;
}

export default function AdminLocationPage() {
    const [locationData, setLocationData] = useState<LocationData>({
        latitude: 37.5665,
        longitude: 126.9780,
        allowedRadiusMeters: 100,
        name: "JOKIM 수학까페학원",
    });

    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [gettingGps, setGettingGps] = useState<boolean>(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Fetch location data from Supabase
    const fetchLocation = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const { data, error } = await supabase
                .from("location")
                .select("*")
                .limit(1)
                .maybeSingle();

            if (error) {
                console.error("Error fetching location:", error);
                setMessage({ type: "error", text: "위치 정보를 불러오는 데 실패했습니다." });
            } else if (data) {
                setLocationData({
                    id: data.id,
                    latitude: Number(data.latitude) || 37.5665,
                    longitude: Number(data.longitude) || 126.9780,
                    allowedRadiusMeters: Number(data.allowedRadiusMeters ?? data.radius ?? 100),
                    name: data.name || "JOKIM 수학까페학원",
                });
            }
        } catch (err) {
            console.error("Unexpected fetch location error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLocation();
    }, []);

    // Get current GPS location from browser
    const handleGetCurrentLocation = async () => {
        setGettingGps(true);
        setMessage(null);
        try {
            const pos = await getCurrentPosition();
            setLocationData((prev) => ({
                ...prev,
                latitude: Number(pos.coords.latitude.toFixed(6)),
                longitude: Number(pos.coords.longitude.toFixed(6)),
            }));
            setMessage({ type: "success", text: "현재 브라우저 GPS 위치 좌표를 가져왔습니다." });
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "GPS 위치를 가져올 수 없습니다.";
            setMessage({ type: "error", text: errMsg });
        } finally {
            setGettingGps(false);
        }
    };

    // Callback when clicking map to select new coordinates
    const handleMapSelectLocation = (lat: number, lng: number) => {
        setLocationData((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lng,
        }));
        setMessage({ type: "success", text: `지도에서 선택한 위치 좌표가 입력되었습니다. (위도: ${lat}, 경도: ${lng})` });
    };

    // Save location data to Supabase
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            // Try updating with allowedRadiusMeters first, fallback to radius if needed
            const basePayload: Record<string, unknown> = {
                latitude: Number(locationData.latitude),
                longitude: Number(locationData.longitude),
                allowedRadiusMeters: Number(locationData.allowedRadiusMeters),
            };

            if (locationData.id) {
                // Update existing record
                let { error } = await supabase
                    .from("location")
                    .update(basePayload)
                    .eq("id", locationData.id);

                if (error && error.message.includes("allowedRadiusMeters")) {
                    // Fallback for schema using 'radius'
                    const fallbackPayload = {
                        latitude: Number(locationData.latitude),
                        longitude: Number(locationData.longitude),
                        radius: Number(locationData.allowedRadiusMeters),
                    };
                    const res = await supabase
                        .from("location")
                        .update(fallbackPayload)
                        .eq("id", locationData.id);
                    error = res.error;
                }

                if (error) throw error;
            } else {
                // Insert new record
                let { data, error } = await supabase
                    .from("location")
                    .insert([basePayload])
                    .select()
                    .single();

                if (error && error.message.includes("allowedRadiusMeters")) {
                    const fallbackPayload = {
                        latitude: Number(locationData.latitude),
                        longitude: Number(locationData.longitude),
                        radius: Number(locationData.allowedRadiusMeters),
                    };
                    const res = await supabase
                        .from("location")
                        .insert([fallbackPayload])
                        .select()
                        .single();
                    data = res.data;
                    error = res.error;
                }

                if (error) throw error;
                if (data) {
                    setLocationData((prev) => ({ ...prev, id: data.id }));
                }
            }

            setMessage({ type: "success", text: "학원 위치 및 허용 반경 설정이 성공적으로 저장되었습니다." });
        } catch (err: unknown) {
            console.error("Save location error:", err);
            const errMsg = err instanceof Error ? err.message : "위치 저장 중 오류가 발생했습니다.";
            setMessage({ type: "error", text: errMsg });
        } finally {
            setSaving(false);
        }
    };

    const externalMapUrl = `https://www.google.com/maps/search/?api=1&query=${locationData.latitude},${locationData.longitude}`;

    return (
        <div className="space-y-6">
            {/* Page Title & Subtitle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">학원 위치 정보 관리</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        학생 출석 체크 시 허용되는 학원 중심 좌표와 출석 반경(m)을 설정합니다. 지도를 클릭해 위치를 바로 선택할 수 있습니다.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchLocation} disabled={loading} className="gap-2 self-start sm:self-auto">
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    새로고침
                </Button>
            </div>

            {/* Notification message */}
            {message && (
                <div
                    className={`p-4 rounded-lg flex items-center gap-3 text-sm font-medium border ${
                        message.type === "success"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300"
                            : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300"
                    }`}
                >
                    {message.type === "success" ? (
                        <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                        <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
                    )}
                    <span>{message.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Form Section */}
                <Card className="lg:col-span-5 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-blue-600" />
                            위치 및 출석 반경 설정
                        </CardTitle>
                        <CardDescription>
                            위도/경도와 출석 인정 허용 반경(미터)을 입력하거나 지도에서 클릭 후 저장하세요.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-500">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span className="text-sm">위치 정보 로딩 중...</span>
                            </div>
                        ) : (
                            <form onSubmit={handleSave} className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="name">학원/장소 명칭</Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder="JOKIM 수학까페학원"
                                        value={locationData.name || ""}
                                        onChange={(e) =>
                                            setLocationData((prev) => ({ ...prev, name: e.target.value }))
                                        }
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="latitude">위도 (Latitude)</Label>
                                        <Input
                                            id="latitude"
                                            type="number"
                                            step="any"
                                            placeholder="37.5665"
                                            required
                                            value={locationData.latitude}
                                            onChange={(e) =>
                                                setLocationData((prev) => ({
                                                    ...prev,
                                                    latitude: parseFloat(e.target.value) || 0,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="longitude">경도 (Longitude)</Label>
                                        <Input
                                            id="longitude"
                                            type="number"
                                            step="any"
                                            placeholder="126.9780"
                                            required
                                            value={locationData.longitude}
                                            onChange={(e) =>
                                                setLocationData((prev) => ({
                                                    ...prev,
                                                    longitude: parseFloat(e.target.value) || 0,
                                                }))
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="allowedRadiusMeters">출석 허용 반경 (미터, m)</Label>
                                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                            {locationData.allowedRadiusMeters}m
                                        </span>
                                    </div>
                                    <Input
                                        id="allowedRadiusMeters"
                                        type="number"
                                        min="1"
                                        max="5000"
                                        required
                                        placeholder="100"
                                        value={locationData.allowedRadiusMeters}
                                        onChange={(e) =>
                                            setLocationData((prev) => ({
                                                ...prev,
                                                allowedRadiusMeters: parseInt(e.target.value, 10) || 0,
                                            }))
                                        }
                                    />
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        학생이 해당 위치 중심점 기준 <b>{locationData.allowedRadiusMeters}m</b> 이내에 위치해야만 출석 체크가 승인됩니다.
                                    </p>
                                </div>

                                <div className="pt-2 flex flex-col gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleGetCurrentLocation}
                                        disabled={gettingGps}
                                        className="w-full gap-2 text-zinc-700 dark:text-zinc-300"
                                    >
                                        {gettingGps ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Navigation className="w-4 h-4 text-blue-600" />
                                        )}
                                        내 현재 위치 GPS 가져오기
                                    </Button>

                                    <Button type="submit" disabled={saving} className="w-full gap-2 font-semibold">
                                        {saving ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                        위치 및 반경 정보 저장
                                    </Button>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>

                {/* Map Display Section */}
                <Card className="lg:col-span-7 shadow-sm flex flex-col">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-red-500" />
                                대화형 지도 (클릭하여 위치 선택)
                            </CardTitle>
                            <a
                                href={externalMapUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-600 hover:underline font-medium"
                            >
                                구글 지도에서 크게 보기 ↗
                            </a>
                        </div>
                        <CardDescription className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                            <MousePointerClick className="w-4 h-4 shrink-0" />
                            지도의 원하는 지점을 클릭하면 해당 위도/경도가 왼쪽 입력창에 즉시 반영됩니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-[380px] p-4 pt-0 flex flex-col gap-3">
                        {/* Interactive Leaflet Map Container */}
                        <div className="relative w-full h-[360px] lg:h-[400px] rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-inner z-0">
                            {!loading && (
                                <MapPicker
                                    latitude={locationData.latitude}
                                    longitude={locationData.longitude}
                                    radius={locationData.allowedRadiusMeters}
                                    onSelectLocation={handleMapSelectLocation}
                                />
                            )}
                            {/* Overlay Badge for Radius */}
                            <div className="absolute top-3 left-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-3 py-1.5 rounded-md shadow-md border border-zinc-200 dark:border-zinc-700 flex items-center gap-2 text-xs font-semibold z-[1000]">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                                허용 반경 범례: <span className="text-blue-600 dark:text-blue-400 font-extrabold">{locationData.allowedRadiusMeters}m 원형 영역</span>
                            </div>
                        </div>

                        {/* Location details card */}
                        <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 gap-2">
                            <div>
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">위치 명칭: </span>
                                {locationData.name || "학원"}
                            </div>
                            <div className="flex items-center gap-4">
                                <div>
                                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">선택 위도: </span>
                                    {locationData.latitude}
                                </div>
                                <div>
                                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">선택 경도: </span>
                                    {locationData.longitude}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
