export interface CommonCode {
    id: string;
    category: string;             // e.g. "ROOM", "GRADE", "DAY"
    codeValue: string;            // e.g. "101", "H1"
    codeName: string;             // e.g. "101호", "고1"
    supCategory?: string | null;  // null for Group Code, or parent group ID/key for sub-codes
    sortOrder: number;            // e.g. 1, 2, 3
    isUse: boolean;               // true/false
    description?: string;
    createdAt?: string;
}

export interface CodeCategoryInfo {
    category: string;
    name: string;
    description: string;
    count?: number;
}
