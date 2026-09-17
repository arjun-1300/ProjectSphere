import type React from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { ApiError } from '@/lib/api/client';

export function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast('Account created — verify your email to finish.', 'success');
      navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not create account', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Publish work. Get discovered." foot={<>Already have an account? <Link className="link" to="/login">Log in</Link></>}>
      <form className="stack gap-4" onSubmit={onSubmit}>
        <Field label="Display name"><Input value={form.name} onChange={set('name')} placeholder="Ada Lovelace" /></Field>
        <Field label="Username" hint="Your public handle at /u/username."><Input value={form.username} required minLength={3} onChange={set('username')} placeholder="ada" /></Field>
        <Field label="Email"><Input type="email" value={form.email} required autoComplete="email" onChange={set('email')} /></Field>
        <Field label="Password" hint="At least 8 characters."><Input type="password" value={form.password} required minLength={8} autoComplete="new-password" onChange={set('password')} /></Field>
        <Button type="submit" loading={loading} block>Create account</Button>
      </form>
    </AuthLayout>
  );
}
