import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export function jsonError(error, fallback = 500) {
  const status = Number(error?.status) || fallback;
  const message = status >= 500 ? error.message || 'Something went wrong' : error.message || 'Request failed';
  return NextResponse.json({ error: message }, { status });
}

export function requireApiSession() {
  const session = getSession();
  if (!session) {
    const error = new Error('Authentication required');
    error.status = 401;
    throw error;
  }
  return session;
}

export function requireApiAdmin() {
  const session = requireApiSession();
  if (session.role !== 'admin') {
    const error = new Error('Admin access is required');
    error.status = 403;
    throw error;
  }
  return session;
}

export function assertAuditAccess(session, audit) {
  if (session.role === 'admin') return;
  if (session.role === 'client' && audit.website?.clientId === session.clientId) return;
  const error = new Error('You do not have access to this audit');
  error.status = 403;
  throw error;
}
