import { supabase } from "@/lib/supabaseClient";

export interface StudentProfile {
    user_id: string;
    name: string;
    Email?: string | null;
    grade?: string | null;
}

export interface ScheduleStudentMap {
    [scheduleId: string]: string[]; // schedule_id -> array of student_ids
}

const LOCAL_STORAGE_STUDENTS_KEY = "jokim_academy_schedule_students_v1";

// 1. 전체 학생 프로필 목록 조회 (강사 'T' 제외)
export const fetchAllStudentProfiles = async (): Promise<StudentProfile[]> => {
    try {
        const { data, error } = await supabase
            .from("profile")
            .select("user_id, name, Email, grade")
            .eq("grade", "S")
            .order("name", { ascending: true });

        if (!error && data) {
            return data.map((p: any) => ({
                user_id: p.user_id,
                name: p.name || "이름 없음",
                Email: p.Email || null,
                grade: p.grade || null,
            }));
        }
    } catch (err) {
        console.warn("Supabase profile fetch failed, fallback to empty list:", err);
    }
    return [];
};

// 2. 특정 시간표에 등록된 수강생 ID 목록 조회
export const fetchEnrolledStudentIds = async (scheduleId: string): Promise<string[]> => {
    if (!scheduleId) return [];

    try {
        const { data, error } = await supabase
            .from("schedule_students")
            .select("student_id")
            .eq("schedule_id", scheduleId);

        if (!error && data && data.length > 0) {
            return data.map((row: any) => row.student_id);
        }
    } catch (err) {
        console.warn("Supabase schedule_students fetch error:", err);
    }

    // LocalStorage Fallback (Supabase에 데이터가 없거나 RLS 오류 등으로 비어있는 경우)
    if (typeof window !== "undefined") {
        const localData = localStorage.getItem(LOCAL_STORAGE_STUDENTS_KEY);
        if (localData) {
            try {
                const map: ScheduleStudentMap = JSON.parse(localData);
                if (map[scheduleId] && map[scheduleId].length > 0) {
                    return map[scheduleId];
                }
            } catch (e) {
                console.error("Failed to parse local schedule_students data:", e);
            }
        }
    }

    return [];
};

// 3. 모든 시간표의 수강생 맵 조회 (시간표 그리드 카드 뱃지용)
export const fetchAllScheduleStudentsMap = async (): Promise<ScheduleStudentMap> => {
    const map: ScheduleStudentMap = {};

    let localMap: ScheduleStudentMap = {};
    if (typeof window !== "undefined") {
        const localData = localStorage.getItem(LOCAL_STORAGE_STUDENTS_KEY);
        if (localData) {
            try {
                localMap = JSON.parse(localData);
            } catch (e) {
                console.error("Failed to parse local schedule_students data:", e);
            }
        }
    }

    try {
        const { data, error } = await supabase
            .from("schedule_students")
            .select("schedule_id, student_id");

        if (!error && data && data.length > 0) {
            data.forEach((row: any) => {
                if (!map[row.schedule_id]) {
                    map[row.schedule_id] = [];
                }
                map[row.schedule_id].push(row.student_id);
            });

            if (typeof window !== "undefined") {
                localStorage.setItem(LOCAL_STORAGE_STUDENTS_KEY, JSON.stringify(map));
            }
            return map;
        }
    } catch (err) {
        console.warn("Supabase fetchAllScheduleStudentsMap error:", err);
    }

    return Object.keys(map).length > 0 ? map : localMap;
};

// 4. 수강생 등록 정보 일괄 저장/동기화 (schedule_id 기준)
export const syncScheduleStudents = async (
    scheduleId: string,
    studentIds: string[]
): Promise<void> => {
    if (!scheduleId) return;

    // 1. Supabase 처리
    try {
        // 기존 등록 데이터 삭제
        const { error: deleteError } = await supabase
            .from("schedule_students")
            .delete()
            .eq("schedule_id", scheduleId);

        if (deleteError) {
            console.error("Supabase schedule_students delete error:", deleteError);
        }

        // 새 데이터 삽입
        if (studentIds.length > 0) {
            const insertRows = studentIds.map((sId) => ({
                schedule_id: scheduleId,
                student_id: sId,
            }));

            const { error: insertError } = await supabase
                .from("schedule_students")
                .insert(insertRows);

            if (insertError) {
                console.error("Supabase schedule_students insert error (RLS 권한을 확인하세요):", insertError);
            }
        }
    } catch (err) {
        console.warn("Supabase syncScheduleStudents error, fallback to LocalStorage:", err);
    }

    // 2. LocalStorage 동기화
    if (typeof window !== "undefined") {
        try {
            const localData = localStorage.getItem(LOCAL_STORAGE_STUDENTS_KEY);
            const map: ScheduleStudentMap = localData ? JSON.parse(localData) : {};
            map[scheduleId] = studentIds;
            localStorage.setItem(LOCAL_STORAGE_STUDENTS_KEY, JSON.stringify(map));
        } catch (e) {
            console.error("Failed to update LocalStorage schedule_students:", e);
        }
    }
};
