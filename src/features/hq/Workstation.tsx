import type { AgentStatus } from '@shared/types';
import clsx from 'clsx';

const ACCENT_BY_CATEGORY: Record<string, string> = {
  health: '#3fb950',
  media: '#a371f7',
  apartment: '#d29922',
  projects: '#58a6ff',
  work: '#58a6ff',
  life: '#39c5cf',
  finance: '#e3b341',
};

const PALETTE = ['#58a6ff', '#a371f7', '#3fb950', '#d29922', '#39c5cf', '#f778ba', '#e3b341'];

export function accentFor(id: string, category: string | undefined): string {
  if (category && ACCENT_BY_CATEGORY[category]) return ACCENT_BY_CATEGORY[category]!;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}

type Prop = 'dumbbell' | 'screen' | 'blueprint' | 'board' | 'plant' | 'cup' | 'book' | 'papers';

function propFor(id: string, category: string | undefined): Prop {
  const s = `${id} ${category ?? ''}`.toLowerCase();
  if (/health|fit|gym|workout/.test(s)) return 'dumbbell';
  if (/media|watch|film|show|movie/.test(s)) return 'screen';
  if (/apartment|home|furnish|room/.test(s)) return 'blueprint';
  if (/project|work|plan|task/.test(s)) return 'board';
  if (/coffee|caf|food|restaurant|place/.test(s)) return 'cup';
  if (/book|read|library/.test(s)) return 'book';
  if (/plant|garden/.test(s)) return 'plant';
  return 'papers';
}

const STATUS_COLOR: Record<AgentStatus, string> = {
  IDLE: '#7d8896',
  WORKING: '#58a6ff',
  WAITING: '#d29922',
  BLOCKED: '#f0883e',
  ERROR: '#f85149',
  DISABLED: '#444c56',
};

function DeskProp({ prop, accent }: { prop: Prop; accent: string }) {
  // Small themed object on the desk (original simple shapes).
  switch (prop) {
    case 'dumbbell':
      return (
        <g stroke={accent} strokeWidth="2.4" fill="none" strokeLinecap="round">
          <line x1="150" y1="104" x2="168" y2="104" />
          <line x1="150" y1="100" x2="150" y2="108" />
          <line x1="168" y1="100" x2="168" y2="108" />
        </g>
      );
    case 'screen':
      return (
        <g>
          <rect x="148" y="94" width="22" height="14" rx="2" fill="none" stroke={accent} strokeWidth="1.6" />
          <path d="M155 112h8" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
        </g>
      );
    case 'blueprint':
      return (
        <g stroke={accent} strokeWidth="1.4" fill="none">
          <rect x="148" y="96" width="20" height="12" rx="1" />
          <path d="M148 101h20M156 96v12" opacity="0.6" />
        </g>
      );
    case 'board':
      return (
        <g fill={accent}>
          <rect x="150" y="95" width="5" height="12" rx="1" opacity="0.85" />
          <rect x="157" y="98" width="5" height="9" rx="1" opacity="0.6" />
          <rect x="164" y="92" width="5" height="15" rx="1" opacity="0.4" />
        </g>
      );
    case 'plant':
      return (
        <g>
          <path d="M156 107v-6" stroke={accent} strokeWidth="1.6" />
          <path d="M156 102c-4-1-5-5-5-5 4 0 5 5 5 5zM156 103c4-1 5-6 5-6-4 0-5 6-5 6z" fill={accent} opacity="0.8" />
          <rect x="152" y="107" width="8" height="4" rx="1" fill={accent} opacity="0.4" />
        </g>
      );
    case 'cup':
      return (
        <g stroke={accent} strokeWidth="1.6" fill="none" strokeLinecap="round">
          <path d="M151 100h10v6a3 3 0 01-3 3h-4a3 3 0 01-3-3z" />
          <path d="M161 101h2a2 2 0 010 4h-2" />
          <path d="M154 96v-3M158 96v-3" opacity="0.6" />
        </g>
      );
    case 'book':
      return (
        <g fill={accent}>
          <rect x="150" y="98" width="16" height="4" rx="1" opacity="0.5" />
          <rect x="150" y="103" width="16" height="4" rx="1" opacity="0.75" />
        </g>
      );
    default:
      return (
        <g fill={accent} opacity="0.6">
          <rect x="150" y="99" width="16" height="3" rx="1" />
          <rect x="152" y="104" width="14" height="3" rx="1" opacity="0.7" />
        </g>
      );
  }
}

