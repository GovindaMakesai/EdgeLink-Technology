import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export function reportsDirectory() {
  if (process.env.REPORTS_DIR) return path.resolve(process.env.REPORTS_DIR);
  return path.join(os.tmpdir(), 'reports');
}

export function safeReportPath(fileName) {
  const cleaned = path.basename(String(fileName || ''));
  if (!/^[\w.-]+\.pdf$/i.test(cleaned)) {
    throw new Error('Invalid report file name');
  }
  const root = path.resolve(reportsDirectory());
  const full = path.resolve(root, cleaned);
  const relative = path.relative(root, full);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Report path escaped the storage directory');
  }
  return full;
}

export async function writeReport(fileName, bytes) {
  const dir = reportsDirectory();
  await fs.mkdir(dir, { recursive: true });
  const full = safeReportPath(fileName);
  await fs.writeFile(full, bytes);
  return { filePath: full, fileName: path.basename(full), bytes: bytes.length };
}

export async function readReport(fileName) {
  const full = safeReportPath(fileName);
  const bytes = await fs.readFile(full);
  return { filePath: full, bytes };
}
