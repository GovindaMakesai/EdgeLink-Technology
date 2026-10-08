'use client';

import { Button } from '@/components/ui/primitives';

export default function AdminError({ reset }) {
  return (
    <section className="panel">
      <h2>The console hit a problem</h2>
      <p className="lede">Refresh the view. If the database was restarting, it should recover.</p>
      <Button onClick={() => reset()}>Try again</Button>
    </section>
  );
}
