import Image from "next/image";

export default function Home() {
    return (
        /* 바디 (메인 콘텐츠) */
        <main className="flex-1 flex flex-col items-center justify-center py-20 px-8">
            <div className="w-full max-w-3xl flex flex-col items-center gap-12 text-center">
                <div className="flex flex-col items-center gap-6">
                    <h1 className="text-4xl font-bold tracking-tight text-black dark:text-zinc-50 sm:text-6xl">To get started, edit the page.tsx file.</h1>
                    <p className="max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
                        Looking for a starting point or more instructions? Head over to{" "}
                        <a href="https://vercel.com/templates?framework=next.js" className="font-medium text-zinc-950 dark:text-zinc-50 underline underline-offset-4">
                            Templates
                        </a>{" "}
                        or the{" "}
                        <a href="https://nextjs.org/learn" className="font-medium text-zinc-950 dark:text-zinc-50 underline underline-offset-4">
                            Learning
                        </a>{" "}
                        center.
                    </p>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row">
                    <a className="flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-8 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]" href="https://vercel.com/new" target="_blank" rel="noopener noreferrer">
                        <Image className="dark:invert" src="/vercel.svg" alt="Vercel logomark" width={16} height={16} />
                        Deploy Now
                    </a>
                    <a
                        className="flex h-12 items-center justify-center rounded-full border border-solid border-black/[.08] px-8 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
                        href="https://nextjs.org/docs"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Documentation
                    </a>
                </div>
            </div>
        </main>
    );
}
