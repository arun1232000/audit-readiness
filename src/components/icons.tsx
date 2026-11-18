/** Line icons from "The Audit" v2 design. Stroke colours come from the surrounding CSS (e.g. `.qicon svg *`). */
import type { ReactNode } from 'react';
import type { ChoiceId, DimensionId } from '../data/assessment';

const S = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    {children}
  </svg>
);

const shield = (
  <S>
    <path d="M12 2.5l7.5 3v5.5c0 4.7-3.2 8.7-7.5 10.5-4.3-1.8-7.5-5.8-7.5-10.5V5.5z" />
    <path d="M8.5 12l2.5 2.5 4.5-5" />
  </S>
);
const idCard = (
  <S>
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
    <circle cx="8.5" cy="11" r="2.3" />
    <path d="M5 16.5c.7-1.6 2-2.4 3.5-2.4s2.8.8 3.5 2.4M14.5 10h4.5M14.5 13.5h3" />
  </S>
);
const truck = (
  <S>
    <path d="M2.5 16.5V8a1 1 0 0 1 1-1h9.5v9.5M13 10h4l3.5 3.5v3H13" />
    <circle cx="7" cy="17.5" r="1.8" />
    <circle cx="16.5" cy="17.5" r="1.8" />
  </S>
);
const trend = (
  <S>
    <path d="M3.5 20.5h17M5.5 16l4-5 3.5 3 5.5-7" />
    <path d="M15 7h3.5v3.5" />
  </S>
);

/** One picture per question, in question order. */
export const QUESTION_ICONS: ReactNode[] = [
  shield,
  <S key="folder">
    <path d="M3 7.5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M8 13.5h8M8 16.5h5" />
  </S>,
  idCard,
  <S key="clock">
    <circle cx="12" cy="12" r="8.8" />
    <path d="M12 7v5l3.5 2.2" />
  </S>,
  <S key="wrench">
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L3.5 17.2a1.8 1.8 0 0 0 2.6 2.6l5.8-5.8a4 4 0 0 0 5.1-5.4l-2.5 2.5-2.3-.4-.4-2.3z" />
  </S>,
  <S key="clipboard">
    <rect x="5" y="3.5" width="14" height="18" rx="2" />
    <path d="M9 3.5h6v2.5H9zM8.5 11l1.5 1.5 3-3M8.5 16.5l1.5 1.5 3-3" />
  </S>,
  trend,
  truck,
];
export const UNITS_ICON = truck;
export const SHIELD_ICON = shield;
export const MAIL_ICON = (
  <S>
    <path d="M3.5 6.5h17v11h-17z" />
    <path d="M3.5 7l8.5 6.5L20.5 7" />
  </S>
);

export const ANSWER_ICONS: Record<ChoiceId, ReactNode> = {
  yes: (
    <S>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </S>
  ),
  partly: (
    <S>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 5v14" />
    </S>
  ),
  no: (
    <S>
      <path d="M7 7l10 10M17 7L7 17" />
    </S>
  ),
  notsure: (
    <S>
      <path d="M9.2 9.2a2.9 2.9 0 1 1 3.9 2.7c-.7.3-1.1.9-1.1 1.6v.8" />
      <path d="M12 17.6v.2" />
    </S>
  ),
};

export const AREA_ICONS: Record<DimensionId, ReactNode> = {
  admin: (
    <S>
      <path d="M3.5 20.5h17M5 20.5V9l7-5 7 5v11.5" />
      <path d="M9.5 20.5v-5h5v5" />
    </S>
  ),
  drivers: idCard,
  equipment: truck,
  overall: trend,
};

/** Bar heights for the power-units tiles. */
export const UNIT_BARS = [[1], [1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 1]];

export const PROMISE_ICONS: ReactNode[] = [
  <svg key="a" viewBox="0 0 24 24">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>,
  <svg key="b" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>,
  <svg key="c" viewBox="0 0 24 24">
    <path d="M4 20.5h16M7 17V11M12 17V6.5M17 17v-8" />
  </svg>,
];

export const STEP_ICONS: ReactNode[] = [
  <S key="1">
    <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
    <circle cx="12" cy="11" r="3.2" />
    <path d="M10.5 18.5h3" />
  </S>,
  <S key="2">
    <path d="M4.5 19.5l1.2-3.6A8 8 0 1 1 8.4 18.6z" />
    <path d="M9 10.5c.5 2 2 3.5 4 4" />
  </S>,
  <S key="3">
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3 20c.6-3.4 3-5.5 6-5.5s5.4 2.1 6 5.5" />
    <path d="M15.5 10.5l2 2 4-4.5" />
  </S>,
];

export const Tick = () => (
  <svg className="tick" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M4 10.5l4 4 8-9" />
  </svg>
);
export const GapMark = () => (
  <svg className="gapmark" viewBox="0 0 20 20" aria-hidden="true">
    <circle cx="10" cy="10" r="6" />
  </svg>
);

export const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="currentColor"
      d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3a.4.4 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"
    />
  </svg>
);
