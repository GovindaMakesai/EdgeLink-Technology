export const PIPELINE_STEPS = [
  { key: 'queued', label: 'Queued', status: 'QUEUED', progress: 2 },
  { key: 'crawling', label: 'Crawling', status: 'CRAWLING', progress: 12 },
  { key: 'pagespeed', label: 'PageSpeed', status: 'ANALYZING', progress: 24 },
  { key: 'search-console', label: 'Search Console', status: 'ANALYZING', progress: 34 },
  { key: 'schema', label: 'Schema', status: 'ANALYZING', progress: 44 },
  { key: 'on-page', label: 'On-page', status: 'ANALYZING', progress: 54 },
  { key: 'robots-sitemap', label: 'Robots and sitemap', status: 'ANALYZING', progress: 62 },
  { key: 'rankings', label: 'Rankings', status: 'ANALYZING', progress: 70 },
  { key: 'ai-analysis', label: 'AI analysis', status: 'ANALYZING', progress: 82 },
  { key: 'saving', label: 'Saving', status: 'ANALYZING', progress: 88 },
  { key: 'generating-pdf', label: 'Generating report', status: 'GENERATING_REPORT', progress: 94 },
  { key: 'notifying', label: 'Delivering', status: 'DELIVERING', progress: 97 },
  { key: 'completed', label: 'Completed', status: 'COMPLETED', progress: 100 },
];

export const VISUAL_STAGES = [
  { id: 'crawl', label: 'Crawl', detail: 'Fetch and parse the page', steps: ['crawling'] },
  { id: 'performance', label: 'Performance', detail: 'Core Web Vitals', steps: ['pagespeed'] },
  { id: 'search', label: 'Search data', detail: 'Search Console', steps: ['search-console'] },
  { id: 'schema', label: 'Schema', detail: 'JSON-LD types', steps: ['schema'] },
  { id: 'onpage', label: 'On-page', detail: 'Titles, headings, links', steps: ['on-page'] },
  { id: 'robots', label: 'Robots', detail: 'robots.txt and sitemap', steps: ['robots-sitemap'] },
  { id: 'rankings', label: 'Rankings', detail: 'Keyword position', steps: ['rankings'] },
  { id: 'ai', label: 'AI analysis', detail: 'Prioritised recommendations', steps: ['ai-analysis'] },
  { id: 'report', label: 'Report', detail: 'PDF and delivery', steps: ['saving', 'generating-pdf', 'notifying', 'completed'] },
];

export function stepMeta(key) {
  return PIPELINE_STEPS.find((step) => step.key === key) || PIPELINE_STEPS[0];
}

export function stageState(stage, currentStep, status) {
  if (status === 'FAILED') {
    const current = VISUAL_STAGES.findIndex((item) => item.steps.includes(currentStep));
    const index = VISUAL_STAGES.findIndex((item) => item.id === stage.id);
    if (current >= 0 && index < current) return 'done';
    if (index === current) return 'failed';
    return 'wait';
  }
  if (status === 'COMPLETED' || currentStep === 'completed') return 'done';
  const order = VISUAL_STAGES.map((item) => item.id);
  const currentStage = VISUAL_STAGES.find((item) => item.steps.includes(currentStep));
  const currentIndex = currentStage ? order.indexOf(currentStage.id) : currentStep === 'queued' ? -1 : 0;
  const index = order.indexOf(stage.id);
  if (index < currentIndex) return 'done';
  if (index === currentIndex) return 'active';
  return 'wait';
}
