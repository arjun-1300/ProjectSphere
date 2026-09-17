import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '@/lib/api/auth';
import { useToast } from '@/components/ui/Toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import { ApiError } from '@/lib/api/client';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const token = params.get('token');
  const emailFromQuery = params.get('email') ?? '';

  // If the link carried a token, verify automatically. Otherwise fall back to
  // the manual email + 6-digit code form below.
  const [linkState, setLinkState] = useState<'idle' | 'working' | 'ok' | 'fail'>(token ? 'working' : 'idle');
  const [linkMsg, setLinkMsg] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    authApi.verifyEmail({ token })
      .then(() => setLinkState('ok'))
      .catch((e) => { setLinkState('fail'); setLinkMsg(e instanceof ApiError ? e.message : 'Verification failed'); });
  }, [token]);

  // Manual code path
  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resending, setResending] = useState(false);

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await authApi.verifyEmail({ email, code });
      setVerified(true);
      toast('Email verified — you can log in now.', 'success');
      setTimeout(() => navigate('/login'), 900);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'That code did not match.', 'error');
    } finally { setBusy(false); }
  }

  async function resend() {
    if (!email) { toast('Enter your email first.', 'error'); return; }
    setResending(true);
    try { await authApi.resendVerification(email); toast('If that account exists, a new email is on its way.', 'success'); }
    catch { toast('Could not resend right now.', 'error'); }
    finally { setResending(false); }
  }

  const done = linkState === 'ok' || verified;

  return (
    <AuthLayout
      title="Verify your email"
      subtitle={done ? undefined : 'Open the link in your email, or enter the 6-digit code from it below.'}
      foot={<Link className="link" to="/login">Back to log in</Link>}
    >
      {linkState === 'working' ? (
        <Spinner label="verifying link" />
      ) : done ? (
        <div className="stack gap-3">
          <p className="soft" style={{ margin: 0 }}>Your email is verified.</p>
          <Link to="/login" className="btn btn-primary btn-block">Continue to log in</Link>
        </div>
      ) : (
        <div className="stack gap-4">
          {linkState === 'fail' && <p className="danger" style={{ margin: 0 }}>{linkMsg} — try the code instead.</p>}
          <form className="stack gap-4" onSubmit={submitCode}>
            <Field label="Email"><Input type="email" value={email} required onChange={(e) => setEmail(e.target.value)} /></Field>
            <Field label="6-digit code" hint="From the verification email.">
              <Input inputMode="numeric" pattern="[0-9]*" maxLength={6} value={code} required
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.3em' }} />
            </Field>
            <Button type="submit" loading={busy} block disabled={code.length !== 6}>Verify email</Button>
          </form>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="mono">Didn't get it?</span>
            <Button variant="ghost" size="sm" loading={resending} onClick={resend}>Resend email</Button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
