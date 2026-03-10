const proofPoints = [
    {
        title: 'Commissioner-first',
        body: 'Built around league operators, not a generic club template.',
    },
    {
        title: 'Registrations + payments',
        body: 'Collect fees and reduce weekly payment chasing.',
    },
    {
        title: 'Schedules + standings + stats',
        body: 'Keep season updates in one connected system.',
    },
    {
        title: 'Public league website',
        body: 'Publish schedules, standings, stats, sponsors, and news.',
    },
    {
        title: 'Built for beer league hockey',
        body: 'Commissioner-first workflows, not generic sports software.',
    },
];

export function ProofStrip() {
    return (
        <section className="relative w-full border-y border-white/5 bg-background-elevated py-8">
            <div className="mx-auto grid max-w-6xl gap-4 px-6 md:grid-cols-2 xl:grid-cols-5">
                {proofPoints.map((point) => (
                    <div
                        key={point.title}
                        className="rounded-[2rem] border border-white/10 bg-white/[0.03] px-5 py-5 shadow-surface"
                    >
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
                            {point.title}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-neutral-300">
                            {point.body}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}
