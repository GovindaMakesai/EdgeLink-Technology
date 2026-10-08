import Link from 'next/link';
import { LogoMark } from '@/components/brand/logo';
import { ScoreRing } from '@/components/visuals/score';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default function HomePage() {
  const session = getSession();
  if (session?.role === 'admin') redirect('/admin');
  if (session?.role === 'client') redirect('/dashboard');

  return (
    <main className="landing">
      <div className="ambient" aria-hidden="true">
        <span className="orb orb-violet" />
        <span className="orb orb-cyan" />
        <span className="grid-overlay" />
      </div>
      <section style={{ position: 'relative', zIndex: 1 }}>
        <LogoMark size={48} />
        <p className="eyebrow" style={{ marginTop: 18 }}>EdgeLink SEO Intelligence</p>
        <h1>See the audit move, then ship the report.</h1>
        <p className="lede">
          A queued SEO pipeline for local businesses. Crawl, lab data, schema, rankings, and a structured brief land in one console.
        </p>
        <div className="landing-actions">
          <Link className="btn btn-primary" href="/login">Open console</Link>
          <Link className="btn btn-secondary" href="/login?next=/dashboard">Client portal</Link>
        </div>
        <div className="stat-pills">
          <span className="badge badge-violet">BullMQ</span>
          <span className="badge badge-info">Live progress</span>
          <span className="badge badge-good">PDF + WhatsApp mock</span>
        </div>
      </section>
      <section className="score-card preview" style={{ position: 'relative', zIndex: 1 }}>
        <p className="eyebrow">Product preview</p>
        <ScoreRing score={72} caption="Sample score" delta="Illustrative only. Live audits replace this number." />
        <div className="pipeline" style={{ marginTop: 18 }}>
          {['Crawl', 'Performance', 'Schema', 'AI analysis', 'Report'].map((label, index) => (
            <div className={`pipe-step ${index < 3 ? 'done' : index === 3 ? 'active' : ''}`} key={label}>
              <div className="pipe-rail"><span className="pipe-dot" />{index < 4 ? <span className="pipe-line" /> : null}</div>
              <div className="pipe-copy"><strong>{label}</strong><span>{index < 3 ? 'Complete' : index === 3 ? 'In progress' : 'Waiting'}</span></div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
