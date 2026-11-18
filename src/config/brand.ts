/**
 * Brand, contact details, images, page copy and call-to-action. Change these values to re-brand the app;
 * no component hard-codes any of them. Copy is from "The Audit" website version two (Nov 17).
 *
 * Colours: `accent` is the single brand colour ("road yellow"). It is written to the CSS variable --yellow
 * at start-up (see applyBrandTheme in src/lib/theme.ts). The rest of the palette lives in src/styles/theme.css.
 */

import { asset } from '../lib/paths';

export type CtaConfig =
  | { kind: 'whatsapp'; label: string; number: string; helper: string }
  | { kind: 'url'; label: string; url: string; helper: string };

const img = (name: string) => ({ src: asset(`img/${name}.jpg`), srcSet: `${asset(`img/${name}_960.jpg`)} 960w, ${asset(`img/${name}.jpg`)} 1920w` });

export const brand = {
  name: 'Prime Compliance',
  legal:
    'Prime Trucking Compliance Ltd, 201, 9258 34A Ave NW, Edmonton AB T6E 5P4, +1 780 209 1000, theprimecompliance.com/contact-us. The check is the team\'s self-assessment and not an official audit result or legal finding.',
  /** `src` is for light surfaces; `srcOnDark` (ink recoloured to white, yellow mark kept) for the dark UI. */
  logo: { src: asset('img/logo_prime.png'), srcOnDark: asset('img/logo_prime_light.png'), alt: 'Prime Compliance', width: 245, height: 96 },
  website: { label: 'theprimecompliance.com', url: 'https://theprimecompliance.com' },
  phone: { label: '780 209 1000', tel: '+17802091000' },
  whatsapp: { label: '780 909 7200', number: '17809097200' },
  defaultPhoneCountry: 'CA',

  colors: { accent: '#F6CB15' },

  /** href of the privacy page (base-aware); the route itself is "/privacy". */
  privacyPolicyPath: asset('privacy'),

  /** Results-page CTA. Swap to { kind: 'url', url: 'https://calendly.com/...' } for a booking page. */
  cta: {
    kind: 'whatsapp',
    label: 'Request your audit readiness review',
    number: '17809097200',
    helper: 'This opens WhatsApp with your result written in. You read it and send it yourself.',
  } as CtaConfig,

  /** Seconds before the small "The Audit" invitation appears on the landing page. */
  inviteDelayMs: 6000,

  meta: {
    title: 'Are you audit ready? | Prime Compliance',
    description:
      'A one minute audit readiness check for trucking fleet owners in Alberta and the provinces near it. Know where your file stands before the letter comes.',
  },

  nav: {
    audit: 'The Audit',
    call: 'Call ',
    sideTab: 'The Audit',
    sideTabSmall: '1 min',
    links: [
      { href: '#what-we-check', label: 'What we check' },
      { href: '#how-it-works', label: 'How it works' },
      { href: '#contact', label: 'Contact' },
    ],
    start: 'Start The Audit',
  },

  hero: {
    image: { ...img('hero_trans_canada_cochrane'), alt: 'The Trans-Canada Highway near Cochrane, Alberta, running west toward the Rocky Mountains under a soft grey sky.' },
    caption: 'The Trans-Canada Highway near Cochrane, Alberta',
    kicker: 'The Audit, for owners of 5 to 70 trucks',
    headline: ['Are', 'you', 'audit', 'ready?'],
    lede: 'For fleets in Alberta and the provinces near it. One person in your office, our back office beside them, and your file ready before the letter comes.',
    promise: ['8 taps', '1 minute', 'Your score by area'],
    cta: 'Start The Audit',
    ctaNote: 'No sign-up to start. Your score by area at the end.',
    callPrefix: 'or call',
  },

  /** Hero: the first question, answerable right on the landing page. */
  heroCheck: {
    label: 'Question 1 of 8',
    hint: 'Tap an answer to begin. Your progress is kept.',
  },

  /** "What we check": the four areas, built from the assessment data. */
  areas: {
    kicker: 'What we check',
    heading: 'Four areas an auditor opens first',
    body: 'Two questions in each. Answer from your records as they are today, not plans.',
  },

  /** Closing call to action, above the contact card. */
  ctaBand: {
    kicker: 'Six new fleets a week',
    heading: 'Know where your file stands before the letter does.',
    body: 'One minute, eight taps, your score by area and the items to review first.',
  },

  strip: ["Driver's licence", 'Abstract', 'Road test', 'Training record', 'Inspection', 'Work order', 'Roadside ticket', 'Permit'],

  letter: {
    kicker: 'The letter',
    say: [
      'The letter can land before anyone has looked at your file.',
      'Ready means every paper is already there the moment it is asked for.',
      "Let's get you ready before the letter does.",
    ],
    loss: 'On that day, what counts is what you can show.',
    paperAria: 'A drawing of a letter asking for records: driver files, maintenance records and renewals. A small mark sits beside each.',
    paperHead: 'A letter about your records',
    paperTitle: 'Please have the following ready',
    paperAsk: ['Driver files, for every driver', 'Maintenance and inspection records', 'Permits and renewals, in date'],
    paperFoot: 'Illustration only. Not a real notice.',
  },

  bands: {
    letter: { ...img('letter_hwy16_rockies_snow'), y: '70%', alt: 'An open highway through the Rocky Mountains in Alberta after an early snow, the road quiet and clear.', caption: 'Highway 16 through the Rocky Mountains, Alberta' },
    week: { ...img('week_trans_canada_rockies'), y: '80%', alt: 'Trucks and cars on the Trans-Canada Highway in Alberta on a summer day, the Rocky Mountains ahead.', caption: 'The Trans-Canada Highway with the Rocky Mountains, Alberta' },
    benefits: { ...img('benefits_long_nose_tractor'), y: '55%', alt: 'A well kept long nose tractor with its trailer, parked in a lot at dusk.', caption: 'A long nose tractor, kept with care' },
  },

  calm: {
    kicker: 'The calm way out',
    heading: 'Your office keeps the file. We keep the habit going.',
    coreLead: 'One person in your office, working alongside our back office account executives, and ',
    coreEm: 'together we build the systems.',
    gaps: {
      tag: 'A driver file with gaps',
      sub: 'Northline Haulage (made up), driver Ravi Dhal (made up)',
      rows: [
        ["Driver's licence", 'in date', true],
        ['Abstract', 'older than a year', false],
        ['Road test', 'missing', false],
        ['Training record', 'on file', true],
        ['Inspection', 'current', true],
      ] as [string, string, boolean][],
      line: 'Two holes. Neither was caused on the day of the audit.',
    },
    good: {
      tag: 'A ready driver file',
      sub: 'Northline Haulage (made up), driver Sam Lee (made up)',
      rows: [
        ["Driver's licence", 'in date', true],
        ['Abstract', 'current, under a year', true],
        ['Road test', 'on file', true],
        ['Training record', 'on file', true],
        ['Inspection', 'current', true],
      ] as [string, string, boolean][],
      line: 'Nothing to hunt for. The file answers as it is.',
    },
    madeUp: 'Made up example. The company and driver names are invented.',
  },

  week: {
    kicker: 'How a week runs',
    heading: 'Three small habits, in your own office',
    steps: [
      { title: 'A phone photo as each paper comes in.', body: 'Licence, abstract, inspection, work order, permit.' },
      { title: 'One click on WhatsApp.', body: 'It lands in the right file, dated.' },
      { title: 'Our back office account executive follows up.', body: 'Every week: what is missing, until it is in.' },
    ],
  },

  benefits: {
    body: 'Fleets that follow our systems faithfully can stand in a better place when their coverage renews, can find their trucks easier to finance, and can keep a well kept unit earning for many more years. ',
    strong: 'That is peace of mind.',
  },

  close: {
    six: 'We are bringing AI into our whole system, so we take on six new fleets a week, in the order they reach us.',
    small: 'Six new fleets a week, in the order they reach us.',
  },

  end: {
    image: { ...img('end_aurora_canola'), alt: 'Northern lights over a canola field in Alberta at night.' },
    peace: 'For peace of mind, contact us.',
    whatsappSmall: 'WhatsApp, send us your result',
    callSmall: 'Calls to our Edmonton office',
    webSmall: 'On the web',
  },

  invite: {
    kicker: 'The Audit, one minute',
    title: 'Where does your file stand today?',
    sub: '8 taps. Your score by area, and a reward card to scratch at the end.',
    go: 'Start The Audit',
    returningKicker: 'Welcome back',
    returningTitle: 'Your last result is saved.',
    returningGo: 'See your result',
    returningAlt: 'Take the check again',
  },

  lead: {
    area: 'Your report is ready',
    heading: 'Where should we send your report?',
    submit: 'Show my result',
    dataUse: 'We use these only to send your report and set a time to meet. We never sell them.',
    consentLabel: 'I agree that Prime Compliance may store my answers and contact me about my result.',
    preview: {
      kicker: "What's inside",
      title: 'Score, 4 areas and a reward',
      sub: 'Unlocks as soon as you continue.',
      listTitle: 'Your readiness by area',
      foot: 'Also inside: the items to review first, and a reward card to scratch.',
    },
  },

  credits: [
    { text: 'Trans Canada Highway, Cochrane', href: 'https://commons.wikimedia.org/wiki/File:Trans_Canada_Highway_-_Cochrane_-_panoramio.jpg', by: 'Jack Borno', lic: 'CC BY-SA 3.0', licHref: 'https://creativecommons.org/licenses/by-sa/3.0/' },
    { text: 'Part of the Rocky Mountains along Highway 16 in Alberta, Canada', href: 'https://commons.wikimedia.org/wiki/File:Part_of_the_Rocky_Mountains_along_Highway_16_in_Alberta,_Canada3.jpg', by: 'Joli Rumi', lic: 'CC BY-SA 4.0', licHref: 'https://creativecommons.org/licenses/by-sa/4.0/' },
    { text: 'Trans-Canada Highway with a view of the Rocky Mountains, Alberta', href: 'https://commons.wikimedia.org/wiki/File:Trans-Canada_Highway_with_a_view_of_the_Rocky_Mountains,_Alberta,_2025-07-11.jpg', by: 'Chris Woodrich', lic: 'CC BY-SA 4.0', licHref: 'https://creativecommons.org/licenses/by-sa/4.0/' },
    { text: 'Kenworth W 900', href: 'https://commons.wikimedia.org/wiki/File:Kenworth_W_900_(28333235092).jpg', by: 'Janusz Sobolewski', lic: 'CC BY 2.0', licHref: 'https://creativecommons.org/licenses/by/2.0/' },
    { text: 'Aurora over Canola fields in Alberta', href: 'https://commons.wikimedia.org/wiki/File:Aurora_over_Canola_fields_in_Alberta_(7594440272).jpg', by: 'WherezJeff', lic: 'CC BY 2.0', licHref: 'https://creativecommons.org/licenses/by/2.0/' },
  ],
};

export type Brand = typeof brand;
