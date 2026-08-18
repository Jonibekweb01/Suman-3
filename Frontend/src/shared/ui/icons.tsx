import type { SVGProps } from 'react';

/**
 * Inline icon set.
 *
 * Bundled as components rather than an icon library or a sprite: the app uses
 * ~16 icons, so a dependency would ship hundreds of unused paths, and inline
 * SVG avoids the extra network request an external sprite costs on first paint.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number; filled?: boolean };

/**
 * `filled` is destructured here and deliberately dropped.
 *
 * Callers like the bottom nav pass `filled` uniformly to whichever icon a tab
 * happens to use, but only some icons have a solid variant. Swallowing it in
 * the base means the ones that don't simply ignore it, instead of forwarding
 * an unknown attribute onto the <svg> and tripping React's DOM warning.
 */
function Icon({ size = 20, children, filled: _filled, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconSearch = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);

export const IconEye = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.5 12s3.4-5 9.5-5 9.5 5 9.5 5-3.4 5-9.5 5-9.5-5-9.5-5Z" />
    <circle cx="12" cy="12" r="2.2" />
  </Icon>
);

export const IconHeart = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Icon {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20.5s-7.5-4.7-7.5-9.7A4.3 4.3 0 0 1 12 8.2a4.3 4.3 0 0 1 7.5 2.6c0 5-7.5 9.7-7.5 9.7Z" />
  </Icon>
);

export const IconBag = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 8h14l-1 12H6L5 8Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </Icon>
);

export const IconUser = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </Icon>
);

export const IconClose = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const IconMenu = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);

export const IconChevronDown = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

export const IconChevronLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="m15 6-6 6 6 6" />
  </Icon>
);

export const IconChevronRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9 6 6 6-6 6" />
  </Icon>
);

export const IconFilter = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </Icon>
);

export const IconCheck = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 13 4 4L19 7" />
  </Icon>
);

export const IconStar = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Icon {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="m12 4 2.4 5 5.6.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.6-.8L12 4Z" />
  </Icon>
);

export const IconTrash = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" />
  </Icon>
);

export const IconMinus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 12h12" />
  </Icon>
);

export const IconPlus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 6v12M6 12h12" />
  </Icon>
);

export const IconTruck = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
    <circle cx="7" cy="18" r="1.8" />
    <circle cx="17.5" cy="18" r="1.8" />
  </Icon>
);

export const IconShield = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5 19 6v6c0 4.3-3 7.4-7 8.5-4-1.1-7-4.2-7-8.5V6l7-2.5Z" />
    <path d="m9.5 12 1.8 1.8 3.5-3.6" />
  </Icon>
);

export const IconReturn = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 9h11a5 5 0 0 1 0 10H8" />
    <path d="m7.5 5.5-3.5 3.5 3.5 3.5" />
  </Icon>
);

export const IconAlert = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 8v5M12 16h.01" />
  </Icon>
);

/* --- Deal & urgency ------------------------------------------------------- */

export const IconClock = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
);

export const IconBolt = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12.5 3 5 13.5h5.5L11 21l7.5-10.5H13L12.5 3Z" strokeLinejoin="round" />
  </Icon>
);

export const IconTruckFast = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 7h10v9H3z" />
    <path d="M13 10h4l3 3v3h-7z" />
    <circle cx="7" cy="18.5" r="1.6" />
    <circle cx="17" cy="18.5" r="1.6" />
  </Icon>
);

/* --- App shell ------------------------------------------------------------
   Nav, wallet and capture affordances introduced by the SuperApp shell. The
   filled variants exist because a bottom-nav tab needs a weight change, not
   just a colour change, to read as active at a glance. */

export const IconHome = ({ filled = false, ...p }: IconProps) => (
  <Icon {...p}>
    <path
      d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-8.5Z"
      fill={filled ? 'currentColor' : 'none'}
      strokeLinejoin="round"
    />
    {!filled && <path d="M9.5 20.5v-6h5v6" />}
  </Icon>
);

export const IconGrid = ({ filled = false, ...p }: IconProps) => (
  <Icon {...p} fill={filled ? 'currentColor' : 'none'}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2.2" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2.2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2.2" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="2.2" />
  </Icon>
);

/** Flame — the "hot deals" tab and discount badges. */
export const IconFlame = ({ filled = false, ...p }: IconProps) => (
  <Icon {...p}>
    <path
      d="M12 3s5.5 4.2 5.5 9a5.5 5.5 0 0 1-11 0c0-2 1-3.6 2-4.6 0 1.6.9 2.6 1.9 2.6 1.3 0 2.1-1.2 2.1-3 0-1.6-.5-3-.5-4Z"
      fill={filled ? 'currentColor' : 'none'}
      strokeLinejoin="round"
    />
  </Icon>
);

export const IconQr = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 8.5v-3A1.5 1.5 0 0 1 5.5 4h3M15.5 4h3A1.5 1.5 0 0 1 20 5.5v3M20 15.5v3a1.5 1.5 0 0 1-1.5 1.5h-3M8.5 20h-3A1.5 1.5 0 0 1 4 18.5v-3" />
    <path d="M7.5 12h9" />
  </Icon>
);

export const IconMic = (p: IconProps) => (
  <Icon {...p}>
    <rect x="9.25" y="3" width="5.5" height="10" rx="2.75" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
  </Icon>
);

export const IconBell = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 9a6 6 0 0 1 12 0c0 3.5.8 5.2 1.5 6.2.4.5 0 1.3-.7 1.3H5.2c-.7 0-1.1-.8-.7-1.3C5.2 14.2 6 12.5 6 9Z" />
    <path d="M10 19.5a2.2 2.2 0 0 0 4 0" />
  </Icon>
);

/** Wallet / value widget in the app header. */
export const IconWallet = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 8.5A2.5 2.5 0 0 1 6 6h11.5A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5H6a2.5 2.5 0 0 1-2.5-2.5v-8Z" />
    <path d="M3.5 10h13.5a1.5 1.5 0 0 1 0 3H3.5" />
  </Icon>
);

export const IconSparkles = (p: IconProps) => (
  <Icon {...p}>
    <path
      d="M12 3.5 13.6 8 18 9.5 13.6 11 12 15.5 10.4 11 6 9.5 10.4 8 12 3.5Z"
      strokeLinejoin="round"
    />
    <path d="M18.5 15.5 19.3 17.7 21.5 18.5 19.3 19.3 18.5 21.5 17.7 19.3 15.5 18.5 17.7 17.7 18.5 15.5Z" />
  </Icon>
);

export const IconSliders = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <circle cx="16" cy="7" r="2.2" />
    <circle cx="8" cy="17" r="2.2" />
  </Icon>
);

export const IconArrowRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 12h15M13.5 6l6 6-6 6" />
  </Icon>
);

export const IconPanelLeft = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <path d="M10 4.5v15" />
  </Icon>
);
