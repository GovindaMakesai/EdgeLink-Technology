import puppeteer from 'puppeteer';
import { renderReportHtml } from './template';
import { writeReport } from '../services/storage';

export async function generatePdfReport(report, fileName) {
  const html = renderReportHtml(report);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '18px', right: '18px', bottom: '24px', left: '18px' },
    });
    return writeReport(fileName, Buffer.from(pdf));
  } finally {
    await browser.close();
  }
}
