import { clamp } from '../lib/utils';
import { validateAuditResult } from '../validations/ai-result';

function scoreFromFindings(findings, start = 88) {
  let score = start;
  for (const finding of findings || []) {
    if (finding.severity === 'critical') score -= 18;
    else if (finding.severity === 'important') score -= 8;
    else score -= 3;
  }
  return clamp(Math.round(score));
}

function cwvScore(pagespeed) {
  const audits = pagespeed?.audits || {};
  const parts = [
    pagespeed?.categories?.performance?.score,
    audits['largest-contentful-paint']?.score,
    audits['cumulative-layout-shift']?.score,
    audits['interaction-to-next-paint']?.score,
  ].filter((value) => typeof value === 'number');
  if (!parts.length) return 50;
  return clamp(Math.round((parts.reduce((sum, value) => sum + value, 0) / parts.length) * 100));
}

function recommendation(priority, category, finding, fix, impact, effort, check) {
  return {
    priority,
    category,
    finding: finding.slice(0, 480),
    fix: fix.slice(0, 700),
    estimated_impact: impact,
    effort,
    falsifiability_check: check.slice(0, 380),
  };
}

function sentences(parts) {
  return parts.filter(Boolean).slice(0, 3).join(' ');
}

export function buildFallbackAnalysis(input) {
  const crawl = input.crawl || {};
  const onPage = input.onPage || { findings: [] };
  const technical = input.technical || { findings: [] };
  const schema = input.schema || { findings: [] };
  const robots = input.robots || { findings: [] };
  const pagespeed = input.pagespeed || {};
  const gsc = input.gsc || {};
  const rankings = input.rankings || {};
  const keyword = input.keyword || rankings?.tasks?.[0]?.result?.[0]?.keyword || 'the target keyword';
  const business = input.businessType || 'local business';
  const city = input.city || 'the city';

  const technicalFindings = [...(technical.findings || []), ...(robots.findings || [])];
  const breakdown = {
    technical: scoreFromFindings(technicalFindings, crawl.ok ? 90 : 55),
    on_page: scoreFromFindings(onPage.findings, crawl.ok ? 86 : 48),
    content: clamp(crawl.wordCount >= 600 ? 84 : crawl.wordCount >= 300 ? 70 : crawl.wordCount > 0 ? 52 : 36),
    core_web_vitals: cwvScore(pagespeed),
    schema: schema.present && !(schema.malformed || []).length ? (schema.relevantTypes?.length ? 86 : 64) : schema.malformed?.length ? 34 : 28,
  };

  const overall = clamp(
    Math.round(
      breakdown.technical * 0.25 +
        breakdown.on_page * 0.25 +
        breakdown.content * 0.15 +
        breakdown.core_web_vitals * 0.2 +
        breakdown.schema * 0.15
    )
  );

  const lcp = pagespeed?.audits?.['largest-contentful-paint']?.displayValue || 'a slow LCP';
  const position = rankings?.client_rank_position;
  const clicks = gsc?.totalClicks;
  const coverage = gsc?.indexCoverageErrors;

  const recommendations = [];
  if (!crawl.ok) {
    recommendations.push(
      recommendation(
        'CRITICAL',
        'Technical',
        crawl.error || 'The website did not return a crawlable document.',
        'Restore DNS, hosting, and a 200 response for the exact homepage URL, then allow the crawler user agent.',
        'High',
        'Days',
        'A fresh crawl records HTTP 200 and a non-empty title.'
      )
    );
  }
  if (!onPage.title?.exists) {
    recommendations.push(
      recommendation(
        'CRITICAL',
        'OnPage',
        'The homepage title tag is missing.',
        `Add one unique title of 50–60 characters that includes ${keyword}.`,
        'High',
        'Hours',
        'The next crawl shows a title between 50 and 60 characters.'
      )
    );
  }
  if ((pagespeed?.audits?.['largest-contentful-paint']?.score ?? 1) < 0.75) {
    recommendations.push(
      recommendation(
        'HIGH',
        'CWV',
        `Largest Contentful Paint is ${lcp} on mobile.`,
        'Compress the hero image, preload the LCP asset, and remove render-blocking CSS or JavaScript from the initial view.',
        'High',
        'Days',
        'PageSpeed LCP drops below 2.5 seconds on mobile.'
      )
    );
  }
  if (!schema.present || !(schema.relevantTypes || []).length) {
    recommendations.push(
      recommendation(
        'HIGH',
        'Schema',
        `No ${business} JSON-LD entity with local details was detected.`,
        `Add Dentist or LocalBusiness JSON-LD with name, address, telephone, and area served for ${city}.`,
        'Medium',
        'Hours',
        'Rich Results Test parses the entity without errors.'
      )
    );
  }
  if (!onPage.metaDescription?.exists) {
    recommendations.push(
      recommendation(
        'HIGH',
        'OnPage',
        'The meta description is missing.',
        'Write a 140–160 character description with the primary service and city.',
        'Medium',
        'Hours',
        'The crawled meta description length is between 70 and 160 characters.'
      )
    );
  }
  if ((coverage || 0) > 0) {
    recommendations.push(
      recommendation(
        'MEDIUM',
        'Technical',
        `Search Console reports ${coverage} index coverage errors.`,
        'Open the coverage report, fix the listed URLs, and resubmit the sitemap.',
        'High',
        'Days',
        'Index coverage errors fall on the next Search Console refresh.'
      )
    );
  }
  if (position) {
    recommendations.push(
      recommendation(
        'MEDIUM',
        'Content',
        `${keyword} is around position ${position}, short of a top-3 result.`,
        'Expand the landing page with service proof, internal links from related treatments, and a clearer H1.',
        'High',
        'Weeks',
        `Average position for ${keyword} moves inside the top 3.`
      )
    );
  }
  if ((onPage.images?.missingAlt || 0) > 0) {
    recommendations.push(
      recommendation(
        'LOW',
        'OnPage',
        `${onPage.images.missingAlt} images are missing alt text.`,
        'Describe each image in plain language, including the service or clinic name where it is accurate.',
        'Low',
        'Hours',
        'A recrawl reports zero images missing alt text.'
      )
    );
  }
  if (!recommendations.length) {
    recommendations.push(
      recommendation(
        'MEDIUM',
        'Content',
        'The site has a baseline, but local proof is still thin.',
        'Add practitioner credentials, neighbourhood references, and a clear primary call to action.',
        'Medium',
        'Days',
        'The page gains a unique H1, local proof, and a measurable enquiry click.'
      )
    );
  }

  const critical = recommendations.filter((item) => item.priority === 'CRITICAL').map((item) => item.finding).slice(0, 5);
  const important = recommendations.filter((item) => item.priority === 'HIGH' || item.priority === 'MEDIUM').map((item) => item.finding).slice(0, 8);

  const quickWins = [
    !onPage.title?.exists && {
      finding: 'Title tag is absent.',
      fix: `Write a 50–60 character title containing ${keyword}.`,
      effort: 'Hours',
      estimated_hours: 0.5,
      estimated_impact: 'High',
    },
    !onPage.metaDescription?.exists && {
      finding: 'Meta description is absent.',
      fix: 'Add a 140–160 character description with the city and primary service.',
      effort: 'Hours',
      estimated_hours: 0.5,
      estimated_impact: 'Medium',
    },
    !(schema.relevantTypes || []).length && {
      finding: 'Local business schema is not declared.',
      fix: 'Paste a LocalBusiness or Dentist JSON-LD block into the homepage head.',
      effort: 'Hours',
      estimated_hours: 1.5,
      estimated_impact: 'Medium',
    },
    !crawl?.robots?.exists && {
      finding: 'robots.txt is not confirming a sitemap.',
      fix: 'Publish robots.txt with a Sitemap directive.',
      effort: 'Hours',
      estimated_hours: 0.5,
      estimated_impact: 'Medium',
    },
    (onPage.images?.missingAlt || 0) > 0 && {
      finding: 'Images are missing alt text.',
      fix: 'Add short descriptive alt text to each content image.',
      effort: 'Hours',
      estimated_hours: 1,
      estimated_impact: 'Low',
    },
  ].filter(Boolean).slice(0, 5);

  if (!quickWins.length) {
    quickWins.push({
      finding: 'The primary snippet can be tightened.',
      fix: 'Align the title, H1, and opening paragraph around the target keyword.',
      effort: 'Hours',
      estimated_hours: 1,
      estimated_impact: 'Medium',
    });
  }

  const clickSentence = typeof clicks === 'number'
    ? `Search Console still shows ${clicks} recent clicks, so demand exists while the page experience catches up.`
    : 'Search demand should be rechecked once the page is consistently crawlable.';

  const summary = sentences([
    `${business} in ${city} currently scores ${overall}/100 from the combined on-page, technical, and lab signals.`,
    crawl.ok
      ? `Mobile LCP is ${lcp}, which is the clearest drag on the experience score.`
      : `The live crawl did not fully retrieve the page, so on-page scores stay conservative until hosting responds.`,
    clickSentence,
  ]);

  const payload = {
    audit_version: 'v1.0',
    overall_score: overall,
    score_breakdown: breakdown,
    critical_issues: critical.length ? critical : ['No single critical defect dominated, but the score is still being held down by weaker fundamentals.'].slice(0, 5),
    important_issues: important.length ? important : ['Improve the primary landing page so title, headings, and local proof match the target query.'],
    quick_wins: quickWins,
    recommendations: recommendations.slice(0, 12),
    executive_summary: summary,
  };

  const validated = validateAuditResult(payload);
  if (!validated.ok) {
    throw new Error(`Fallback analysis failed validation: ${validated.errors.join('; ')}`);
  }
  return validated.data;
}
