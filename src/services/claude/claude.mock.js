import { validateAuditResult } from '../../validations/ai-result';

function recommendation(priority, category, finding, fix, impact, effort, check) {
  return {
    priority,
    category,
    finding,
    fix,
    estimated_impact: impact,
    effort,
    falsifiability_check: check,
  };
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'the submitted website';
  }
}

export function buildMockClaudeBrief(input = {}) {
  const business = input.businessType || 'Public website';
  const city = input.city || 'Online';
  const keyword = input.keyword || 'the primary topic';
  const url = input.url || '';
  const host = hostOf(url);
  const encyclopedia = host === 'wikipedia.org' || host.endsWith('.wikipedia.org');

  if (encyclopedia) {
    return {
      overallScore: 82,
      summary: `This public encyclopedia is audited for article performance, metadata, crawl paths, and structured data. The simulated lab sample puts mobile Largest Contentful Paint just under three seconds, which is usable but still slower than the two-and-a-half-second target. Topic queries around ${keyword} are simulated samples only, because this project does not have Search Console authorization for the site.`,
      technicalIssues: [
        `Simulated mobile Largest Contentful Paint for ${host} is slower than the two-and-a-half-second target.`,
        `Article pages on ${host} ship render-blocking CSS in the document head.`,
      ],
      contentIssues: [
        `Some article titles on ${host} are accurate but longer than the 50 to 60 characters that search snippets usually show.`,
        `Lead sections do not always repeat the article's main topic in the first sentence.`,
      ],
      keywordInsights: [
        `${keyword} is a navigational topic for ${host}. The simulated ranking sample places the submitted host first for that query.`,
        'Related public references, not private analytics, are the right comparison set for this kind of site.',
      ],
      recommendations: [
        recommendation(
          'HIGH',
          'CWV',
          `Simulated lab data puts mobile Largest Contentful Paint for ${host} above the two-and-a-half-second target.`,
          'Defer non-critical article scripts and preload the first content image on the submitted URL.',
          'High',
          'Days',
          'A fresh simulated or live lab run records mobile LCP below 2.5 seconds for the same URL.'
        ),
        recommendation(
          'MEDIUM',
          'Schema',
          `Article pages on ${host} should expose Article or WebPage structured data that matches the visible title.`,
          'Confirm JSON-LD on the submitted URL includes headline, dateModified, and the canonical URL.',
          'Medium',
          'Hours',
          'The next crawl of the submitted URL lists an Article or WebPage type without parse errors.'
        ),
        recommendation(
          'MEDIUM',
          'Technical',
          `Crawl paths for ${host} depend on a reachable robots.txt and sitemap.`,
          'Keep the sitemap linked from robots.txt and make sure the submitted URL is allowed for the crawler.',
          'Medium',
          'Hours',
          'The next crawl records a robots.txt response and at least one sitemap URL.'
        ),
      ],
      priorityActions: [
        `Check the title length on ${url || host} and keep the article topic in the first 60 characters.`,
        'Confirm the canonical tag on the submitted URL points at the same article.',
      ],
    };
  }

  return {
    overallScore: 82,
    summary: `${business} in ${city} scores 82 because the topic is identifiable and the remaining gaps are measurable. The title and meta description should carry ${keyword}. Lab and ranking rows are labeled simulated when mock mode is on, and they are not a private Search Console export.`,
    technicalIssues: [
      `Simulated mobile Largest Contentful Paint for ${host} is above the 2.5 second target.`,
      `The submitted URL ${url || host} should publish one canonical hostname.`,
    ],
    contentIssues: [
      `The title tag should include ${keyword}.`,
      'The meta description should name the service and the location.',
    ],
    keywordInsights: [
      `${keyword} is the submitted target query for ${host}.`,
      'Ranking rows in this audit are a simulated sample tied to that query, not a live provider export.',
    ],
    recommendations: [
      recommendation(
        'HIGH',
        'CWV',
        `Simulated lab data shows slow mobile LCP on ${host}.`,
        'Compress the hero image and remove render-blocking files from the first view of the submitted URL.',
        'High',
        'Days',
        'The next lab run for the same URL shows mobile LCP below 2.5 seconds.'
      ),
      recommendation(
        'HIGH',
        'OnPage',
        `The title on ${host} should include ${keyword}.`,
        'Write one unique title of 50 to 60 characters that includes the primary topic.',
        'High',
        'Hours',
        'The next crawl of the submitted URL records a title between 50 and 60 characters.'
      ),
      recommendation(
        'MEDIUM',
        'Content',
        'The meta description should explain the offer in plain language.',
        'Add a 140 to 160 character description that names the topic and the location.',
        'Medium',
        'Hours',
        'The crawled meta description for the submitted URL is between 70 and 160 characters.'
      ),
    ],
    priorityActions: [
      `Add a 50 to 60 character title containing ${keyword}.`,
      'Write a 140 to 160 character meta description for the submitted URL.',
    ],
  };
}

export function mockClaudeAnalysis(input = {}) {
  const brief = buildMockClaudeBrief(input);
  const validated = validateAuditResult({
    audit_version: 'v1.0',
    overall_score: brief.overallScore,
    score_breakdown: {
      technical: 78,
      on_page: 86,
      content: 80,
      core_web_vitals: 74,
      schema: 90,
    },
    critical_issues: brief.technicalIssues,
    important_issues: [...brief.contentIssues, ...brief.keywordInsights],
    quick_wins: [
      {
        finding: brief.priorityActions[0],
        fix: 'Set one title on the submitted URL and keep the main topic inside the first 60 characters.',
        effort: 'Hours',
        estimated_hours: 0.5,
        estimated_impact: 'High',
      },
      {
        finding: brief.priorityActions[1],
        fix: 'Add one meta description on the submitted URL that states what the page is about.',
        effort: 'Hours',
        estimated_hours: 1,
        estimated_impact: 'Medium',
      },
    ],
    recommendations: brief.recommendations,
    executive_summary: brief.summary,
  });
  if (!validated.ok) {
    throw new Error(`Mock Claude analysis is invalid: ${validated.errors.join('; ')}`);
  }
  return {
    data: validated.data,
    source: 'mock',
    reason: null,
    model: null,
    brief,
  };
}
