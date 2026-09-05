import { format } from "date-fns";

/**
 * Get current Date object shifted to Korea Standard Time (KST, UTC+9).
 */
export function getKSTNow(): Date {
    const now = new Date();
    const kstOffset = 9 * 60; // 9 hours in minutes
    const localOffset = now.getTimezoneOffset(); // in minutes
    return new Date(now.getTime() + (kstOffset + localOffset) * 60 * 1000);
}

/**
 * Get current KST date string in YYYY-MM-DD format.
 */
export function getKSTDateString(date?: Date): string {
    const targetDate = date ? date : getKSTNow();
    return format(targetDate, "yyyy-MM-dd");
}

/**
 * Get current KST time in ISO format with +09:00 timezone offset.
 * Example: "2026-09-05T17:25:00+09:00"
 */
export function getKSTISOString(date?: Date): string {
    const kstDate = date ? date : getKSTNow();
    const year = kstDate.getFullYear();
    const month = String(kstDate.getMonth() + 1).padStart(2, "0");
    const day = String(kstDate.getDate()).padStart(2, "0");
    const hours = String(kstDate.getHours()).padStart(2, "0");
    const minutes = String(kstDate.getMinutes()).padStart(2, "0");
    const seconds = String(kstDate.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;
}
