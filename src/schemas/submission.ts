/**
 * Shared Zod schemas: imported by the React form (via @hookform/resolvers) AND by the
 * Express route, so the browser and server validate with exactly the same rules.
 */
import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js/min';
import { CHOICES, POWER_UNITS, QUESTIONS, type ChoiceId } from '../data/assessment';

const choiceIds = CHOICES.map((c) => c.id) as [ChoiceId, ...ChoiceId[]];

export const leadSchema = z.object({
  fullName: z
    .string({ required_error: 'Please tell us your name.' })
    .trim()
    .min(1, 'Please tell us your name.')
    .min(2, 'That name looks a little short. Please enter your full name.')
    .max(100, 'Please keep your name under 100 characters.')
    .regex(/\p{L}/u, 'Please use letters in your name.'),
  email: z
    .string({ required_error: 'Please enter your email so we can send your result.' })
    .trim()
    .min(1, 'Please enter your email so we can send your result.')
    .max(254, 'That email is too long. Please check it.')
    .email("That email doesn't look quite right. Check for a missing @ or a typo, like name@company.com.")
    .transform((v) => v.toLowerCase()),
  phone: z
    .string({ required_error: 'Please add a phone number so we can reach you.' })
    .min(1, 'Please add a phone number so we can reach you.')
    .refine((v) => /^\+[1-9]\d{6,14}$/.test(v) && isValidPhoneNumber(v), {
      message: 'That number looks incomplete for the selected country. Please check the digits.',
    }),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Please tick the box so we can contact you about your result.' }),
  }),
});

export type LeadInput = z.input<typeof leadSchema>;
export type Lead = z.output<typeof leadSchema>;

const answersShape = Object.fromEntries(QUESTIONS.map((q) => [q.id, z.enum(choiceIds)])) as Record<
  string,
  z.ZodEnum<[ChoiceId, ...ChoiceId[]]>
>;
export const answersSchema = z.object(answersShape).strict();

const short = z.string().trim().max(300).optional();
export const attributionSchema = z
  .object({
    utm_source: short,
    utm_medium: short,
    utm_campaign: short,
    utm_term: short,
    utm_content: short,
    referrer: z.string().trim().max(1000).optional(),
    landingPage: z.string().trim().max(1000).optional(),
    firstSeenAt: z.string().datetime().optional(),
  })
  .strict();
export type Attribution = z.infer<typeof attributionSchema>;

export const submissionSchema = z
  .object({
    submissionId: z.string().uuid(),
    lead: leadSchema,
    answers: answersSchema,
    powerUnits: z.enum(POWER_UNITS, { errorMap: () => ({ message: 'Please choose how many power units you run.' }) }),
    attribution: attributionSchema.default({}),
    /** Milliseconds from opening the lead form to finishing (client clock); used for a minimum-time bot check. */
    durationMs: z.number().int().nonnegative().max(1000 * 60 * 60 * 24 * 30),
    /** Honeypot: real people never see or fill this. */
    website: z.string().max(500).optional(),
    turnstileToken: z.string().max(4096).optional(),
  })
  .strict();

export type SubmissionInput = z.input<typeof submissionSchema>;
export type Submission = z.output<typeof submissionSchema>;

export type SubmitStatus = 'synced' | 'queued' | 'duplicate';

export interface SubmitSuccess {
  ok: true;
  status: SubmitStatus;
  submissionId: string;
  requestId: string;
  /** True when the email already belonged to a contact (we updated rather than created). */
  existingContact: boolean;
  /** Server-computed score — authoritative. */
  result: { percent: number; bandId: string; dimensions: { id: string; percent: number }[] };
}

export interface SubmitFailure {
  ok: false;
  code: 'validation' | 'rate_limited' | 'bot_check' | 'server_error';
  message: string;
  requestId?: string;
  fieldErrors?: Record<string, string[]>;
}

export type SubmitResponse = SubmitSuccess | SubmitFailure;
