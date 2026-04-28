import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, GraduationCap, Heart, Star, Target, Users } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
    return (
        <main className="flex-1 w-full max-w-5xl mx-auto py-12 md:py-24 px-6">
            {/* 히어로 섹션 */}
            <div className="text-center mb-20">
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-black dark:text-white mb-6">
                    꿈을 향한 가장 확실한 가이드 <br />
                    <span className="text-blue-600">터키영어</span>입니다.
                </h1>
                <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                    단순한 암기를 넘어, 영어가 학생의 미래에 강력한 도구가 될 수 있도록 <br className="hidden md:inline" />
                    밀착 관리와 체계적인 커리큘럼을 제공합니다.
                </p>
            </div>

            {/* 교육 철학 섹션 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
                <div className="space-y-6">
                    <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                        <Heart className="text-red-500 w-8 h-8" />
                        진심을 다하는 교육
                    </h2>
                    <p className="text-zinc-600 dark:text-zinc-400 leading-loose">
                        아이들이 영어를 포기하지 않고 끝까지 완주할 수 있는 힘은 &apos;관심&apos;에서 나옵니다. 터키영어는 단순히 지식을 전달하는 것을 넘어, 학생 개개인의 학습 습관과 심리적 상태까지 세심하게 살피는 1:1 밀착 관리를 원칙으로 합니다.
                    </p>
                    <div className="space-y-3">
                        {["개별 맞춤형 단어 암기 시스템", "철저한 당일 복습 및 확인 학습", "학부모님과의 정기적인 학습 상담"].map((item, index) => (
                            <div key={index} className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                                <CheckCircle2 className="text-blue-500 w-5 h-5" />
                                <span className="font-medium">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-zinc-100 dark:bg-zinc-900 rounded-3xl aspect-square flex items-center justify-center p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4">
                        <Star className="text-amber-400 w-12 h-12 animate-pulse" />
                    </div>
                    <GraduationCap className="w-40 h-40 text-blue-600/20 dark:text-blue-400/20" />
                    <p className="absolute bottom-10 text-center font-bold text-lg text-zinc-800 dark:text-zinc-200">&ldquo;결과로 증명하는 꼼꼼함&rdquo;</p>
                </div>
            </div>

            {/* 핵심 시스템 섹션 */}
            <div className="mb-24 text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-12">터키영어의 3대 핵심 시스템</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        {
                            icon: <Target className="w-8 h-8 text-blue-600" />,
                            title: "확실한 목표 설정",
                            desc: "내신부터 수능까지, 수준별 목표를 설정하고 달성할 때까지 함께합니다.",
                        },
                        {
                            icon: <Users className="w-8 h-8 text-green-600" />,
                            title: "소수 정예 수업",
                            desc: "질문이 자유로운 환경에서 부족한 부분을 즉시 채워나가는 양방향 소통 수업입니다.",
                        },
                        {
                            icon: <CheckCircle2 className="w-8 h-8 text-purple-600" />,
                            title: "완벽한 피드백",
                            desc: "매 수업 후 진행되는 일일 테스트와 오답 노트를 통해 취약점을 완벽히 보완합니다.",
                        },
                    ].map((feature, i) => (
                        <Card key={i} className="border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-shadow">
                            <CardContent className="pt-8 text-center space-y-4">
                                <div className="mx-auto w-16 h-16 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">{feature.icon}</div>
                                <h3 className="font-bold text-xl">{feature.title}</h3>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{feature.desc}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* 하단 CTA */}
            <div className="bg-blue-600 rounded-3xl p-8 md:p-12 text-center text-white space-y-6 shadow-xl shadow-blue-500/20">
                <h2 className="text-2xl md:text-3xl font-bold">지금 터키영어와 함께 성장을 시작하세요!</h2>
                <p className="text-blue-100 max-w-xl mx-auto">
                    학습에 대한 고민이 있다면 언제든 편하게 문의주세요. <br />
                    함께 고민하고 최선의 길을 찾아내겠습니다.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <Button asChild size="lg" variant="secondary" className="font-bold text-blue-600 rounded-full h-12 px-8">
                        <Link href="/engword">온라인 단어장 체험</Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-blue-600 font-bold rounded-full h-12 px-8">
                        <a href="tel:010-0000-0000">상담 예약하기</a>
                    </Button>
                </div>
            </div>
        </main>
    );
}
