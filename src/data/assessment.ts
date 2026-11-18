/**
 * Assessment content and scoring rules.
 *
 * Source: "The Audit" website version two (Nov 17), which carries the team's wording from
 * Prime_Are_You_Audit_Ready_Questionnaire.pdf and Prime_Audit_Readiness_Score_Feedback.pdf
 * (dashes in question 2, question 8 and the "Almost There!" message are commas/semicolons there).
 * Copy below is reproduced verbatim. Edit questions, answers, bands and copy here; components
 * and the server read everything from this file.
 *
 * Shared by the browser AND the server (the server recomputes scores from these values).
 */

export type DimensionId = 'admin' | 'drivers' | 'equipment' | 'overall';
export type ChoiceId = 'yes' | 'partly' | 'no' | 'notsure';

export interface Dimension {
  id: DimensionId;
  /** Ordinal shown before the name, e.g. "01". */
  code: string;
  name: string;
  /** Short label for tight spaces (the check's progress bar). */
  shortName: string;
  /** HubSpot property that receives this dimension's score (0-100). */
  hubspotProperty: string;
}

export interface Question {
  id: string;
  dimension: DimensionId;
  title: string;
  text: string;
  /** Follow-up shown on the results page when the answer is anything other than "yes". */
  followUpTitle: string;
  followUpDetail: string;
}

export interface Choice {
  id: ChoiceId;
  label: string;
  short: string;
  points: number;
}

export interface Band {
  id: 'strong' | 'almost' | 'closer';
  /** Inclusive lower bound on the EXACT (unrounded) percentage. */
  min: number;
  name: string;
  message: string[];
  nextStep: string;
}

export const DIMENSIONS: Dimension[] = [
  { id: 'admin', code: '01', name: 'Company administration', shortName: 'Company', hubspotProperty: 'assessment_score_company_admin' },
  { id: 'drivers', code: '02', name: 'Drivers', shortName: 'Drivers', hubspotProperty: 'assessment_score_drivers' },
  { id: 'equipment', code: '03', name: 'Equipment', shortName: 'Equipment', hubspotProperty: 'assessment_score_equipment' },
  { id: 'overall', code: '04', name: 'Overall compliance', shortName: 'Overall', hubspotProperty: 'assessment_score_overall_compliance' },
];

export const QUESTIONS: Question[] = [
  {
    id: 'q1',
    dimension: 'admin',
    title: 'Safety program and accountability',
    text: 'Can you show a current safety program that fits your trucking operation, identify who is responsible for safety, and prove the rules are being followed day to day?',
    followUpTitle: 'Safety program is not consistently verified',
    followUpDetail: 'Review the safety manual, assigned safety responsibilities and evidence of day-to-day use.',
  },
  {
    id: 'q2',
    dimension: 'admin',
    title: 'Company records and renewals',
    text: 'Can you quickly find your Safety Fitness Certificate, insurance, permits and key company records, and show who checks expiry dates, renewals and missing paperwork?',
    followUpTitle: 'Records or renewals may be difficult to prove',
    followUpDetail: 'Check permits, insurance, certificates, document storage and expiry reminders.',
  },
  {
    id: 'q3',
    dimension: 'drivers',
    title: 'Hiring and driver files',
    text: 'For every driver, can you show a complete application, required work history and reference checks, valid licence, and hiring and ongoing driver-abstract reviews?',
    followUpTitle: 'Driver qualification files may have gaps',
    followUpDetail: 'Review applications, work history, checks, licence and abstracts.',
  },
  {
    id: 'q4',
    dimension: 'drivers',
    title: 'Training and driving-hours checks',
    text: 'Can you show driver orientation and safety training, regularly reviewed logbooks or ELD records, checks of available driving hours, and written follow-up when problems are found?',
    followUpTitle: 'Training or Hours of Service monitoring may be incomplete',
    followUpDetail: 'Check training evidence, log reviews, hours available and written corrective action.',
  },
  {
    id: 'q5',
    dimension: 'equipment',
    title: 'Maintenance and inspection records',
    text: 'For every truck and trailer, can you show the required current inspections, a preventive-maintenance plan, and dated records of servicing, repairs and completed inspections?',
    followUpTitle: 'Equipment maintenance records may be incomplete',
    followUpDetail: 'Check inspection status, preventive service schedules, work orders and repair records.',
  },
  {
    id: 'q6',
    dimension: 'equipment',
    title: 'Daily inspections and defects',
    text: 'Do drivers complete the required trip inspections, report defects promptly, and does your company keep the reports, document repairs and prevent unsafe vehicles from being used?',
    followUpTitle: 'Daily inspection and defect follow-up may be weak',
    followUpDetail: 'Check trip reports, defect reporting, repair confirmation and out-of-service controls.',
  },
  {
    id: 'q7',
    dimension: 'overall',
    title: 'Monitoring and follow-up',
    text: 'Do you regularly review your Carrier Profile, roadside inspections, tickets and collisions, identify repeat problems, and document who fixed each issue and when?',
    followUpTitle: 'Safety trends may not be followed to closure',
    followUpDetail: 'Review Carrier Profile trends, inspections, incidents and corrective-action records.',
  },
  {
    id: 'q8',
    dimension: 'overall',
    title: 'Ready before dispatch',
    text: 'Before a truck leaves, do you verify the driver has legal hours and qualifications, the equipment is safe, and the required permits and paperwork are current, and stop dispatch if any key item is missing?',
    followUpTitle: 'Pre-dispatch checks may not reliably prevent violations',
    followUpDetail: 'Confirm driver, equipment and trip requirements are checked before dispatch.',
  },
];

