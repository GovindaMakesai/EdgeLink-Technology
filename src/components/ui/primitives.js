import { cn } from '@/lib/utils';

export function Button({ className, variant = 'primary', type = 'button', ...props }) {
  return <button type={type} className={cn('btn', `btn-${variant}`, className)} {...props} />;
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function statusTone(status) {
  if (status === 'COMPLETED') return 'good';
  if (status === 'FAILED') return 'bad';
  if (status === 'QUEUED') return 'neutral';
  return 'info';
}

export function priorityTone(priority) {
  if (priority === 'CRITICAL') return 'bad';
  if (priority === 'HIGH') return 'watch';
  if (priority === 'MEDIUM') return 'info';
  return 'neutral';
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
