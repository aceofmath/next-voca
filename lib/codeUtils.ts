import { supabase } from "@/lib/supabaseClient";
import { CommonCode, DEFAULT_CATEGORY_MAP } from "@/lib/codeTypes";

const LOCAL_STORAGE_KEY = "jokim_academy_common_codes_v1";

export const INITIAL_CODE_SAMPLES: CommonCode[] = [
    // ROOM
    { id: "c-room-1", category: "ROOM", codeValue: "101", codeName: "101호", sortOrder: 1, isUse: true, description: "소형 강의실 (정원 15명)" },
    { id: "c-room-2", category: "ROOM", codeValue: "102", codeName: "102호", sortOrder: 2, isUse: true, description: "소형 강의실 (정원 15명)" },
    { id: "c-room-3", category: "ROOM", codeValue: "201", codeName: "201호", sortOrder: 3, isUse: true, description: "중형 강의실 (정원 25명)" },
    { id: "c-room-4", category: "ROOM", codeValue: "301", codeName: "301호", sortOrder: 4, isUse: true, description: "중형 강의실 (정원 25명)" },
    { id: "c-room-5", category: "ROOM", codeValue: "MAIN", codeName: "대강의실", sortOrder: 5, isUse: true, description: "대형 특강 전용 (정원 50명)" },

    // GRADE
    { id: "c-grade-1", category: "GRADE", codeValue: "M3", codeName: "중3", sortOrder: 1, isUse: true, description: "중등부 3학년" },
    { id: "c-grade-2", category: "GRADE", codeValue: "H1", codeName: "고1", sortOrder: 2, isUse: true, description: "고등부 1학년" },
    { id: "c-grade-3", category: "GRADE", codeValue: "H2", codeName: "고2", sortOrder: 3, isUse: true, description: "고등부 2학년" },
    { id: "c-grade-4", category: "GRADE", codeValue: "H3", codeName: "고3", sortOrder: 4, isUse: true, description: "고등부 3학년" },
    { id: "c-grade-5", category: "GRADE", codeValue: "N", codeName: "N수/재수", sortOrder: 5, isUse: true, description: "수능 전문반" },
];

// Fetch common codes from Supabase (or LocalStorage fallback)
export const fetchCommonCodes = async (categoryFilter?: string): Promise<CommonCode[]> => {
    try {
        let query = supabase.from("code").select("*").order("sort_order", { ascending: true });
        if (categoryFilter && categoryFilter !== "ALL") {
            query = query.eq("category", categoryFilter);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
            const mapped = data.map((item: any) => ({
                id: item.id,
                category: item.category,
                codeValue: item.code_value || item.codeValue,
                codeName: item.code_name || item.codeName,
                sortOrder: item.sort_order ?? item.sortOrder ?? 1,
                isUse: item.is_use ?? item.isUse ?? true,
                description: item.description || "",
                createdAt: item.created_at || item.createdAt,
            }));

            if (typeof window !== "undefined" && (!categoryFilter || categoryFilter === "ALL")) {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mapped));
            }
            return mapped;
        }
    } catch (err) {
        console.warn("Supabase code fetch error, falling back to LocalStorage:", err);
    }

    // LocalStorage Fallback
    if (typeof window !== "undefined") {
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localData) {
            try {
                const parsed: CommonCode[] = JSON.parse(localData);
                if (categoryFilter && categoryFilter !== "ALL") {
                    return parsed.filter((c) => c.category === categoryFilter);
                }
                return parsed;
            } catch (e) {
                console.error("Failed to parse local code data:", e);
            }
        }
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_CODE_SAMPLES));
    }

    if (categoryFilter && categoryFilter !== "ALL") {
        return INITIAL_CODE_SAMPLES.filter((c) => c.category === categoryFilter);
    }
    return INITIAL_CODE_SAMPLES;
};

// Save Common Code (Create / Update)
export const saveCommonCode = async (codeItem: CommonCode): Promise<CommonCode[]> => {
    const currentList = await fetchCommonCodes("ALL");
    const existingIndex = currentList.findIndex((c) => c.id === codeItem.id);

    let updatedList: CommonCode[] = [];
    if (existingIndex >= 0) {
        updatedList = [...currentList];
        updatedList[existingIndex] = codeItem;
    } else {
        updatedList = [...currentList, codeItem];
    }

    // 1. Supabase update
    try {
        await supabase.from("code").upsert({
            id: codeItem.id,
            category: codeItem.category,
            code_value: codeItem.codeValue,
            code_name: codeItem.codeName,
            sort_order: codeItem.sortOrder,
            is_use: codeItem.isUse,
            description: codeItem.description,
        });
    } catch (err) {
        console.warn("Supabase code save error, persisting in LocalStorage only:", err);
    }

    // 2. LocalStorage save
    if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
    }

    return updatedList;
};

// Delete Common Code
export const deleteCommonCode = async (id: string): Promise<CommonCode[]> => {
    const currentList = await fetchCommonCodes("ALL");
    const updatedList = currentList.filter((c) => c.id !== id);

    try {
        await supabase.from("code").delete().eq("id", id);
    } catch (err) {
        console.warn("Supabase code delete error, updating LocalStorage only:", err);
    }

    if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
    }

    return updatedList;
};
