import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

type Variant = 'vertical' | 'square' | 'wide';
type SceneProps = {
  duration: number;
  variant: Variant;
};

type SceneDefinition = {
  id: string;
  label: string;
  duration: number;
  caption: string;
  component: React.FC<SceneProps>;
};

type CaptionSegment = {
  start: number;
  end: number;
  text: string;
};

const monoStyle: React.CSSProperties = {
  fontFamily: '"IBM Plex Mono", monospace',
};

const flowSteps = [
  'Sign up',
  'League setup',
  'Teams',
  'Website + payments',
  'Go live',
];

const SCENE_DURATION = 156;

const sceneDefinitions: SceneDefinition[] = [
  {
    id: 'signup',
    label: 'Sign up',
    duration: SCENE_DURATION,
    caption: 'Sign up, add your organization, and start your league.',
    component: SignupScene,
  },
  {
    id: 'wizard',
    label: 'League setup',
    duration: SCENE_DURATION,
    caption: 'League Builder guides you through league info, season settings, and registration.',
    component: WizardScene,
  },
  {
    id: 'teams',
    label: 'Teams',
    duration: SCENE_DURATION,
    caption: 'Add teams, see launch readiness, and keep setup moving.',
    component: TeamsScene,
  },
  {
    id: 'website',
    label: 'Website + payments',
    duration: SCENE_DURATION,
    caption: 'Turn on the website, connect payments, and open registration.',
    component: WebsitePaymentsScene,
  },
  {
    id: 'live',
    label: 'Go live',
    duration: SCENE_DURATION,
    caption: 'Review everything, create the league, preview the live site, and go straight to your dashboard.',
    component: LaunchScene,
  },
];

export const LEAGUE_BUILDER_FLOW_DURATION = sceneDefinitions.reduce(
  (total, scene) => total + scene.duration,
  0
);

const captionSegments: CaptionSegment[] = sceneDefinitions.reduce<CaptionSegment[]>(
  (segments, scene) => {
    const start = segments.length === 0 ? 0 : segments[segments.length - 1].end;
    segments.push({
      start,
      end: start + scene.duration,
      text: scene.caption,
    });
    return segments;
  },
  []
);

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getSceneStarts() {
  let runningTotal = 0;
  return sceneDefinitions.map((scene) => {
    const start = runningTotal;
    runningTotal += scene.duration;
    return {
      ...scene,
      start,
      end: runningTotal,
    };
  });
}

function entranceProgress(frame: number, delay = 0, duration = 18) {
  return interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
}

function useSceneTransition(duration: number) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const entrance = spring({
    fps,
    frame,
    config: {
      damping: 16,
      stiffness: 115,
      mass: 0.84,
    },
  });

  const exit = interpolate(frame, [duration - 16, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });

  return {
    opacity: clamp(entrance * (1 - exit * 0.9), 0, 1),
    translateY: interpolate(entrance, [0, 1], [58, 0]) - exit * 46,
    scale: 0.95 + entrance * 0.05 - exit * 0.025,
  };
}

