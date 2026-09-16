export interface CommonCode {
    id: string;
    category: string;     // e.g. "ROOM", "GRADE"
    codeValue: string;    // e.g. "101", "H1"
    codeName: string;     // e.g. "101호", "고1"
    sortOrder: number;    // e.g. 1, 2, 3
    isUse: boolean;       // true/false
    description?: string;
    createdAt?: string;
}

export interface CodeCategoryInfo {
    category: string;
    name: string;
    description: string;
    count: number;
}

export const DEFAULT_CATEGORY_MAP: Record<string, { name: string; description: string }> = {
    ROOM: { name: "강의실 목록", description: "시간표 및 클래스 배정용 강의실" },
    GRADE: { name: "수강 대상 (학년)", description: "학원 수강 대상 및 학년 분류" },
    DAY: { name: "요일 목록", description: "주간 시간표 요일 구분" },
};
