'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button, Field } from '@/components/ui/primitives';

export function ClientCreate() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    const response = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      toast.error(data.error || 'Could not create the client');
      return;
    }
    toast.success('Client created');
    setOpen(false);
    setForm({ name: '', email: '', phone: '' });
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add client</Button>
      {open ? (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <form className="modal-content stack" onClick={(event) => event.stopPropagation()} onSubmit={submit}>
            <h2>New client</h2>
            <Field label="Name"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
            <Field label="Email"><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
            <Field label="Phone"><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
            <div className="row-actions">
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={pending}>{pending ? 'Saving' : 'Save client'}</Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
