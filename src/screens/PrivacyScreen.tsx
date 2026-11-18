import { brand } from '../config/brand';
import { asset } from '../lib/paths';
import { USE_WEB3FORMS } from '../lib/api';

/** Placeholder privacy policy. Replace with your organisation's reviewed policy text. */
export function PrivacyScreen() {
  return (
    <main className="privacy">
      <article className="col">
        <p className="kicker">
          <span className="dot" aria-hidden="true" />
          Placeholder: replace before launch
        </p>
        <h1>Privacy policy</h1>
        <p>
          {brand.name} collects your name, mobile number, email and your answers to The Audit, so we can show your result, send you
          your report, and contact you about an audit readiness review.
        </p>
        <h2>What we store</h2>
        <p>Your contact details, your answers and scores, your fleet size, the date you completed the check, your consent, and how you found us (campaign and referring site).</p>
        <h2>Where it is stored</h2>
        <p>
          {USE_WEB3FORMS
            ? 'Your details are delivered to our team by email through our form provider (Web3Forms). We do not sell your data.'
            : 'In our customer relationship system (HubSpot). We do not sell your data.'}
        </p>
        <h2>Your rights</h2>
        <p>
          You can ask to see, correct or delete your data at any time. Call {brand.phone.label} or write to us via{' '}
          <a href={brand.website.url}>{brand.website.label}</a>, and we will act within 30 days.
        </p>
        <p style={{ marginTop: 28 }}>
          <a href={asset('')}>Back to The Audit</a>
        </p>
      </article>
    </main>
  );
}
