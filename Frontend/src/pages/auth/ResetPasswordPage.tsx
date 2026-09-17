import type React from 'react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '@/lib/api/auth';
import { useToast } from '@/components/ui/Toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { ApiError } from '@/lib/api/client';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const toast = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      toast('Password updated — log in with your new password.', 'success');
      navigate('/login');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Reset failed', 'error');
    } finally { setLoading(false); }
  }

  return (
    <AuthLayout title="Set a new password" foot={<Link className="link" to="/login">Back to log in</Link>}>
      {!token ? (
        <p className="danger" style={{ margin: 0 }}>This reset link is missing its token.</p>
      ) : (
        <form className="stack gap-4" onSubmit={onSubmit}>
          <Field label="New password" hint="At least 8 characters."><Input type="password" value={password} required minLength={8} onChange={(e) => setPassword(e.target.value)} /></Field>
          <Button type="submit" loading={loading} block>Update password</Button>
        </form>
      )}
    </AuthLayout>
  );
}
