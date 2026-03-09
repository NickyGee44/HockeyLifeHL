'use client';

export function AudienceSplit() {
    return (
        <section id="why-blh" className="relative w-full py-20 md:py-32 bg-[#0B0E14] border-y border-white/5">
            <div className="max-w-6xl mx-auto px-6">

                <div className="text-center mb-12 md:mb-20">
                    <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white uppercase">
                        Why commissioners <span className="text-accent">switch to BLH.</span>
                    </h2>
                    <p className="mt-4 text-lg text-neutral-400 max-w-2xl mx-auto font-medium">
                        Built for the admins who run the show. Designed for the players on the ice.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 md:gap-12">

                    {/* Organizer Column */}
                    <div className="surface-premium p-6 md:p-10 rounded-3xl md:rounded-[2.5rem] flex flex-col border border-accent/20">
                        <div className="mb-6 md:mb-8">
                            <span className="text-[10px] md:text-xs font-mono text-accent uppercase tracking-widest">For Commissioners</span>
                            <h3 className="text-2xl md:text-3xl font-bold text-white mt-2">End the admin chaos</h3>
                        </div>

                        <ul className="space-y-6 flex-1 text-neutral-300 font-medium">
                            <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5"><div className="w-2 h-2 rounded-full bg-accent" /></div>
                                <span>Track fees without manually chasing anyone down</span>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5"><div className="w-2 h-2 rounded-full bg-accent" /></div>
                                <span>Manage schedules centrally, not in group chats</span>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5"><div className="w-2 h-2 rounded-full bg-accent" /></div>
                                <span>Auto-update standings and stats directly from the scoresheet</span>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5"><div className="w-2 h-2 rounded-full bg-accent" /></div>
                                <span>Give captains and staff one undisputed source of truth</span>
                            </li>
                        </ul>
                    </div>

                    {/* Player Column */}
                    <div className="surface-premium p-6 md:p-10 rounded-3xl md:rounded-[2.5rem] flex flex-col border border-ice/20 bg-gradient-to-br from-white/[0.02] to-transparent">
                        <div className="mb-6 md:mb-8">
                            <span className="text-[10px] md:text-xs font-mono text-ice uppercase tracking-widest">For Players</span>
                            <h3 className="text-2xl md:text-3xl font-bold text-white mt-2">A league they actually use</h3>
                        </div>

                        <ul className="space-y-6 flex-1 text-neutral-300 font-medium">
                            <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-ice/20 flex items-center justify-center shrink-0 mt-0.5"><div className="w-2 h-2 rounded-full bg-ice" /></div>
                                <span>Find schedules and standings without digging through emails</span>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-ice/20 flex items-center justify-center shrink-0 mt-0.5"><div className="w-2 h-2 rounded-full bg-ice" /></div>
                                <span>Check payment caps and personal balances instantly</span>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-ice/20 flex items-center justify-center shrink-0 mt-0.5"><div className="w-2 h-2 rounded-full bg-ice" /></div>
                                <span>Get clean, automated reminders before game night</span>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-ice/20 flex items-center justify-center shrink-0 mt-0.5"><div className="w-2 h-2 rounded-full bg-ice" /></div>
                                <span>Enjoy a website that feels modern and updates instantly</span>
                            </li>
                        </ul>
                    </div>

                </div>
            </div>
        </section>
    );
}
