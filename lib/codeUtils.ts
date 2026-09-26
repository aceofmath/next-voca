import { supabase } from "@/lib/supabaseClient";
import { CommonCode } from "@/lib/codeTypes";

const LOCAL_STORAGE_KEY = "jokim_academy_common_codes_v1";

// UUID 형식이 맞는지 검증 함수
const isValidUUID = (str?: string): boolean => {
    if (!str) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
};

// Fetch common codes directly from Supabase `code` table (or LocalStorage fallback)
export const fetchCommonCodes = async (categoryFilter?: string): Promise<CommonCode[]> => {
    try {
        let query = supabase.from("code").select("*").order("sort_order", { ascending: true });
        if (categoryFilter && categoryFilter !== "ALL") {
            query = query.eq("category", categoryFilter);
        }

        const { data, error } = await query;
        if (!error && data) {
            const mapped: CommonCode[] = data.map((item: any) => ({
                id: item.id,
                category: item.category,
                codeValue: item.code_value || item.codeValue,
                codeName: item.code_name || item.codeName,
                supCategory: item.sup_category !== undefined ? item.sup_category : null,
                sortOrder: item.sort_order ?? item.sortOrder ?? 0,
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

    // LocalStorage Fallback (DB 연결 실패 시)
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
    }

    return [];
};

// Save Common Code to Supabase `code` table (Create / Update)
export const saveCommonCode = async (codeItem: CommonCode): Promise<CommonCode[]> => {
    try {
        const payload: any = {
            category: codeItem.category,
            code_value: codeItem.codeValue,
            code_name: codeItem.codeName,
            sup_category: codeItem.supCategory !== undefined && codeItem.supCategory !== null ? codeItem.supCategory : null,
            sort_order: codeItem.sortOrder,
            is_use: codeItem.isUse,
            description: codeItem.description,
        };

        // UUID 검증: 올바른 UUID 형식인 경우에만 id 포함 (신규 생성이면 id 생략하여 Supabase UUID 자동 생성)
        if (codeItem.id && isValidUUID(codeItem.id)) {
            payload.id = codeItem.id;
        }

        const { error } = await supabase.from("code").upsert(payload);

        if (error) {
            console.error("Supabase code upsert error:", error);
            throw error;
        }
    } catch (err) {
        console.warn("Supabase code save error:", err);
        throw err;
    }

    // 최신 DB 목록 재조회
    return fetchCommonCodes("ALL");
};

// Delete Common Code from Supabase `code` table
export const deleteCommonCode = async (id: string): Promise<CommonCode[]> => {
    try {
        const { error } = await supabase.from("code").delete().eq("id", id);
        if (error) {
            console.error("Supabase code delete error:", error);
            throw error;
        }
    } catch (err) {
        console.warn("Supabase code delete error:", err);
        throw err;
    }

    // 최신 DB 목록 재조회
    return fetchCommonCodes("ALL");
};
