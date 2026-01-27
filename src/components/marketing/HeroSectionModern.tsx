'use client'
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Menu, X, ChevronRight } from 'lucide-react'
import { useScroll, motion } from 'framer-motion'
import { platformConfig } from '@/lib/league-config'

export function HeroSectionModern() {
    return (
        <>
            <HeroHeader />
            <section className="relative overflow-x-hidden">
                {/* Video Background - Behind everything */}
                <div className="absolute inset-0 -z-10 overflow-hidden">
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="size-full object-cover opacity-30 dark:opacity-20"
                        src="/hero-video.mp4"></video>
                    {/* Blur overlay */}
                    <div className="absolute inset-0 backdrop-blur-sm bg-background/60 dark:bg-background/70"></div>
                </div>

                {/* Content - In front of video */}
                <div className="py-24 md:py-32 lg:py-40">
                    <div className="relative z-10 mx-auto flex max-w-7xl flex-col px-6 lg:px-12">
                        <div className="mx-auto max-w-3xl text-center">
                            <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-display font-bold">
                                Modern League Management
                            </h1>
                            <p className="mt-8 text-xl md:text-2xl text-muted-foreground">
                                {platformConfig.slogan} Complete platform for drafts, stats, payments, and everything your beer league needs.
                            </p>

                            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
                                <Button
                                    asChild
                                    size="lg"
                                    className="h-14 rounded-full px-8 text-lg bg-[#1F4FD8] hover:bg-[#1F4FD8]/90">
                                    <Link href="/signup">
                                        <span className="text-nowrap">Start Your League</span>
                                        <ChevronRight className="ml-2" />
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    size="lg"
                                    variant="outline"
                                    className="h-14 rounded-full px-8 text-lg hover:bg-background/80">
                                    <Link href="https://pilot.beerleaguehockey.ca">
                                        <span className="text-nowrap">View Demo League</span>
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}

const menuItems = [
    { name: 'Features', href: '#features' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Demo League', href: 'https://pilot.beerleaguehockey.ca' },
]

const HeroHeader = () => {
    const [menuState, setMenuState] = React.useState(false)
    const [scrolled, setScrolled] = React.useState(false)
    const { scrollYProgress } = useScroll()

    React.useEffect(() => {
        const unsubscribe = scrollYProgress.on('change', (latest) => {
            setScrolled(latest > 0.05)
        })
        return () => unsubscribe()
    }, [scrollYProgress])

    return (
        <header>
            <nav
                data-state={menuState && 'active'}
                className="group fixed z-20 w-full pt-2">
                <div className={cn('mx-auto max-w-7xl rounded-3xl px-6 transition-all duration-300 lg:px-12', scrolled && 'bg-background/50 backdrop-blur-2xl')}>
                    <motion.div
                        key={1}
                        className={cn('relative flex flex-wrap items-center justify-between gap-6 py-3 duration-200 lg:gap-0 lg:py-6', scrolled && 'lg:py-4')}>
                        <div className="flex w-full items-center justify-between gap-12 lg:w-auto">
                            <Link
                                href="/"
                                aria-label="home"
                                className="flex items-center space-x-2">
                                <Image
                                    src={platformConfig.icon}
                                    alt={platformConfig.name}
                                    width={32}
                                    height={32}
                                    className="h-8 w-auto"
                                />
                                <span className="font-display text-xl font-bold text-[#1F4FD8]">
                                    {platformConfig.name}
                                </span>
                            </Link>

                            <button
                                onClick={() => setMenuState(!menuState)}
                                aria-label={menuState == true ? 'Close Menu' : 'Open Menu'}
                                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden">
                                <Menu className="group-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                                <X className="group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
                            </button>

                            <div className="hidden lg:block">
                                <ul className="flex gap-8 text-sm">
                                    {menuItems.map((item, index) => (
                                        <li key={index}>
                                            <Link
                                                href={item.href}
                                                className="text-muted-foreground hover:text-accent-foreground block duration-150">
                                                <span>{item.name}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="bg-background group-data-[state=active]:block lg:group-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
                            <div className="lg:hidden">
                                <ul className="space-y-6 text-base">
                                    {menuItems.map((item, index) => (
                                        <li key={index}>
                                            <Link
                                                href={item.href}
                                                className="text-muted-foreground hover:text-accent-foreground block duration-150">
                                                <span>{item.name}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm">
                                    <Link href="/login">
                                        <span>Sign In</span>
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    size="sm"
                                    className="bg-[#1F4FD8] hover:bg-[#1F4FD8]/90">
                                    <Link href="/signup">
                                        <span>Start Your League</span>
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </nav>
        </header>
    )
}
