'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Field } from '@/components/ui/primitives';

export function AuditForm({ clients, defaults }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const demo = clients.find((client) => client.isDemo) || clients[0];
  const [form, setForm] = useState({
    url: defaults?.url || 'https://www.edgelinktechnology.com/',
    clientId: demo?.id || '',
    clientName: '',
    businessType: defaults?.businessType || 'Digital marketing agency',
    city: defaults?.city || '',
    state: defaults?.state || '',
    targetKeyword: defaults?.targetKeyword || 'edgelink technology',
  });

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    const response = await fetch('/api/audits', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      toast.error(data.error || 'Could not start the audit');
      return;
    }
    toast.success('Audit queued');
    router.push(`/admin/audits/${data.audit.id}`);
    router.refresh();
  }

  return (
    <form className="panel" onSubmit={submit}>
      <div className="form-grid">
        <div className="wide">
          <Field label="Website URL">
            <input name="url" value={form.url} onChange={update} required inputMode="url" autoComplete="url" />
            <p className="form-note">Demo URL — you can replace this with any public website.</p>
          </Field>
        </div>
        <Field label="Client">
          <select name="clientId" value={form.clientId} onChange={update}>
            <option value="">New client name below</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}{client.isDemo ? ' (demo)' : ''}</option>
            ))}
          </select>
        </Field>
        <Field label="New client name">
          <input name="clientName" value={form.clientName} onChange={update} />
        </Field>
        <Field label="Business type">
          <input name="businessType" value={form.businessType} onChange={update} required />
        </Field>
        <Field label="Target keyword">
          <input name="targetKeyword" value={form.targetKeyword} onChange={update} required />
        </Field>
        <Field label="City">
          <input name="city" value={form.city} onChange={update} required />
        </Field>
        <Field label="State">
          <input name="state" value={form.state} onChange={update} required />
        </Field>
      </div>
      <div className="form-actions">
        <Button type="submit" disabled={pending}>{pending ? 'Queuing' : 'Start SEO audit'}</Button>
      </div>
    </form>
  );
}
