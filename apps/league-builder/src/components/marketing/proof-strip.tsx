const proofPoints = [
  {
    stat: 'One system',
    body: 'League ops, player checkout, and the public website all stay connected.',
  },
  {
    stat: 'Website included',
    body: 'No second vendor just to publish scores, standings, stats, sponsors, and news.',
  },
  {
    stat: 'Stripe stays separate',
    body: 'The league covers Stripe processing while BLH pricing can stay with player checkout.',
  },
  {
    stat: 'Built for hockey',
    body: 'Designed for commissioners, captains, and weekly league administration.',
  },
];

export function ProofStrip() {
  return (
    <section className="relative w-full border-y border-white/[0.07] bg-[#05080d]">
      <div className="mx-auto grid max-w-7xl gap-0 px-6 md:grid-cols-4">
        {proofPoints.map((point, index) => (
          <div
            key={point.stat}
            className={`py-6 md:px-6 md:py-7 ${
              index > 0 ? 'border-t border-white/[0.07] md:border-l md:border-t-0' : ''
            }`}
          >
            <p className="font-heading text-2xl font-bold uppercase tracking-tight text-white">
              {point.stat}
            </p>
            <p className="mt-2 max-w-xs text-sm leading-6 text-neutral-400">{point.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