export const CHOICES: Choice[] = [
  { id: 'yes', label: 'Yes, all of it', short: 'Yes', points: 2 },
  { id: 'partly', label: 'Partly', short: 'Partly', points: 1 },
  { id: 'no', label: 'No', short: 'No', points: 0 },
  { id: 'notsure', label: 'Not sure', short: 'Not sure', points: 0 },
];

/** Ordered from highest threshold to lowest; the first band whose `min` the exact score meets wins. */
export const BANDS: Band[] = [
  {
    id: 'strong',
    min: 85,
    name: 'Strong Start!',
    message: [
      'Great job! Your company appears to have a solid foundation. Having safety procedures and records is one thing; being able to show they are current and followed every day is another. Even well-managed trucking companies can miss small details during an audit.',
      "You are doing well. Let's make sure your records tell the same story.",
    ],
    nextStep: 'Ask Prime Compliance for a second look at your audit readiness.',
  },
  {
    id: 'almost',
    min: 60,
    name: 'Almost There!',
    message: [
      'You are on the right track, but a few important pieces may be missing. During an audit, it is not just about what your company does; it is about what you can prove. Missing driver records, incomplete maintenance files or overlooked follow-ups can raise unexpected questions.',
      'The good news? You can work on these gaps before they become bigger problems.',
    ],
    nextStep: 'Let Prime Compliance help you identify what needs attention.',
  },
  {
    id: 'closer',
    min: 0,
    name: 'Time for a Closer Look!',
    message: [
      "Your trucking business works hard every day. Let's make sure your compliance records keep up. Your answers suggest that several important safety and compliance controls may be incomplete or not yet verified. An audit could bring these gaps to light unexpectedly.",
      'You have already taken a useful first step by checking where you stand.',
    ],
    nextStep: 'Talk to Prime Compliance about where to start.',
  },
];

/** The one qualifying tap after the eight questions. Does not change the score. */
export const POWER_UNITS = ['1 to 4', '5 to 20', '21 to 70', 'More than 70'] as const;
export type PowerUnits = (typeof POWER_UNITS)[number];

/** Per-area state: any No/Not sure => gap; else any Partly => look; else ready. */
export type AreaState = 'ready' | 'look' | 'gap';
export const AREA_STATE_WORD: Record<AreaState, string> = { ready: 'Ready', look: 'Needs a look', gap: 'Gap to close' };
/** Area the review starts with when every answer is Yes. */
export const ALL_YES_START_AREA: DimensionId = 'drivers';

/** User-facing copy around the questions and results (verbatim from the reference unless noted). */
export const ASSESSMENT_COPY = {
  title: 'Are you audit ready?',
  answerRuleSummary: 'How to answer',
  answerRule:
    'Choose Yes only if you can prove all parts of the question are covered. Answer based on current records and practice, not plans.',
  lastOne: 'Last one',
  toasts: { first: 'Good start', half: 'Halfway. Four to go.', last: 'All eight done' } as Record<string, string>,
  units: {
    count: 'One more tap',
    countSub: 'before your result',
    area: 'Your fleet',
    title: 'How many power units do you run?',
    text: 'This does not change your score. It tells us how to set up the review for a fleet your size.',
  },
  calcSteps: ['Adding up your eight answers', 'Matching each gap to its follow up', 'Your report is ready'],
  scoreLabel: 'Readiness score',
  nextStepLabel: 'Next step',
  scratchLabel: 'Your reward for finishing the check',
  scratchFoilTitle: 'Scratch to see your reward',
  scratchFoilSub: 'with your finger or the mouse',
  scratchRevealBtn: 'Scratch the card, or tap here to reveal',
  prizeKicker: 'Unlocked',
  prizeTitle: 'Your audit readiness review',
  prizeAllYes: 'We start with your driver files and check one of your Yes answers against your own records.',
  prizeWithGaps: (area: string) => `We start with ${area.toLowerCase()}, the area your answers point to, and open it on your own file.`,
  summaryAllYes: (units: string) =>
    `With ${units} power units and every area marked Yes, your next step is to check those answers against your own records.`,
  summaryWithGaps: (units: string, gaps: number, area: string) =>
    `With ${units} power units, ${
      gaps === 4 ? 'all 4 of your areas need' : gaps === 1 ? '1 of your 4 areas needs' : `${gaps} of your 4 areas need`
    } attention, and ${area.toLowerCase()} is where your answers point first.`,
  /** Added (v3 dashboard): heading over the area tiles. */
  areasHeading: 'Your readiness by area',
  concernsHeading: 'Based on your answers, we recommend reviewing:',
  /** How many follow-ups show before "Read your full report". */
  topFollowUps: 3,
  allYes: 'You answered Yes to all eight. Keep verifying records; a formal review may still find gaps.',
  keptWithGaps:
    'From your answers we pick the one area to start with, and we keep it for our meeting, where we open it on your own file. It is drawn only from what you told us.',
  keptAllYes:
    'At our meeting we take one of your Yes answers and check it against your own file, starting with your driver files, because a formal review may still find gaps.',
  askHeading: 'Would you feel confident if an auditor asked tomorrow?',
  askBody:
    'Prime Compliance can help you review the records behind your answers, identify gaps and create a practical plan to address them.',
  reportSummary: 'Read your full report',
  reportMore: (n: number) => `Read your full report, with ${n} ${n === 1 ? 'more item' : 'more items'}`,
  reportMoreHeading: 'The other items from your answers',
  again: 'Take the check again',
  fine:
    'How the score works: 8 equally weighted questions. Yes = 100%; Partly = 50%; No or Not sure = 0%. “Not sure” means unverified, not confirmed non-compliance. Important: this is a quick self-assessment. It is not an official audit or a regulator rating, and it does not promise compliance.',
};
