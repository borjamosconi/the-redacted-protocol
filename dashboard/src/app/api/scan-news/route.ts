// POST /api/scan-news?url=<url>
// Scans a news article for conspiracy/censorship indicators

export const dynamic = 'force-dynamic';

interface NewsFlag {
  flag_type: string;
  description: string;
  confidence: number;
  context: string;
}

interface ScanResult {
  url: string;
  title: string;
  threat_level: 'Safe' | 'Suspicious' | 'Flagged' | 'Critical';
  flags: NewsFlag[];
  analyzed_at: string;
  content_length: number;
}

// Keyword databases
const KEYWORDS = [
  'deep state', 'false flag', 'black budget', 'covert operation',
  'plausible deniability', 'need to know', 'eyes only',
  'compartmentalized', 'TS/SCI', 'NOFORN',
  'special access', 'black project', 'undisclosed location',
  'mass surveillance', 'backdoor', 'psyop',
  'controlled opposition', 'limited hangout', 'managed democracy',
  'astroturf', 'predictive programming', 'crisis exploitation',
  'manufactured consent', 'shadow government', 'disinformation',
  'information warfare', 'cognitive warfare', 'influence operation',
];

const COVERUP_PHRASES = [
  'declined to comment', 'no comment', 'sources close to',
  'unnamed sources', 'refused to confirm or deny',
  'neither confirmed nor denied', 'on condition of anonymity',
  'sources familiar with', 'people with knowledge of',
  'allegedly', 'reportedly', 'purportedly',
  'leaked documents', 'sources say', 'insiders claim',
];

const CLASSIFIED_TERMS = [
  'classified', 'secret', 'top secret', 'confidential',
  'restricted', 'sensitive', 'privileged',
  'for official use only', 'FOUO', 'NOFORN', 'ORCON',
];

const REDACTION_PATTERNS = [
  /█+/,
  /\[REDACTED\]/,
  /\[CLASSIFIED\]/,
  /\[CENSORED\]/,
  /black(?:ed)? out/,
  /redacted|expunged|sealed|classified/i,
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return Response.json({ error: 'URL parameter required' }, { status: 400 });
  }

  try {
    // Fetch the article
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RedactedProtocol/1.0 (+https://redacted-protocol.vercel.app)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return Response.json({
        error: `Failed to fetch article: ${response.status} ${response.statusText}`,
      }, { status: 400 });
    }

    const html = await response.text();

    // Extract title and content
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Unknown';

    // Extract text content from article/main/body
    const bodyMatch = html.match(/<(?:article|main|body)[^>]*>([\s\S]*?)<\/(?:article|main|body)>/i);
    const bodyContent = bodyMatch ? bodyMatch[1] : html;
    const textContent = bodyContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    // Analyze
    const flags = analyzeContent(title, textContent);
    const threatLevel = calculateThreat(flags);

    const result: ScanResult = {
      url,
      title,
      threat_level: threatLevel,
      flags,
      analyzed_at: new Date().toISOString(),
      content_length: textContent.length,
    };

    return Response.json(result);
  } catch (err: any) {
    return Response.json({
      error: `Scan failed: ${err.message || 'Unknown error'}`,
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const url = body.url;

  if (!url) {
    return Response.json({ error: 'URL required in request body' }, { status: 400 });
  }

  // Redirect to GET handler
  return GET(new Request(`${request.url.split('?')[0]}?url=${encodeURIComponent(url)}`));
}

function analyzeContent(title: string, content: string): NewsFlag[] {
  const flags: NewsFlag[] = [];
  const fullText = `${title} ${content}`.toLowerCase();

  // Check redaction patterns
  for (const pattern of REDACTION_PATTERNS) {
    const match = fullText.match(pattern);
    if (match) {
      flags.push({
        flag_type: 'RedactionMarker',
        description: 'Redaction/censorship markers detected',
        confidence: 0.95,
        context: fullText.substring(match.index || 0, (match.index || 0) + 50),
      });
    }
  }

  // Check classified terms
  for (const term of CLASSIFIED_TERMS) {
    if (fullText.includes(term.toLowerCase())) {
      flags.push({
        flag_type: 'ClassifiedLanguage',
        description: `Classified terminology: '${term}'`,
        confidence: 0.7,
        context: term,
      });
    }
  }

  // Check cover-up phrases
  for (const phrase of COVERUP_PHRASES) {
    if (fullText.includes(phrase.toLowerCase())) {
      flags.push({
        flag_type: 'CoverUpPattern',
        description: `Cover-up language: '${phrase}'`,
        confidence: 0.65,
        context: phrase,
      });
    }
  }

  // Check keywords
  for (const keyword of KEYWORDS) {
    if (fullText.includes(keyword.toLowerCase())) {
      flags.push({
        flag_type: 'PatternMatch',
        description: `Conspiracy keyword match: '${keyword}'`,
        confidence: 0.6,
        context: keyword,
      });
    }
  }

  // Passive voice analysis
  const passiveIndicators = ['was', 'were', 'been', 'has been', 'had been'];
  const passiveCount = passiveIndicators.filter(w => fullText.includes(w)).length;
  if (passiveCount >= 5) {
    flags.push({
      flag_type: 'UnusualFraming',
      description: 'Heavy passive voice — may indicate evasion',
      confidence: 0.4,
      context: `${passiveCount} passive constructions`,
    });
  }

  // Deduplicate: keep highest confidence per type
  const deduped = new Map<string, NewsFlag>();
  flags.sort((a, b) => b.confidence - a.confidence);
  for (const flag of flags) {
    if (!deduped.has(flag.flag_type)) {
      deduped.set(flag.flag_type, flag);
    }
  }

  return Array.from(deduped.values());
}

function calculateThreat(flags: NewsFlag[]): ScanResult['threat_level'] {
  if (flags.length === 0) return 'Safe';

  const maxConfidence = Math.max(...flags.map(f => f.confidence));
  const flagCount = flags.length;
  const hasCritical = flags.some(f => f.confidence >= 0.9);

  if (hasCritical && flagCount >= 3) return 'Critical';
  if (maxConfidence >= 0.7 && flagCount >= 2) return 'Flagged';
  if (flagCount > 0) return 'Suspicious';
  return 'Safe';
}