/**
 * Original SVG agent workstation. Animation strictly reflects real backend
 * status — never fakes work. Fully generic: unknown agents get a themed pod
 * from their id/category/icon.
 */
export function Workstation({
  status,
  icon,
  accent,
  prop,
}: {
  status: AgentStatus;
  icon: string;
  accent: string;
  prop: Prop;
}) {
  const light = STATUS_COLOR[status];
  const dim = status === 'DISABLED';

  return (
    <svg
      viewBox="0 0 200 150"
      className={clsx('hq-ws', `hq-ws--${status.toLowerCase()}`)}
      role="img"
      aria-label={`Workstation, status ${status}`}
      style={{ ['--ws-accent' as string]: accent, ['--ws-light' as string]: light }}
    >
      <defs>
        <radialGradient id={`glow-${accent.replace('#', '')}`} cx="50%" cy="35%" r="60%">
          <stop offset="0%" stopColor={accent} stopOpacity={dim ? 0.04 : 0.16} />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="0.5" y="0.5" width="199" height="149" rx="12" className="hq-ws__bg" />
      <rect x="0.5" y="0.5" width="199" height="149" rx="12" fill={`url(#glow-${accent.replace('#', '')})`} />

      {/* floor */}
      <line x1="16" y1="122" x2="184" y2="122" className="hq-ws__floor" />

      {/* monitor */}
      <g className="hq-ws__monitor">
        <rect x="30" y="40" width="60" height="42" rx="4" className="hq-ws__screen" />
        <rect x="30" y="40" width="60" height="42" rx="4" className="hq-ws__screen-glow" stroke={accent} />
        <text x="60" y="67" className="hq-ws__emoji" textAnchor="middle">
          {icon || '⬡'}
        </text>
        <rect x="56" y="82" width="8" height="8" className="hq-ws__stand" />
        <rect x="46" y="90" width="28" height="3" rx="1.5" className="hq-ws__stand" />
      </g>

      {/* desk */}
      <rect x="24" y="104" width="152" height="8" rx="3" className="hq-ws__desk" />
      <DeskProp prop={prop} accent={accent} />

      {/* seated worker */}
      <g className="hq-ws__figure">
        <ellipse cx="118" cy="118" rx="18" ry="5" className="hq-ws__shadow" />
        <path d="M104 104c0-9 6-15 14-15s14 6 14 15z" className="hq-ws__torso" style={{ fill: accent }} />
        <circle cx="118" cy="82" r="8" className="hq-ws__head" />
        {/* typing hands */}
        <g className="hq-ws__hands">
          <rect x="106" y="100" width="5" height="5" rx="1.5" style={{ fill: accent }} />
          <rect x="124" y="100" width="5" height="5" rx="1.5" style={{ fill: accent }} />
        </g>
      </g>

      {/* status light */}
      <circle cx="180" cy="20" r="5" className="hq-ws__light" style={{ fill: light }} />
      <circle cx="180" cy="20" r="5" className="hq-ws__light-ring" style={{ stroke: light }} />

      {/* waiting notification */}
      {status === 'WAITING' && (
        <g className="hq-ws__notify">
          <rect x="128" y="60" width="18" height="14" rx="4" fill={light} />
          <text x="137" y="71" textAnchor="middle" className="hq-ws__notify-text">
            !
          </text>
        </g>
      )}

      {/* blocked / error warning */}
      {(status === 'BLOCKED' || status === 'ERROR') && (
        <g className="hq-ws__warn">
          <path d="M60 24l9 16H51z" fill={light} />
          <rect x="59" y="30" width="2" height="6" rx="1" fill="#0a0d12" />
          <rect x="59" y="37" width="2" height="2" rx="1" fill="#0a0d12" />
        </g>
      )}
    </svg>
  );
}

export { propFor };
