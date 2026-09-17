import type React from 'react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { ApiError } from '@/lib/api/client';

export function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ email, password, rememberMe: remember });
      toast('Welcome back', 'success');
      navigate(location.state?.from ?? '/', { replace: true });
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not log in', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Log in" subtitle="Pick up where you left off." foot={<>New here? <Link className="link" to="/register">Create an account</Link></>}>
      <form className="stack gap-4" onSubmit={onSubmit}>
        <Field label="Email"><Input type="email" value={email} autoComplete="email" required onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password"><Input type="password" value={password} autoComplete="current-password" required onChange={(e) => setPassword(e.target.value)} /></Field>
        <label className="row gap-2 mono" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Keep me signed in
        </label>
        <Button type="submit" loading={loading} block>Log in</Button>
        <Link className="link mono" style={{ textAlign: 'center' }} to="/forgot-password">Forgot password?</Link>
      </form>
    </AuthLayout>
  );
}
