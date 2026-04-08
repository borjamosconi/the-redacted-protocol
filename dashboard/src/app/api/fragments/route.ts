// GET /api/fragments — List declassified fragments
// POST /api/fragments — Submit a new fragment

export const dynamic = 'force-dynamic';

interface Fragment {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'DECLASSIFIED' | 'VERIFIED' | 'ANCHORED';
  confidence: number;
  preview: string;
  reconstructed?: string;
  sourceHash: string;
  topicTags: string[];
  createdAt: string;
  arweaveTx?: string;
  onChainTx?: string;
}

// Sample fragments (in production, load from database)
const SAMPLE_FRAGMENTS: Fragment[] = [
  {
    id: '#0047',
    status: 'DECLASSIFIED',
    confidence: 94.7,
    preview: 'The ████ was moved to ███████ on ██/██/2024',
    reconstructed: 'The [REDACTED] was moved to [LOCATION] on [DATE]',
    sourceHash: 'a3f7b2c8...',
    topicTags: ['transport', 'covert-ops'],
    createdAt: '2026-03-15T12:00:00Z',
    arweaveTx: 'Kx7Fm9...',
  },
  {
    id: '#0048',
    status: 'VERIFIED',
    confidence: 98.2,
    preview: 'Operation ███ ECLIPSE involved at least ██ entities',
    reconstructed: 'Operation [NAME] ECLIPSE involved at least [N] entities',
    sourceHash: 'd1e5f9a2...',
    topicTags: ['operation', 'multi-entity'],
    createdAt: '2026-03-18T08:30:00Z',
    arweaveTx: 'Bz3Qn2...',
    onChainTx: '5JkP8m...',
  },
  {
    id: '#0049',
    status: 'PROCESSING',
    confidence: 67.3,
    preview: 'All ██████ are to be sealed via █████ route',
    sourceHash: 'f8c3d1e7...',
    topicTags: ['logistics', 'sealed-transport'],
    createdAt: '2026-03-20T14:15:00Z',
  },
  {
    id: '#0050',
    status: 'DECLASSIFIED',
    confidence: 91.5,
    preview: 'The subject was transferred to ██████████ facility',
    reconstructed: 'The subject was transferred to [REDACTED] facility',
    sourceHash: 'e2b4a7c9...',
    topicTags: ['transfer', 'facility'],
    createdAt: '2026-03-22T19:45:00Z',
    arweaveTx: 'Hy6Wp1...',
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const status = searchParams.get('status');
  const tag = searchParams.get('tag');

  let fragments = [...SAMPLE_FRAGMENTS];

  // Filter by status
  if (status) {
    fragments = fragments.filter(f => f.status === status.toUpperCase());
  }

  // Filter by tag
  if (tag) {
    fragments = fragments.filter(f => f.topicTags.includes(tag));
  }

  // Get specific fragment
  if (id) {
    const fragment = fragments.find(f => f.id === id);
    if (!fragment) {
      return Response.json({ error: 'Fragment not found' }, { status: 404 });
    }
    return Response.json(fragment);
  }

  return Response.json({
    fragments,
    total: fragments.length,
    stats: {
      declassified: SAMPLE_FRAGMENTS.filter(f => f.status === 'DECLASSIFIED').length,
      verified: SAMPLE_FRAGMENTS.filter(f => f.status === 'VERIFIED').length,
      processing: SAMPLE_FRAGMENTS.filter(f => f.status === 'PROCESSING').length,
      pending: SAMPLE_FRAGMENTS.filter(f => f.status === 'PENDING').length,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, sourceUrl, topicTags } = body;

    if (!content) {
      return Response.json({ error: 'Content required' }, { status: 400 });
    }

    // Generate fragment ID
    const id = `#${String(SAMPLE_FRAGMENTS.length + 1).padStart(4, '0')}`;

    // Create new fragment
    const fragment: Fragment = {
      id,
      status: 'PENDING',
      confidence: 0,
      preview: content.slice(0, 60) + (content.length > 60 ? '...' : ''),
      sourceHash: generateHash(content),
      topicTags: topicTags || [],
      createdAt: new Date().toISOString(),
    };

    return Response.json({
      status: 'submitted',
      fragment,
      message: 'Fragment submitted for analysis',
      reward: '100 RDX (upon processing)',
    }, { status: 201 });
  } catch (err: any) {
    return Response.json(
      { error: `Submission failed: ${err.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

function generateHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
