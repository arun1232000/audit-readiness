import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import PhoneInput from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import { brand } from '../../config/brand';
import { DIMENSIONS } from '../../data/assessment';
import { leadSchema, type Lead, type LeadInput } from '../../schemas/submission';
import { MAIL_ICON } from '../icons';
import { Turnstile } from '../Turnstile';

interface Props {
  defaultValues?: Partial<LeadInput>;
  onSubmit: (lead: Lead, honeypot: string, turnstileToken: string | null) => void;
  defaultCountry?: string;
}

/** "Where should we send your report?" — required name, mobile and email, plus consent. */
export function LeadStep({ defaultValues, onSubmit, defaultCountry = brand.defaultPhoneCountry }: Props) {
  const [honeypot, setHoneypot] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const {
    register,
    control,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<LeadInput, unknown, Lead>({
    resolver: zodResolver(leadSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: { fullName: '', email: '', phone: '', ...defaultValues, consent: defaultValues?.consent ?? (false as unknown as true) },
  });
  useEffect(() => title.current?.focus({ preventScroll: true }), []);

  const errorCount = Object.keys(errors).length;
  const err = (id: string, msg?: string) => (
    <span id={`${id}-error`} className="fielderr" aria-live="polite">
      {msg ?? ''}
    </span>
  );

  return (
    <div className="lead-grid">
    <div className="card" id="sendto">
      <div className="qtop">
        <div className="qicon" aria-hidden="true">
          {MAIL_ICON}
        </div>
        <div>
          <p className="area">{brand.lead.area}</p>
          <h3 className="qtitle" id="sendtitle" ref={title} tabIndex={-1}>
            {brand.lead.heading}
          </h3>
        </div>
      </div>
      <form
        className="sendform"
        noValidate
        aria-labelledby="sendtitle"
        onSubmit={handleSubmit(
          (lead) => onSubmit(lead, honeypot, token),
          (errs) => {
            const first = (['fullName', 'phone', 'email', 'consent'] as const).find((k) => errs[k]);
            if (first) setFocus(first);
          },
        )}
      >
        <label className="field">
          <span>Full name</span>
          <input
            id="fullName"
            autoComplete="name"
            aria-invalid={!!errors.fullName}
            aria-describedby="fullName-error"
            {...register('fullName')}
          />
          {err('fullName', errors.fullName?.message)}
        </label>

        <div className="field">
          <label htmlFor="phone">
            <span>Mobile</span>
          </label>
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <PhoneInput
                id="phone"
                name={field.name}
                ref={field.ref}
                className={errors.phone ? 'invalid' : undefined}
                value={field.value || undefined}
                onChange={(v) => field.onChange(v ?? '')}
                onBlur={field.onBlur}
                flags={flags}
                defaultCountry={defaultCountry as never}
                countryCallingCodeEditable={false}
                autoComplete="tel"
                placeholder="780 000 0000"
                countrySelectProps={{ 'aria-label': 'Country calling code' }}
                numberInputProps={{ 'aria-invalid': !!errors.phone, 'aria-describedby': 'phone-error', inputMode: 'tel' }}
              />
            )}
          />
          {err('phone', errors.phone?.message)}
        </div>

        <label className="field">
          <span>Email</span>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={!!errors.email}
            aria-describedby="email-error"
            {...register('email')}
          />
          {err('email', errors.email?.message)}
        </label>

        {/* Honeypot: hidden from people and assistive tech; bots tend to fill every field. */}
        <div className="hp" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
        </div>

        <div className="field">
          <label className="consent" htmlFor="consent">
            <input id="consent" type="checkbox" aria-invalid={!!errors.consent} aria-describedby="consent-error" {...register('consent')} />
            <span>
              {brand.lead.consentLabel}{' '}
              <a href={brand.privacyPolicyPath} target="_blank" rel="noopener">
                Read our privacy policy
              </a>
              .
            </span>
          </label>
          {err('consent', errors.consent?.message)}
        </div>

        <Turnstile onToken={setToken} />

        {submitCount > 0 && errorCount > 0 && (
          <p className="formerr" role="alert">
            {errorCount === 1 ? 'One thing needs fixing before your result.' : `${errorCount} things need fixing before your result.`}
          </p>
        )}
        <button className="btn" type="submit" disabled={isSubmitting}>
          {brand.lead.submit} <span className="arr" aria-hidden="true">&rarr;</span>
        </button>
        <p className="datause">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          {brand.lead.dataUse}
        </p>
      </form>
    </div>
    <ReportPreview />
    </div>
  );
}

/** What is waiting behind the form. States are blurred, never real values. */
function ReportPreview() {
  const p = brand.lead.preview;
  return (
    <aside className="card preview" aria-label={p.title}>
      <p className="kicker">
        <span className="dot" aria-hidden="true" />
        {p.kicker}
      </p>
      <div className="preview-ring">
        <svg viewBox="0 0 72 72" aria-hidden="true">
          <circle className="trk" cx="36" cy="36" r="32" />
          <circle className="val" cx="36" cy="36" r="32" />
        </svg>
        <p>
          <b>{p.title}</b>
          {p.sub}
        </p>
      </div>
      <h4>{p.listTitle}</h4>
      <ul>
        {DIMENSIONS.map((d) => (
          <li key={d.id}>
            {d.name}
            <em aria-hidden="true">Ready</em>
          </li>
        ))}
      </ul>
      <p className="preview-foot">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="10" width="16" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
        {p.foot}
      </p>
    </aside>
  );
}
