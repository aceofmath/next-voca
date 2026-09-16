export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface ScheduleItem {
    id: string;
    title: string;
    instructor: string;
    room: string;
    targetGrade: string;
    dayOfWeek: DayOfWeek;
    startTime: string; // HH:mm format, e.g., "09:00", "14:30"
    endTime: string;   // HH:mm format, e.g., "10:30", "16:00"
    color: string;     // Hex color or palette key
    description?: string;
    createdAt?: string;
}

export const DAYS_OF_WEEK: { key: DayOfWeek; label: string; short: string }[] = [
    { key: "mon", label: "월요일", short: "월" },
    { key: "tue", label: "화요일", short: "화" },
    { key: "wed", label: "수요일", short: "수" },
    { key: "thu", label: "목요일", short: "목" },
    { key: "fri", label: "금요일", short: "금" },
    { key: "sat", label: "토요일", short: "토" },
    { key: "sun", label: "일요일", short: "일" },
];

export const COLOR_PALETTE = [
    { label: "블루", value: "#3b82f6", bg: "bg-blue-500", text: "text-blue-50", border: "border-blue-600" },
    { label: "인디고", value: "#6366f1", bg: "bg-indigo-500", text: "text-indigo-50", border: "border-indigo-600" },
    { label: "퍼플", value: "#8b5cf6", bg: "bg-purple-500", text: "text-purple-50", border: "border-purple-600" },
    { label: "핑크", value: "#ec4899", bg: "bg-pink-500", text: "text-pink-50", border: "border-pink-600" },
    { label: "에메랄드", value: "#10b981", bg: "bg-emerald-500", text: "text-emerald-50", border: "border-emerald-600" },
    { label: "엠버", value: "#f59e0b", bg: "bg-amber-500", text: "text-amber-50", border: "border-amber-600" },
    { label: "로즈", value: "#f43f5e", bg: "bg-rose-500", text: "text-rose-50", border: "border-rose-600" },
    { label: "시안", value: "#06b6d4", bg: "bg-cyan-500", text: "text-cyan-50", border: "border-cyan-600" },
];

// Generate time slots from 09:00 to 24:00 every 30 minutes
export const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    for (let hour = 9; hour <= 24; hour++) {
        const hStr = hour < 10 ? `0${hour}` : `${hour}`;
        slots.push(`${hStr}:00`);
        if (hour < 24) {
            slots.push(`${hStr}:30`);
        }
    }
    return slots;
};

// Convert HH:mm to total minutes from 00:00
export const timeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
};

// Convert total minutes from 00:00 to HH:mm
export const minutesToTime = (totalMinutes: number): string => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const hStr = h < 10 ? `0${h}` : `${h}`;
    const mStr = m < 10 ? `0${m}` : `${m}`;
    return `${hStr}:${mStr}`;
};
