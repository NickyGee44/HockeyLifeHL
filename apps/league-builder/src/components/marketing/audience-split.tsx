'use client';

export function AudienceSplit() {
    return (
        <section className="relative w-full py-32 bg-[#0B0E14] border-y border-white/5">
            <div className="max-w-6xl mx-auto px-6">

                <div className="text-center mb-20">
                    <h2 className="font-heading text-4xl md:text-5xl font-bold tracking-tight text-white uppercase">
                        One System. <span className="text-accent">Two Views.</span>
                    </h2>
                    <p className="mt-4 text-lg text-neutral-400 max-w-2xl mx-auto font-medium">
                        A single source of truth that serves both the people running the league, and the people skating in it.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 md:gap-12">

                    {/* Organizer Column */}
                    <div className="surface-premium p-10 rounded-[2.5rem] flex flex-col border border-accent/20">
                        <div className="mb-8">
                            <span className="text-xs font-mono text-accent uppercase tracking-widest">For Operators</span>
                            <h3 className="text-3xl font-bold text-white mt-2">The Control Room</h3>
                        </div>

                        <ul className="space-y-6 flex-1 text-neutral-300 font-medium">
                            <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5"><div className="w-2 h-2 rounded-full bg-accent" /></div>
                                <span>Less admin overhead and redundant data entry</span>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5"><div className="w-2 h-2 rounded-full bg-accent" /></div>
                                <span>Automated payment chasing and tracking</span>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5"><div className="w-2 h-2 rounded-full bg-accent" /></div>
                                <span>Centralized communication logs</span>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5"><div className="w-2 h-2 rounded-full bg-accent" /></div>
                                <span>Professional public brand presence</span>
                            </li>
                        </ul>
                    </div>

                    {/* Player Column */}
                    <div className="surface-premium p-10 rounded-[2.5rem] flex flex-col border border-ice/20 bg-gradient-to-br from-white/[0.02] to-transparent">
                        <div className="mb-8">
                            <span className="text-xs font-mono text-ice uppercase tracking-widest">For Players</span>
                            <h3 className="text-3xl font-bold text-white mt-2">The Locker Room</h3>
                        </div>

                        <ul className="space-y-6 flex-1 text-neutral-300 font-medium">
                            <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-ice/20 flex items-center justify-center shrink-0 mt-0.5"><div className="w-2 h-2 rounded-full bg-ice" /></div>
                                <span>Instant schedule access without scrolling chats</span>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-ice/20 flex items-center justify-center shrink-0 mt-0.5"><div className="w-2 h-2 rounded-full bg-ice" /></div>
                                <span>Live standings, stats, and game histories</span>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-ice/20 flex items-center justify-center shrink-0 mt-0.5"><div className="w-2 h-2 rounded-full bg-ice" /></div>
                                <span>Visible payment status and easy fee settlement</span>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-ice/20 flex items-center justify-center shrink-0 mt-0.5"><div className="w-2 h-2 rounded-full bg-ice" /></div>
                                <span>Reliable game reminders and push notifications</span>
                            </li>
                        </ul>
                    </div>

                </div>
            </div>
        </section>
    );
}
