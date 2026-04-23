export default function AboutPage() {
    return (
        <main className="flex-1 flex flex-col items-center justify-center py-20 px-8">
            <div className="w-full max-w-3xl text-center">
                <h1 className="text-4xl font-bold tracking-tight text-black dark:text-zinc-50 sm:text-6xl">About Us</h1>
                <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400">이것은 ABOUT 페이지입니다. 루트 레이아웃을 수정했기 때문에 홈 페이지와 동일한 헤더 및 푸터를 공유합니다.</p>
            </div>
        </main>
    );
}
