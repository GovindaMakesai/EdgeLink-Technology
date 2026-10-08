'use client';

import { Button } from '@/components/ui/primitives';

export default function DashboardError({ reset }) {
  return (
    <section className="panel">
      <h2>The portal hit a problem</h2>
      <p className="lede">Try the view again. Audit data stays on the server.</p>
      <Button onClick={() => reset()}>Try again</Button>
    </section>
  );
}
