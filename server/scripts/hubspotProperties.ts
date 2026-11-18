/** Definitions of the custom contact properties this app writes. Used by the setup script. */
import { DIMENSIONS, POWER_UNITS } from '../../src/data/assessment';

export const GROUP = { name: 'assessment', label: 'Assessment', displayOrder: -1 };

export interface PropertyDef {
  name: string;
  label: string;
  type: 'number' | 'string' | 'datetime' | 'bool' | 'enumeration';
  fieldType: 'number' | 'text' | 'textarea' | 'date' | 'booleancheckbox' | 'select';
  description: string;
  options?: { label: string; value: string; displayOrder: number }[];
}

export const PROPERTIES: PropertyDef[] = [
  { name: 'assessment_overall_score', label: 'Assessment overall score', type: 'number', fieldType: 'number', description: 'Audit readiness score, 0-100 (rounded).' },
  ...DIMENSIONS.map<PropertyDef>((d) => ({
    name: d.hubspotProperty,
    label: `Assessment score: ${d.name}`,
    type: 'number',
    fieldType: 'number',
    description: `Readiness score for "${d.name}", 0-100.`,
  })),
  { name: 'assessment_result_label', label: 'Assessment result label', type: 'string', fieldType: 'text', description: 'Result band, e.g. "Almost There!".' },
  { name: 'assessment_completed_at', label: 'Assessment completed at', type: 'datetime', fieldType: 'date', description: 'When the latest check was completed.' },
  {
    name: 'assessment_consent',
    label: 'Assessment consent',
    type: 'bool',
    fieldType: 'booleancheckbox',
    description: 'Agreed to be contacted about their result.',
    options: [
      { label: 'Yes', value: 'true', displayOrder: 0 },
      { label: 'No', value: 'false', displayOrder: 1 },
    ],
  },
  {
    name: 'assessment_power_units',
    label: 'Assessment power units',
    type: 'enumeration',
    fieldType: 'select',
    description: 'Fleet size given in the check (does not change the score).',
    options: POWER_UNITS.map((u, i) => ({ label: u, value: u, displayOrder: i })),
  },
  { name: 'assessment_start_area', label: 'Assessment area to start with', type: 'string', fieldType: 'text', description: 'Lowest-scoring area (Drivers when all Yes).' },
  { name: 'assessment_source', label: 'Assessment source', type: 'string', fieldType: 'textarea', description: 'UTM parameters and referrer at first visit.' },
  { name: 'assessment_answers_json', label: 'Assessment answers (JSON)', type: 'string', fieldType: 'textarea', description: 'Raw answers to every question.' },
  { name: 'assessment_last_submission_id', label: 'Assessment last submission ID', type: 'string', fieldType: 'text', description: 'Internal: prevents duplicate notes on retries.' },
];
