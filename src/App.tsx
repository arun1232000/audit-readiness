import { useEffect, useState } from 'react';
import { brand } from './config/brand';
import { Ground, Invite, SiteFooter, SiteHeader } from './components/Chrome';
import { AuditModal } from './components/audit/AuditModal';
import { prefersReducedMotion } from './lib/reducedMotion';
import { asset, routePath } from './lib/paths';
import { getLastSubmission } from './lib/storage';
import { Landing } from './screens/Landing';
import { PrivacyScreen } from './screens/PrivacyScreen';
import { useAssessment } from './store/assessmentStore';

export function App({ path = window.location.pathname }: { path?: string }) {
  const modalOpen = useAssessment((s) => s.modalOpen);
  const open = useAssessment((s) => s.open);
  const [last] = useState(() => getLastSubmission());
  // invite: idle -> on -> leaving -> done. Shown once per page view, never after the check was opened.
  const [invite, setInvite] = useState<'idle' | 'on' | 'leaving' | 'done'>('idle');

  const openAudit = () => {
    setInvite('done');
    open();
  };

  useEffect(() => {
    if (modalOpen) setInvite('done');
  }, [modalOpen]);

  useEffect(() => {
    const t = setTimeout(
      () => setInvite((v) => (v === 'idle' && !useAssessment.getState().modalOpen ? 'on' : v)),
      prefersReducedMotion() ? 2500 : brand.inviteDelayMs,
    );
    return () => clearTimeout(t);
  }, []);

  if (routePath(path) === '/privacy') {
    return (
      <>
        <Ground />
        <SiteHeader onOpenAudit={() => (window.location.href = asset(''))} />
        <PrivacyScreen />
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Ground />
      <SiteHeader home onOpenAudit={openAudit} />
      <Landing onOpenAudit={openAudit} />
      <Invite
        hidden={invite === 'idle' || invite === 'done'}
        on={invite === 'on'}
        returning={!!last}
        onGo={() => {
          setInvite('done');
          if (last) useAssessment.getState().showPrevious(last.answers, last.powerUnits ?? null, last.submissionId);
          else open();
        }}
        onLater={() => {
          setInvite('leaving');
          setTimeout(() => setInvite('done'), 700);
        }}
        onRetake={() => {
          setInvite('done');
          useAssessment.getState().retake();
        }}
      />
      <AuditModal />
      <SiteFooter />
    </>
  );
}
