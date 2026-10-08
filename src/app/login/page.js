'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { LogoMark } from '@/components/brand/logo';
import { Button, Field } from '@/components/ui/primitives';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '';
  const [email, setEmail] = useState('admin@edgelink.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState('');

  async function enter(body, destination) {
    setPending(destination);
    setError('');
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      setPending('');
      setError(data.error || 'Sign-in failed');
      return;
    }
    const target = body.demo === 'client' ? '/dashboard' : (next.startsWith('/admin') || next.startsWith('/dashboard') ? next : '/admin');
    router.push(body.demo === 'client' ? '/dashboard' : target);
    router.refresh();
  }

  return (
    <div className="login-screen">
      <div className="ambient" aria-hidden="true">
        <span className="orb orb-violet" />
        <span className="orb orb-cyan" />
      </div>
      <section className="login-card glass" style={{ position: 'relative', zIndex: 1 }}>
        <LogoMark />
        <p className="eyebrow" style={{ marginTop: 16 }}>Sign in</p>
        <h2>EdgeLink console</h2>
        <p className="lede">Demo access is enabled for this assessment build. Change the admin password before any public deployment.</p>
        <form
          className="stack"
          style={{ marginTop: 16 }}
          onSubmit={(event) => {
            event.preventDefault();
            enter({ email, password }, 'password');
          }}
        >
          <Field label="Email">
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required />
          </Field>
          <Field label="Password">
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
          </Field>
          {error ? <div className="error-banner">{error}</div> : null}
          <Button type="submit" disabled={Boolean(pending)}>Sign in</Button>
        </form>
        <div className="stack" style={{ marginTop: 14 }}>
          <Button variant="secondary" disabled={Boolean(pending)} onClick={() => enter({ demo: 'admin' }, 'admin')}>
            {pending === 'admin' ? 'Opening' : 'Continue as demo admin'}
          </Button>
          <Button variant="ghost" disabled={Boolean(pending)} onClick={() => enter({ demo: 'client' }, 'client')}>
            {pending === 'client' ? 'Opening' : 'View demo client portal'}
          </Button>
        </div>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="login-screen">Loading</div>}>
      <LoginForm />
    </Suspense>
  );
}
