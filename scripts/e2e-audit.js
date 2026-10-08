import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';
import { createAuditRecord, ensureDemoClient } from '../src/services/audit-service.js';
import { spawn } from 'node:child_process';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const worker = spawn('npx', ['tsx', 'src/workers/index.js'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd(),
});

let finished = false;

async function shutdown(code) {
  if (finished) return;
  finished = true;
  worker.kill();
  await prisma.$disconnect();
  process.exit(code);
}

async function main() {
  await ensureDemoClient();
  const audit = await createAuditRecord({
    url: 'https://www.wikipedia.org/',
    clientName: 'Public demo site',
    businessType: 'Encyclopedia',
    city: 'Global',
    state: 'Worldwide',
    targetKeyword: 'wikipedia',
  });

  console.log(`[e2e] queued ${audit.id} job ${audit.bullJobId}`);
  const started = Date.now();
  while (Date.now() - started < 180000) {
    const current = await prisma.audit.findUnique({
      where: { id: audit.id },
      include: { result: true, report: true, deliveries: true },
    });
    console.log(`[e2e] ${current.status} ${current.progress}% ${current.currentStep}`);
    if (current.status === 'COMPLETED') {
      if (!current.result || !current.report) throw new Error('Completed audit is missing result or report');
      const whatsapp = current.deliveries.find((item) => item.channel === 'whatsapp');
      if (!whatsapp) throw new Error('WhatsApp delivery was not recorded');
      console.log(`[e2e] score ${current.result.overallScore} report ${current.report.fileName} whatsapp ${whatsapp.status}`);
      await shutdown(0);
    }
    if (current.status === 'FAILED') {
      throw new Error(current.errorMessage || 'Audit failed');
    }
    await wait(2000);
  }
  throw new Error('Timed out waiting for the audit to complete');
}

main().catch(async (error) => {
  console.error(`[e2e] ${error.message}`);
  await shutdown(1);
});
