import { ImageResponse } from "next/og";

export const size = {
    width: 32,
    height: 32,
};
export const contentType = "image/png";

export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#000000",
                    borderRadius: "6px",
                }}
            >
                <svg width="24" height="24" viewBox="0 0 64 64" fill="none">
                    <g fill="#ffffff">
                        <path d="M 9.5 32 C 9.5 24.8 15.3 19 22.5 19 C 27.3 19 31.5 21.6 33.8 25.6 L 38.5 32 L 33.8 38.4 C 31.5 42.4 27.3 45 22.5 45 C 15.3 45 9.5 39.2 9.5 32 Z M 22.5 24 C 18.1 24 14.5 27.6 14.5 32 C 14.5 36.4 18.1 40 22.5 40 C 25.5 40 28.1 38.4 29.5 36 L 31.9 32 L 29.5 28 C 28.1 25.6 25.5 24 22.5 24 Z"/>
                        <path d="M 54.5 32 C 54.5 39.2 48.7 45 41.5 45 C 36.7 45 32.5 42.4 30.2 38.4 L 25.5 32 L 30.2 25.6 C 32.5 21.6 36.7 19 41.5 19 C 48.7 19 54.5 24.8 54.5 32 Z M 41.5 40 C 45.9 40 49.5 36.4 49.5 32 C 49.5 27.6 45.9 24 41.5 44 C 38.5 40 35.9 25.6 34.5 28 L 32.1 32 L 34.5 36 C 35.9 38.4 38.5 40 41.5 40 Z"/>
                    </g>
                    <path d="M 35.5 24 L 29.5 32 L 35.5 40" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
            </div>
        ),
        {
            ...size,
        }
    );
}