function SceneShell({
  duration,
  children,
}: {
  duration: number;
  children: React.ReactNode;
}) {
  const {width, height} = useVideoConfig();
  const transition = useSceneTransition(duration);

  return (
    <AbsoluteFill
      style={{
        opacity: transition.opacity,
        transform: `translateY(${transition.translateY}px) scale(${transition.scale})`,
      }}
    >
      <div
        className="mx-auto flex h-full w-full max-w-[1760px] flex-col justify-between px-10 text-white"
        style={{
          paddingTop: height > width ? 84 : height === width ? 56 : 52,
          paddingBottom: height > width ? 170 : height === width ? 126 : 118,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
}

function SectionHeader({
  eyebrow,
  title,
  body,
  variant,
}: {
  eyebrow: string;
  title: string;
  body: string;
  variant: Variant;
}) {
  return (
    <div className={variant === 'vertical' ? 'max-w-[880px]' : variant === 'square' ? 'max-w-[760px]' : 'max-w-[920px]'}>
      <p
        className="mb-4 text-[20px] font-semibold uppercase tracking-[0.34em] text-cyan-100/80"
        style={monoStyle}
      >
        {eyebrow}
      </p>
      <h2
        className={
          variant === 'vertical'
            ? 'text-[98px] font-extrabold leading-[0.9] tracking-[-0.045em]'
            : variant === 'square'
              ? 'text-[68px] font-extrabold leading-[0.92] tracking-[-0.04em]'
              : 'text-[80px] font-extrabold leading-[0.9] tracking-[-0.04em]'
        }
      >
        {title}
      </h2>
      <p
        className={
          variant === 'vertical'
            ? 'mt-6 max-w-[860px] text-[31px] leading-[1.18] text-slate-300'
            : variant === 'square'
              ? 'mt-4 max-w-[700px] text-[22px] leading-[1.2] text-slate-300'
              : 'mt-5 max-w-[760px] text-[26px] leading-[1.18] text-slate-300'
        }
      >
        {body}
      </p>
    </div>
  );
}

function Panel({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-[34px] border border-white/10 bg-[#091625]/88 shadow-[0_28px_120px_rgba(2,6,23,0.46)] ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

function WindowChrome({label}: {label: string}) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-rose-400/80" />
        <span className="h-3 w-3 rounded-full bg-amber-300/80" />
        <span className="h-3 w-3 rounded-full bg-emerald-300/80" />
      </div>
      <span className="text-[14px] uppercase tracking-[0.28em] text-slate-500" style={monoStyle}>
        {label}
      </span>
    </div>
  );
}

function Pill({
  children,
  tone = 'default',
}: {
  children: React.ReactNode;
  tone?: 'default' | 'bright' | 'success';
}) {
  return (
    <div
      className={`rounded-full border px-4 py-2 text-[18px] ${
        tone === 'bright'
          ? 'border-cyan-200/16 bg-cyan-300/12 text-cyan-100'
          : tone === 'success'
            ? 'border-emerald-200/16 bg-emerald-300/12 text-emerald-100'
            : 'border-white/10 bg-white/[0.04] text-slate-200'
      }`}
    >
      {children}
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = 'cyan',
}: {
  label: string;
  value: string;
  tone?: 'cyan' | 'green' | 'gold';
}) {
  const palette =
    tone === 'green'
      ? 'from-emerald-300/18 to-emerald-400/6 text-emerald-100'
      : tone === 'gold'
        ? 'from-amber-300/18 to-amber-400/6 text-amber-100'
        : 'from-cyan-300/18 to-cyan-400/6 text-cyan-100';

  return (
    <div className={`rounded-[24px] border border-white/8 bg-gradient-to-br ${palette} p-5`}>
      <p className="text-[14px] uppercase tracking-[0.24em] text-slate-500" style={monoStyle}>
        {label}
      </p>
      <p className="mt-2 text-[38px] font-bold leading-none">{value}</p>
    </div>
  );
}

function FormInput({
  label,
  value,
  active = false,
  widthPercent = 84,
}: {
  label: string;
  value: string;
  active?: boolean;
  widthPercent?: number;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[15px] font-medium text-slate-300">{label}</p>
      <div
        className={`rounded-[20px] border px-4 py-3 ${
          active ? 'border-cyan-300/40 bg-cyan-300/8' : 'border-white/8 bg-white/[0.04]'
        }`}
      >
        <div
          className="h-4 rounded-full bg-white/85"
          style={{width: `${widthPercent}%`, maxWidth: value.length * 13}}
        />
      </div>
    </div>
  );
}

function AnimatedBackdrop() {
  const frame = useCurrentFrame();
  const x1 = Math.sin(frame / 32) * 84;
  const y1 = Math.cos(frame / 40) * 58;
  const x2 = Math.cos(frame / 45) * 72;
  const y2 = Math.sin(frame / 27) * 68;

  return (
    <AbsoluteFill className="demo-noise demo-grid overflow-hidden">
      <div
        className="absolute left-[-10%] top-[-8%] h-[44%] w-[44%] rounded-full bg-cyan-300/18 blur-[140px]"
        style={{transform: `translate(${x1}px, ${y1}px)`}}
      />
      <div
        className="absolute right-[-8%] top-[12%] h-[38%] w-[38%] rounded-full bg-emerald-300/12 blur-[150px]"
        style={{transform: `translate(${x2}px, ${y2}px)`}}
      />
      <div className="absolute bottom-[-15%] left-[22%] h-[34%] w-[34%] rounded-full bg-amber-200/10 blur-[150px]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,7,12,0.1),rgba(1,7,12,0.46))]" />
    </AbsoluteFill>
  );
}

function FlowRail() {
  const frame = useCurrentFrame();
  const progress = frame / (LEAGUE_BUILDER_FLOW_DURATION - 1);

  return (
    <div className="absolute left-1/2 top-7 z-20 w-[min(1280px,88vw)] -translate-x-1/2">
      <div className="relative">
        <div className="absolute left-0 top-[18px] h-[2px] w-full bg-white/10" />
        <div className="absolute left-0 top-[18px] h-[2px] bg-cyan-300" style={{width: `${progress * 100}%`}} />
        <div
          className="absolute top-[10px] h-5 w-5 rounded-full border border-cyan-100/30 bg-cyan-300 shadow-[0_0_24px_rgba(87,210,255,0.7)]"
          style={{left: `calc(${progress * 100}% - 10px)`}}
        />
        <div className="grid grid-cols-5 gap-5">
          {flowSteps.map((step, index) => {
            const scene = getSceneStarts()[index];
            const complete = frame >= scene.end;
            const active = frame >= scene.start && frame < scene.end;
            return (
              <div key={step} className="flex flex-col items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border text-[15px] font-bold ${
                    complete
                      ? 'border-emerald-200/20 bg-emerald-300/16 text-emerald-100'
                      : active
                        ? 'border-cyan-200/24 bg-cyan-300/16 text-cyan-100'
                        : 'border-white/10 bg-[#08111d] text-slate-500'
                  }`}
                  style={monoStyle}
                >
                  {complete ? 'OK' : index + 1}
                </div>
                <p className={`text-center text-[15px] ${active ? 'text-white' : 'text-slate-400'}`}>{step}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TransitionOverlay({direction = 1}: {direction?: 1 | -1}) {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const travel = interpolate(frame, [0, 28], [-width * direction, width * direction], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  const streak = interpolate(frame, [0, 28], [-width * direction * 0.7, width * direction * 1.3], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.quad),
  });

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        className="absolute inset-y-[-10%] w-[42%] bg-gradient-to-r from-cyan-300/0 via-cyan-300/30 to-white/10 blur-[8px]"
        style={{
          left: direction === 1 ? 0 : undefined,
          right: direction === -1 ? 0 : undefined,
          transform: `translateX(${travel}px) skewX(-18deg)`,
        }}
      />
      <div
        className="absolute inset-y-0 w-20 bg-white/35 blur-[20px]"
        style={{
          left: direction === 1 ? 0 : undefined,
          right: direction === -1 ? 0 : undefined,
          transform: `translateX(${streak}px)`,
        }}
      />
    </AbsoluteFill>
  );
}

function CaptionOverlay() {
  const frame = useCurrentFrame();
  const activeCaption = captionSegments.find((segment) => frame >= segment.start && frame < segment.end);
  if (!activeCaption) return null;

  return (
    <div className="absolute bottom-8 left-1/2 z-20 w-[min(1100px,86vw)] -translate-x-1/2">
      <div className="rounded-[26px] border border-white/10 bg-[#07111d]/88 px-6 py-5 shadow-[0_18px_80px_rgba(0,0,0,0.32)]">
        <p className="text-center text-[24px] leading-[1.18] text-slate-100">
          {activeCaption.text}
        </p>
      </div>
    </div>
  );
}

function BrowserPanel({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Panel className={`overflow-hidden ${className}`}>
      <WindowChrome label={label} />
      <div className="p-5">{children}</div>
    </Panel>
  );
}

function WizardPill({
  title,
  description,
  state,
}: {
  title: string;
  description: string;
  state: 'complete' | 'active' | 'upcoming';
}) {
  return (
    <div
      className={`rounded-[22px] border px-4 py-4 ${
        state === 'complete'
          ? 'border-emerald-200/14 bg-emerald-300/10'
          : state === 'active'
            ? 'border-cyan-200/20 bg-cyan-300/10'
            : 'border-white/8 bg-white/[0.03]'
      }`}
    >
      <p className="text-[19px] font-semibold text-white">{title}</p>
      <p className="mt-1 text-[16px] leading-[1.15] text-slate-400">{description}</p>
    </div>
  );
}

function Cursor({
  x,
  y,
}: {
  x: number;
  y: number;
}) {
  return (
    <div
      className="absolute z-10 h-8 w-8 rounded-full border border-white/35 bg-cyan-300/30 shadow-[0_0_24px_rgba(87,210,255,0.6)]"
      style={{transform: `translate(${x}px, ${y}px)`}}
    />
  );
}

function SignupMockup({variant}: {variant: Variant}) {
  const frame = useCurrentFrame();
  const c1 = entranceProgress(frame, 12, 18);
  const c2 = entranceProgress(frame, 36, 18);
  const c3 = entranceProgress(frame, 60, 18);
  const c4 = entranceProgress(frame, 84, 18);
  const c5 = entranceProgress(frame, 112, 18);

  const cursorX = interpolate(frame, [0, 28, 52, 76, 104, 134], [610, 620, 620, 620, 628, 688], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cursorY = interpolate(frame, [0, 28, 52, 76, 104, 134], [292, 404, 518, 662, 796, 868], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div className={`grid h-full items-end gap-6 ${variant === 'wide' ? 'grid-cols-[0.92fr_1.08fr]' : 'grid-cols-1'}`}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Pill tone="bright">Google</Pill>
          <Pill>Apple</Pill>
          <Pill>Email signup</Pill>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <MetricCard label="time to start" value="< 5 min" />
          <MetricCard label="company + league" value="1 flow" tone="green" />
        </div>
      </div>
      <div className="relative">
        <BrowserPanel label="signup / create-account" className="bg-[#09131f]/94">
          <div className="grid gap-5">
            <div className="space-y-2">
              <p className="text-[38px] font-bold text-white">Create your account</p>
              <p className="text-[20px] text-slate-400">Then move directly into league setup.</p>
            </div>
            <div className="grid gap-3">
              <div className="rounded-[20px] border border-white/8 bg-white/[0.04] px-4 py-4 text-[20px] text-slate-200">Continue with Google</div>
              <div className="rounded-[20px] border border-white/8 bg-white/[0.04] px-4 py-4 text-[20px] text-slate-200">Continue with Apple</div>
            </div>
            <div className="grid gap-4">
              <FormInput label="Full name" value="Nick Grossi" active={frame >= 12 && frame < 36} widthPercent={42 + c1 * 36} />
              <FormInput label="Email" value="nick@beerleaguehockey.ca" active={frame >= 36 && frame < 60} widthPercent={30 + c2 * 48} />
              <FormInput label="Password" value="**********" active={frame >= 60 && frame < 84} widthPercent={24 + c3 * 26} />
              <FormInput label="Business/Organization Name" value="Woodbridge Oldtimers Hockey" active={frame >= 84 && frame < 108} widthPercent={32 + c4 * 44} />
            </div>
            <div className="grid gap-3">
              <div className="flex items-center gap-3 rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3">
                <div className={`h-5 w-5 rounded border ${frame >= 108 ? 'border-cyan-200/20 bg-cyan-300/20' : 'border-white/15 bg-white/[0.02]'}`} />
                <p className="text-[18px] text-slate-300">Accept terms</p>
              </div>
              <div className="flex items-center gap-3 rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3">
                <div className={`h-5 w-5 rounded border ${frame >= 120 ? 'border-cyan-200/20 bg-cyan-300/20' : 'border-white/15 bg-white/[0.02]'}`} />
                <p className="text-[18px] text-slate-300">Accept privacy policy</p>
              </div>
            </div>
            <div
              className="rounded-[22px] bg-gradient-to-r from-cyan-300 to-emerald-300 px-5 py-4 text-center text-[22px] font-bold text-slate-950 shadow-[0_18px_50px_rgba(87,210,255,0.24)]"
              style={{transform: `scale(${0.96 + c5 * 0.04})`}}
            >
              Start creating your league
            </div>
          </div>
        </BrowserPanel>
        <Cursor x={cursorX} y={cursorY} />
      </div>
    </div>
  );
}

function WizardSetupMockup({variant}: {variant: Variant}) {
  const frame = useCurrentFrame();
  const step1 = entranceProgress(frame, 8, 16);
  const step2 = entranceProgress(frame, 30, 16);
  const step3 = entranceProgress(frame, 52, 16);
  const badge = entranceProgress(frame, 94, 18);

  return (
    <div className={`grid h-full gap-6 ${variant === 'wide' ? 'grid-cols-[0.94fr_1.06fr]' : 'grid-cols-1'}`}>
      <BrowserPanel label="dashboard / leagues / new?step=3">
        <div className="grid gap-5">
          <div className="grid gap-3 md:grid-cols-3">
            <WizardPill title="Organization" description="Company info" state={step1 > 0.8 ? 'complete' : 'active'} />
            <WizardPill title="League Info" description="Basic information" state={step2 > 0.8 ? 'complete' : step2 > 0.1 ? 'active' : 'upcoming'} />
            <WizardPill title="Season & Scoring" description="Season + scorekeeping" state={step3 > 0.2 ? 'active' : 'upcoming'} />
          </div>
          <div className="grid gap-4">
            <FormInput label="League Name" value="Woodbridge Oldtimers Hockey League" active={frame >= 20 && frame < 48} widthPercent={76} />
            <FormInput label="Website URL" value="woodbridge-oldtimers" active={frame >= 48 && frame < 76} widthPercent={62} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-cyan-200/18 bg-cyan-300/10 p-4">
              <p className="text-[15px] uppercase tracking-[0.22em] text-cyan-100/70" style={monoStyle}>
                registration type
              </p>
              <p className="mt-3 text-[28px] font-bold text-white">Open Registration</p>
              <p className="mt-2 text-[19px] leading-[1.12] text-slate-300">
                Players register individually and pay directly online.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
              <p className="text-[15px] uppercase tracking-[0.22em] text-slate-500" style={monoStyle}>
                scorekeeping
              </p>
              <p className="mt-3 text-[28px] font-bold text-white">Self scorekeeping</p>
              <p className="mt-2 text-[19px] leading-[1.12] text-slate-300">
                Team captains submit game stats after each game.
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label="step" value="3 of 8" />
            <MetricCard label="draft save" value="On" tone="green" />
            <MetricCard label="ready next" value="Teams" tone="gold" />
          </div>
        </div>
      </BrowserPanel>
      <div className="flex flex-col gap-5">
        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[15px] uppercase tracking-[0.22em] text-slate-500" style={monoStyle}>
                autosave
              </p>
              <p className="mt-2 text-[32px] font-bold text-white">No lost setup work.</p>
            </div>
            <div
              className="rounded-full border border-emerald-200/18 bg-emerald-300/12 px-4 py-2 text-[18px] text-emerald-100"
              style={{opacity: badge}}
            >
              Draft saved
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {[
              'Step 1: Organization',
              'Step 2: League info',
              'Step 3: Season and scoring',
              'Step 4: Teams',
            ].map((item, index) => (
              <div key={item} className="rounded-[18px] border border-white/8 bg-[#07111d] px-4 py-3 text-[20px] text-slate-200">
                <span className="mr-3 text-cyan-300" style={monoStyle}>
                  0{index + 1}
                </span>
                {item}
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="p-5">
          <p className="text-[15px] uppercase tracking-[0.22em] text-slate-500" style={monoStyle}>
            real product flow
          </p>
          <p className="mt-3 text-[30px] font-bold leading-[0.96] text-white">
            Setup is guided, step-based, and already maps to the actual league wizard.
          </p>
        </Panel>
      </div>
    </div>
  );
}

function TeamsMockup({variant}: {variant: Variant}) {
  const frame = useCurrentFrame();
  const teams = ['North Stars', 'Ice Dogs', 'Wolves', 'Titans', 'Rangers', 'Bears'];

  return (
    <div className={`grid h-full gap-6 ${variant === 'wide' ? 'grid-cols-[1fr_0.92fr]' : 'grid-cols-1'}`}>
      <BrowserPanel label="dashboard / leagues / new?step=4">
        <div className="grid gap-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[36px] font-bold text-white">Add teams</p>
              <p className="text-[20px] text-slate-400">Teams are optional here, but the launch path becomes clearer when they are in early.</p>
            </div>
            <Pill tone="bright">Step 4</Pill>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {teams.map((team, index) => {
              const reveal = entranceProgress(frame, 12 + index * 11, 14);
              return (
                <div
                  key={team}
                  className="rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-4"
                  style={{
                    opacity: reveal,
                    transform: `translateY(${(1 - reveal) * 34}px)`,
                  }}
                >
                  <p className="text-[24px] font-semibold text-white">{team}</p>
                  <p className="mt-1 text-[18px] text-slate-400">Captain slot ready</p>
                </div>
              );
            })}
          </div>
        </div>
      </BrowserPanel>
      <div className="grid gap-5">
        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[15px] uppercase tracking-[0.22em] text-slate-500" style={monoStyle}>
                launch readiness
              </p>
              <p className="mt-2 text-[32px] font-bold text-white">Commissioner view</p>
            </div>
            <Pill tone="success">82% ready</Pill>
          </div>
          <div className="mt-5 space-y-4">
            {[
              ['Teams configured', '6 / 6 complete', 'w-full'],
              ['Season structure', '3 divisions', 'w-[82%]'],
              ['Schedule seeded', '48 game slots', 'w-[68%]'],
            ].map(([label, value, width]) => (
              <div key={label} className="space-y-2">
                <div className="flex items-center justify-between text-[20px]">
                  <span className="text-slate-200">{label}</span>
                  <span className="text-white">{value}</span>
                </div>
                <div className="h-3 rounded-full bg-white/8">
                  <div className={`h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300 ${width}`} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="p-5">
          <p className="text-[15px] uppercase tracking-[0.22em] text-slate-500" style={monoStyle}>
            why this matters
          </p>
          <p className="mt-3 text-[30px] font-bold leading-[0.96] text-white">
            Teams, season structure, and readiness live in one place instead of scattered setup docs.
          </p>
        </Panel>
      </div>
    </div>
  );
}

function WebsitePaymentsMockup({variant}: {variant: Variant}) {
  const frame = useCurrentFrame();
  const toggle = entranceProgress(frame, 18, 22);
  const stripe = entranceProgress(frame, 54, 20);
  const fee = entranceProgress(frame, 88, 20);

  return (
    <div className={`grid h-full gap-6 ${variant === 'wide' ? 'grid-cols-[1.05fr_0.95fr]' : 'grid-cols-1'}`}>
      <BrowserPanel label="dashboard / leagues / new?step=5">
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[15px] uppercase tracking-[0.22em] text-slate-500" style={monoStyle}>
                website + pages
              </p>
              <p className="mt-2 text-[34px] font-bold text-white">Public site goes live with the league.</p>
            </div>
            <div className="flex items-center gap-3 rounded-full border border-cyan-200/16 bg-cyan-300/10 px-4 py-2">
              <span className="text-[18px] text-cyan-100">Public website</span>
              <span className="relative block h-7 w-12 rounded-full bg-[#0a2f3f]">
                <span
                  className="absolute top-1 h-5 w-5 rounded-full bg-cyan-200 shadow-[0_0_18px_rgba(87,210,255,0.55)]"
                  style={{left: `${4 + toggle * 20}px`}}
                />
              </span>
            </div>
          </div>
          <div className="rounded-[28px] border border-white/8 bg-gradient-to-br from-cyan-300/16 via-sky-400/10 to-emerald-300/10 p-5">
            <div className="grid gap-4 md:grid-cols-[1.08fr_0.92fr]">
              <div className="rounded-[24px] border border-white/10 bg-[#06111c]/65 p-4">
                <p className="text-[15px] uppercase tracking-[0.22em] text-slate-500" style={monoStyle}>
                  homepage preview
                </p>
                <div className="mt-4 space-y-3">
                  <div className="h-28 rounded-[20px] bg-[linear-gradient(135deg,rgba(87,210,255,0.28),rgba(148,246,199,0.16),rgba(255,255,255,0.05))]" />
                  <div className="h-4 w-2/3 rounded-full bg-white/70" />
                  <div className="h-3 w-full rounded-full bg-white/20" />
                  <div className="h-3 w-4/5 rounded-full bg-white/20" />
                </div>
              </div>
              <div className="grid gap-3">
                {['Standings', 'Schedule', 'Sponsors', 'News'].map((item, index) => (
                  <div
                    key={item}
                    className="rounded-[18px] border border-white/10 bg-white/[0.05] px-4 py-4 text-[21px] text-slate-100"
                    style={{
                      opacity: entranceProgress(frame, 28 + index * 10, 14),
                      transform: `translateY(${(1 - entranceProgress(frame, 28 + index * 10, 14)) * 18}px)`,
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </BrowserPanel>
      <BrowserPanel label="dashboard / leagues / new?step=7">
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <MetricCard label="registration fee" value="$425" tone="gold" />
            <MetricCard label="payments" value={stripe > 0.5 ? 'Stripe connected' : 'Connect Stripe'} tone="green" />
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-5">
            <p className="text-[15px] uppercase tracking-[0.22em] text-slate-500" style={monoStyle}>
              registration
            </p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-[18px] bg-[#07111d] px-4 py-4">
                <span className="text-[22px] text-slate-200">Paid registration</span>
                <Pill tone="success">Enabled</Pill>
              </div>
              <div className="flex items-center justify-between rounded-[18px] bg-[#07111d] px-4 py-4">
                <span className="text-[22px] text-slate-200">Late fee</span>
                <span className="text-[22px] text-amber-100">+$35</span>
              </div>
              <div className="flex items-center justify-between rounded-[18px] bg-[#07111d] px-4 py-4">
                <span className="text-[22px] text-slate-200">Stripe connect</span>
                <span
                  className="rounded-full border border-emerald-200/16 bg-emerald-300/12 px-3 py-1 text-[16px] text-emerald-100"
                  style={{opacity: stripe}}
                >
                  Active
                </span>
              </div>
            </div>
          </div>
          <div className="rounded-[24px] border border-cyan-200/16 bg-cyan-300/10 p-5">
            <p className="text-[15px] uppercase tracking-[0.22em] text-cyan-100/70" style={monoStyle}>
              launch effect
            </p>
            <p className="mt-3 text-[30px] font-bold leading-[0.96] text-white">
              The public site and registration system launch from the same setup path.
            </p>
            <div className="mt-4 h-3 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300" style={{width: `${40 + fee * 60}%`}} />
            </div>
          </div>
        </div>
      </BrowserPanel>
    </div>
  );
}

function LaunchMockup({variant}: {variant: Variant}) {
  const frame = useCurrentFrame();
  const success = entranceProgress(frame, 36, 22);

  return (
    <div className={`grid h-full gap-6 ${variant === 'wide' ? 'grid-cols-[0.92fr_1.08fr]' : 'grid-cols-1'}`}>
      <BrowserPanel label="dashboard / leagues / new?step=8">
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[15px] uppercase tracking-[0.22em] text-slate-500" style={monoStyle}>
                review
              </p>
              <p className="mt-2 text-[34px] font-bold text-white">Review the full league setup before create.</p>
            </div>
            <Pill tone="bright">Step 8</Pill>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ['Organization', 'Complete'],
              ['Teams', '6 configured'],
              ['Website', 'Public enabled'],
              ['Registration', '$425 online'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[20px] border border-white/8 bg-white/[0.04] px-4 py-4">
                <p className="text-[17px] uppercase tracking-[0.18em] text-slate-500" style={monoStyle}>
                  {label}
                </p>
                <p className="mt-2 text-[25px] font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-[24px] bg-gradient-to-r from-cyan-300 to-emerald-300 px-5 py-4 text-center text-[24px] font-bold text-slate-950 shadow-[0_20px_56px_rgba(87,210,255,0.25)]">
            Create league
          </div>
        </div>
      </BrowserPanel>
      <BrowserPanel label="dashboard / leagues / next-steps">
        <div
          className="grid gap-4"
          style={{
            opacity: success,
            transform: `translateY(${(1 - success) * 24}px)`,
          }}
        >
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-300/16 text-[28px] text-emerald-100">
              OK
            </div>
            <p className="mt-4 text-[38px] font-bold text-white">League created successfully</p>
            <p className="mt-2 text-[21px] text-slate-400">Woodbridge Oldtimers Hockey League</p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="league" value="WOHL" />
            <MetricCard label="season" value="Fall 2026" tone="green" />
            <MetricCard label="location" value="ON" tone="gold" />
            <MetricCard label="teams" value="6" />
          </div>
          <div className="grid gap-3">
            {[
              'Invite team captains',
              'Preview your site',
              'Go to dashboard',
            ].map((item, index) => (
              <div
                key={item}
                className="flex items-center justify-between rounded-[18px] border border-white/8 bg-white/[0.04] px-4 py-4"
              >
                <span className="text-[22px] text-white">{item}</span>
                <span className={`rounded-full px-3 py-1 text-[16px] ${index === 1 ? 'bg-cyan-300/12 text-cyan-100' : 'bg-emerald-300/12 text-emerald-100'}`}>
                  {index === 1 ? 'live' : 'next'}
                </span>
              </div>
            ))}
          </div>
          <div className="rounded-[24px] border border-cyan-200/14 bg-gradient-to-br from-cyan-300/14 to-emerald-300/8 p-5">
            <p className="text-[15px] uppercase tracking-[0.22em] text-cyan-100/70" style={monoStyle}>
              live preview
            </p>
            <p className="mt-2 text-[28px] font-bold text-white">woodbridge-oldtimers.beerleaguehockey.ca</p>
            <p className="mt-2 text-[20px] text-slate-300">Your site, dashboard, and registration workflow are live together.</p>
          </div>
        </div>
      </BrowserPanel>
    </div>
  );
}

function SignupScene({duration, variant}: SceneProps) {
  return (
    <SceneShell duration={duration}>
      <div className="flex h-full flex-col justify-between gap-8">
        <SectionHeader
          eyebrow="signup to league setup"
          title="Start with sign up, then move straight into creating the league."
          body="This should feel like the actual product: create the account, add the organization, and begin the wizard immediately."
          variant={variant}
        />
        <SignupMockup variant={variant} />
      </div>
    </SceneShell>
  );
}

function WizardScene({duration, variant}: SceneProps) {
  return (
    <SceneShell duration={duration}>
      <div className="flex h-full flex-col justify-between gap-8">
        <SectionHeader
          eyebrow="guided league wizard"
          title="League info, season setup, and scorekeeping live in the real step flow."
          body="The wizard is already one of the strongest surfaces in the product, so the video should show that instead of abstract dashboard cards."
          variant={variant}
        />
        <WizardSetupMockup variant={variant} />
      </div>
    </SceneShell>
  );
}

function TeamsScene({duration, variant}: SceneProps) {
  return (
    <SceneShell duration={duration}>
      <div className="flex h-full flex-col justify-between gap-8">
        <SectionHeader
          eyebrow="teams and launch readiness"
          title="Add teams and keep setup progress visible while the league takes shape."
          body="This is where the video starts to show the commissioner payoff: fewer hidden setup tasks and a clearer path to launch."
          variant={variant}
        />
        <TeamsMockup variant={variant} />
      </div>
    </SceneShell>
  );
}

function WebsitePaymentsScene({duration, variant}: SceneProps) {
  return (
    <SceneShell duration={duration}>
      <div className="flex h-full flex-col justify-between gap-8">
        <SectionHeader
          eyebrow="website and registration"
          title="Turn on the public site and payments from the same setup path."
          body="League Builder is strongest when the website, registration, and operations are shown as one launch sequence instead of separate products."
          variant={variant}
        />
        <WebsitePaymentsMockup variant={variant} />
      </div>
    </SceneShell>
  );
}

function LaunchScene({duration, variant}: SceneProps) {
  return (
    <SceneShell duration={duration}>
      <div className="flex h-full flex-col justify-between gap-8">
        <SectionHeader
          eyebrow="review to live league"
          title="Review the setup, create the league, and go directly into next steps."
          body="The right ending is not a generic feature summary. It is the moment the league exists, the site is live, and the commissioner knows what to do next."
          variant={variant}
        />
        <LaunchMockup variant={variant} />
      </div>
    </SceneShell>
  );
}

export const LeagueBuilderLaunchFlow: React.FC = () => {
  const {width, height} = useVideoConfig();
  const variant: Variant = height > width ? 'vertical' : height === width ? 'square' : 'wide';
  const scenes = getSceneStarts();

  return (
    <AbsoluteFill className="overflow-hidden bg-[#04121d] text-white">
      <AnimatedBackdrop />
      <Audio src={staticFile('league-builder-voiceover.wav')} volume={0.9} />
      <FlowRail />
      {scenes.map((scene) => {
        const Component = scene.component;
        return (
          <Sequence key={scene.id} from={scene.start} durationInFrames={scene.duration}>
            <Component duration={scene.duration} variant={variant} />
          </Sequence>
        );
      })}
      {scenes.slice(1).map((scene, index) => (
        <Sequence key={`${scene.id}-transition`} from={scene.start - 14} durationInFrames={28}>
          <TransitionOverlay direction={index % 2 === 0 ? 1 : -1} />
        </Sequence>
      ))}
      <CaptionOverlay />
    </AbsoluteFill>
  );
};
