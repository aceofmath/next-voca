import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle2, Globe, GraduationCap } from "lucide-react";

export default function Home() {
    return (
        <main className="flex-1 flex flex-col items-center justify-center py-12 md:py-24 px-6">
            <div className="w-full max-w-4xl flex flex-col items-center gap-16 text-center">
                {/* 히어로 섹션 */}
                <div className="flex flex-col items-center gap-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium mb-4">
                        <GraduationCap className="w-4 h-4" />
                        <span>스마트한 영어 학습의 시작</span>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-black dark:text-zinc-50 sm:text-7xl">
                        매일 성취하는 <br />
                        <span className="text-blue-600">나만의 영단어장</span>
                    </h1>
                    <p className="max-w-2xl text-lg md:text-xl leading-8 text-zinc-600 dark:text-zinc-400">
                        체계적인 Day별 학습 시스템으로 효율을 높이세요. <br className="hidden sm:inline" />
                        구글 계정 연동으로 언제 어디서든 이어서 학습할 수 있습니다.
                    </p>
                </div>

                {/* 액션 버튼 */}
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <Button asChild size="lg" className="h-14 px-10 text-lg font-bold rounded-full shadow-lg shadow-blue-500/20">
                        <Link href="/engword">학습 시작하기</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="h-14 px-10 text-lg font-bold rounded-full">
                        <Link href="/about">더 알아보기</Link>
                    </Button>
                </div>

                {/* 특징 카드 섹션 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full text-left mt-8">
                    <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-lg mb-2">Day별 학습</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">단계를 나누어 체계적으로 외우는 학습 관리 시스템을 제공합니다.</p>
                    </div>
                    <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 dark:text-green-400 mb-4">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-lg mb-2">학습 체크</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">외운 단어를 바로 체크하고 암기 상태를 직관적으로 확인할 수 있습니다.</p>
                    </div>
                    <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
                            <Globe className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-lg mb-2">멀티 디바이스</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">PC, 태블릿, 모바일 어디서나 최적화된 학습 환경을 경험하세요.</p>
                    </div>
                </div>
            </div>
        </main>
    );
}
