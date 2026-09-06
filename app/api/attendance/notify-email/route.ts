import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
    try {
        const { studentUserId, studentName, type, dateTime } = await req.json();

        if (!studentUserId || !type || !dateTime) {
            return NextResponse.json({ error: "필수 요청 파라미터가 누락되었습니다." }, { status: 400 });
        }

        // 1. profile 테이블에서 adminYn이 true인 관리자 유저들의 Email 조회
        const { data: admins, error: adminErr } = await supabase
            .from("profile")
            .select("Email, name")
            .eq("adminYn", true);

        if (adminErr) {
            console.error("관리자 목록 조회 오류:", adminErr.message);
            return NextResponse.json({ error: "관리자 정보를 불러오는데 실패했습니다." }, { status: 500 });
        }

        if (!admins || admins.length === 0) {
            return NextResponse.json({ message: "메시지를 수신할 관리자가 없습니다." }, { status: 200 });
        }

        // 이메일 주소 추출 및 유효성 필터링
        const adminEmails = admins
            .map((admin) => admin.Email)
            .filter((email): email is string => Boolean(email && email.trim() !== ""));

        if (adminEmails.length === 0) {
            return NextResponse.json({ message: "등록된 이메일 주소가 있는 관리자가 없습니다." }, { status: 200 });
        }

        // 2. 환경변수 확인 (GMAIL_USER, GMAIL_APP_PASSWORD)
        const gmailUser = process.env.GMAIL_USER;
        const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

        if (!gmailUser || !gmailAppPassword) {
            console.warn("Gmail SMTP 환경변수(GMAIL_USER 또는 GMAIL_APP_PASSWORD)가 설정되지 않았습니다.");
            return NextResponse.json(
                { error: ".env.local 파일에 GMAIL_USER 및 GMAIL_APP_PASSWORD 설정이 필요합니다." },
                { status: 500 }
            );
        }

        // 3. Nodemailer transporter 생성
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: gmailUser,
                pass: gmailAppPassword,
            },
        });

        const actionText = type === "CHECK_IN" ? "등원 🔵" : "하원 🔴";
        const subject = `[출석 알림] ${studentName} 학생이 ${type === "CHECK_IN" ? "등원" : "하원"}하였습니다.`;

        // 4. HTML 이메일 템플릿
        const htmlContent = `
            <div style="font-family: 'Pretendard', sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
                <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin-bottom: 16px; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">
                    📢 학생 출석 알림
                </h2>
                <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 6px 0; font-size: 15px; color: #374151;">
                        <strong>학생 이름:</strong> <span style="color: #1d4ed8; font-weight: 600;">${studentName}</span>
                    </p>
                    <p style="margin: 6px 0; font-size: 15px; color: #374151;">
                        <strong>구분:</strong> <span style="font-weight: 600;">${actionText}</span>
                    </p>
                    <p style="margin: 6px 0; font-size: 15px; color: #374151;">
                        <strong>일시:</strong> ${dateTime}
                    </p>
                </div>
                <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
                    본 메일은 출석 관리 시스템에서 자동으로 발송되었습니다.
                </p>
            </div>
        `;

        // 5. 메일 발송
        await transporter.sendMail({
            from: `"출석 알림 시스템" <${gmailUser}>`,
            to: adminEmails.join(", "),
            subject,
            html: htmlContent,
        });

        return NextResponse.json({ success: true, recipientCount: adminEmails.length });
    } catch (err: any) {
        console.error("이메일 전송 예외 발생:", err);
        return NextResponse.json({ error: err.message || "이메일 전송에 실패했습니다." }, { status: 500 });
    }
}
