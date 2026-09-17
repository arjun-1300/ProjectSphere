import type React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '@/lib/api/auth';
import { useToast } from '@/components/ui/Toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';

export function ForgotPasswordPage() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try { await authApi.forgotPassword(email); setSent(true); }
    catch { toast('Could not send reset email', 'error'); }
    finally { setLoading(false); }
  }

  return (
    <AuthLayout title="Reset password" subtitle="We'll email you a reset link." foot={<Link className="link" to="/login">Back to log in</Link>}>
      {sent ? (
        <p className="soft" style={{ margin: 0 }}>If an account exists for {email}, a reset link is on its way.</p>
      ) : (
        <form className="stack gap-4" onSubmit={onSubmit}>
          <Field label="Email"><Input type="email" value={email} required onChange={(e) => setEmail(e.target.value)} /></Field>
          <Button type="submit" loading={loading} block>Send reset link</Button>
        </form>
      )}
    </AuthLayout>
  );
}
