'use client';

export function AudienceSplit() {
    return (
        <section id="why-blh" className="relative w-full py-32 bg-[#0B0E14] border-y border-white/5">
            <div className="max-w-6xl mx-auto px-6">

                <div className="text-center mb-20">
                    <h2 className="font-heading text-4xl md:text-5xl font-bold tracking-tight text-white uppercase">
                        Why commissioners <span className="text-accent">switch to BLH.</span>
                    </h2>
                    <p className="mt-4 text-lg text-neutral-400 max-w-2xl mx-auto font-medium">
                        Commissioners buy BLH to reduce admin chaos. Players keep using it because schedules, standings, stats, and payments finally live in one place.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 md:gap-12">

                    {/* Organizer Column */}
                    <div className="surface-premium p-10 rounded-[2.5rem] flex flex-col border border-accent/20">
                        <div className="mb-8">
                            <span className="text-xs font-mono text-accent uppercase tracking-widest">For Commissioners</span>
                            <h3 className="text-3xl font-bold text-white mt-2">Reduce weekly admin follow-up</h3>
                        </div>

                        <ul className="space-y-6 flex-1 text-neutral-300 font-medium">
                            <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5"><div className="w-2 h-2 rounded-full bg-accent" /></div>
                                <span>Collect and track fees without chasing everyone manually</span>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5"><div className="w-2 h-2 rounded-full bg-accent" /></div>
                                <span>Make schedule changes from one system, not spreadsheets and side chats</span>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5"><div className="w-2 h-2 rounded-full bg-accent" /></div>
                                <span>Keep your public league site current without duplicate data entry</span>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5"><div className="w-2 h-2 rounded-full bg-accent" /></div>
                                <span>Give captains, staff, and players one source of truth for the season</span>
                            </li>
                        </ul>
                    </div>

                    {/* Player Column */}
                    <div className="surface-premium p-10 rounded-[2.5rem] flex flex-col border border-ice/20 bg-gradient-to-br from-white/[0.02] to-transparent">
                        <div className="mb-8">
                            <span className="text-xs font-mono text-ice uppercase tracking-widest">For Players</span>
                            <h3 className="text-3xl font-bold text-white mt-2">Give players a league they actually use</h3>
                        </div>

                        <ul className="space-y-6 flex-1 text-neutral-300 font-medium">
                            <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-ice/20 flex items-center justify-center shrink-0 mt-0.5"><div className="w-2 h-2 rounded-full bg-ice" /></div>
                                <span>Check schedules, standings, and stats without digging through chats</span>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-ice/20 flex items-center justify-center shrink-0 mt-0.5"><div className="w-2 h-2 rounded-full bg-ice" /></div>
                                <span>See payment status and league updates in one place</span>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-ice/20 flex items-center justify-center shrink-0 mt-0.5"><div className="w-2 h-2 rounded-full bg-ice" /></div>
                                <span>Get cleaner reminders before game night</span>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-ice/20 flex items-center justify-center shrink-0 mt-0.5"><div className="w-2 h-2 rounded-full bg-ice" /></div>
                                <span>Use a public league site that actually feels current</span>
                            </li>
                        </ul>
                    </div>

                </div>
            </div>
        </section>
    );
}
