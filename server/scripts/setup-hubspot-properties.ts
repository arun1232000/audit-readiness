/**
 * One-time setup: creates the "Assessment" contact property group and its properties in HubSpot.
 * Safe to re-run: existing group/properties are updated in place.
 *
 *   HUBSPOT_ACCESS_TOKEN=pat-... npm run hubspot:setup
 *   npm run hubspot:setup -- --dry-run
 */
import 'dotenv/config';
import { GROUP, PROPERTIES } from './hubspotProperties';

const BASE = (process.env.HUBSPOT_BASE_URL ?? 'https://api.hubapi.com').replace(/\/$/, '');
const token = process.env.HUBSPOT_ACCESS_TOKEN;
const dryRun = process.argv.includes('--dry-run');

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  return { status: res.status, text };
}

async function main() {
  if (dryRun) {
    console.log(`Group: ${GROUP.name} (${GROUP.label})`);
    PROPERTIES.forEach((p) => console.log(`  ${p.name}  [${p.type}/${p.fieldType}]  ${p.label}`));
    return;
  }
  if (!token) {
    console.error('HUBSPOT_ACCESS_TOKEN is not set. Add it to .env (see README).');
    process.exit(1);
  }

  const g = await call('POST', '/crm/v3/properties/contacts/groups', GROUP);
  if (g.status === 201) console.log(`✓ created group "${GROUP.label}"`);
  else if (g.status === 409) console.log(`• group "${GROUP.label}" already exists`);
  else throw new Error(`group create failed: ${g.status} ${g.text}`);

  for (const p of PROPERTIES) {
    const def = { ...p, groupName: GROUP.name, formField: false };
    const c = await call('POST', '/crm/v3/properties/contacts', def);
    if (c.status === 201) {
      console.log(`✓ created ${p.name}`);
    } else if (c.status === 409) {
      const { name: _n, type: _t, ...patch } = def; // type cannot change on an existing property
      const u = await call('PATCH', `/crm/v3/properties/contacts/${p.name}`, patch);
      if (u.status >= 300) throw new Error(`update ${p.name} failed: ${u.status} ${u.text}`);
      console.log(`• updated ${p.name}`);
    } else {
      throw new Error(`create ${p.name} failed: ${c.status} ${c.text}`);
    }
  }
  console.log('\nDone. Contacts > Properties > group "Assessment" now holds the assessment fields.');
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
