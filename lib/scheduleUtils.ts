import { supabase } from "@/lib/supabaseClient";
import { ScheduleItem } from "@/lib/scheduleTypes";

const LOCAL_STORAGE_KEY = "jokim_academy_schedules_v1";

// Default initial empty list for fallback
export const INITIAL_SCHEDULE_SAMPLES: ScheduleItem[] = [];

// Load schedule items directly from Supabase (or LocalStorage fallback)
export const fetchScheduleItems = async (): Promise<ScheduleItem[]> => {
    try {
        // 1. Try Supabase query from `schedules` table
        const { data, error } = await supabase.from("schedules").select("*").order("created_at", { ascending: true });
        if (!error && data) {
            const mappedItems: ScheduleItem[] = data.map((item: any) => ({
                id: item.id,
                title: item.title,
                instructor: item.instructor || "미지정",
                room: item.room || "강의실 미지정",
                targetGrade: item.target_grade || item.targetGrade || "전체",
                dayOfWeek: item.day_of_week || item.dayOfWeek || "mon",
                startTime: item.start_time || item.startTime || "09:00",
                endTime: item.end_time || item.endTime || "10:00",
                color: item.color || "#3b82f6",
                description: item.description || "",
                createdAt: item.created_at || item.createdAt,
            }));

            // Sync to LocalStorage for offline cache
            if (typeof window !== "undefined") {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mappedItems));
            }
            return mappedItems;
        }
    } catch (err) {
        console.warn("Supabase fetch failed or table does not exist, falling back to LocalStorage:", err);
    }

    // 2. LocalStorage Fallback
    if (typeof window !== "undefined") {
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localData) {
            try {
                return JSON.parse(localData);
            } catch (e) {
                console.error("Failed to parse LocalStorage data:", e);
            }
        }
    }

    return [];
};

// Save schedule item (Create or Update)
export const saveScheduleItem = async (item: ScheduleItem): Promise<ScheduleItem[]> => {
    let updatedList: ScheduleItem[] = [];
    const currentList = await fetchScheduleItems();

    const existingIndex = currentList.findIndex((s) => s.id === item.id);
    if (existingIndex >= 0) {
        updatedList = [...currentList];
        updatedList[existingIndex] = item;
    } else {
        updatedList = [...currentList, item];
    }

    // 1. Try updating Supabase
    try {
        await supabase.from("schedules").upsert({
            id: item.id,
            title: item.title,
            instructor: item.instructor,
            room: item.room,
            target_grade: item.targetGrade,
            day_of_week: item.dayOfWeek,
            start_time: item.startTime,
            end_time: item.endTime,
            color: item.color,
            description: item.description,
        });
    } catch (err) {
        console.warn("Supabase save error, persisting to LocalStorage only:", err);
    }

    // 2. Save LocalStorage
    if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
    }

    return updatedList;
};

// Delete schedule item
export const deleteScheduleItem = async (id: string): Promise<ScheduleItem[]> => {
    const currentList = await fetchScheduleItems();
    const updatedList = currentList.filter((item) => item.id !== id);

    // 1. Try Supabase delete
    try {
        await supabase.from("schedules").delete().eq("id", id);
    } catch (err) {
        console.warn("Supabase delete error, updating LocalStorage only:", err);
    }

    // 2. Update LocalStorage
    if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
    }

    return updatedList;
};
