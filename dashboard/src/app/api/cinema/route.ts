// POST /api/cinema — Generate cinematic shot via Muapi.ai
// GET /api/cinema — Returns cinema studio config info

export const dynamic = 'force-dynamic';

const MUAPI_API_KEY = process.env.MUAPI_API_KEY;

// Cinema camera options
const CAMERAS = [
  { id: 'modular_8k', name: 'Modular 8K Digital', desc: 'modular 8K digital cinema camera' },
  { id: 'full_frame', name: 'Full-Frame Cine Digital', desc: 'full-frame digital cinema camera' },
  { id: 'grand_70mm', name: 'Grand Format 70mm Film', desc: 'grand format 70mm film camera' },
  { id: 's35', name: 'Studio Digital S35', desc: 'Super 35 studio digital camera' },
  { id: 'classic_16mm', name: 'Classic 16mm Film', desc: 'classic 16mm film camera' },
  { id: 'large_format', name: 'Premium Large Format Digital', desc: 'premium large-format digital cinema camera' },
];

const LENSES = [
  { id: 'creative_tilt', name: 'Creative Tilt', desc: 'creative tilt lens effect' },
  { id: 'compact_anamorphic', name: 'Compact Anamorphic', desc: 'compact anamorphic lens' },
  { id: 'extreme_macro', name: 'Extreme Macro', desc: 'extreme macro lens' },
  { id: '70s_prime', name: "70s Cinema Prime", desc: '1970s cinema prime lens' },
  { id: 'classic_anamorphic', name: 'Classic Anamorphic', desc: 'classic anamorphic lens' },
  { id: 'modern_prime', name: 'Premium Modern Prime', desc: 'premium modern prime lens' },
  { id: 'warm_prime', name: 'Warm Cinema Prime', desc: 'warm-toned cinema prime lens' },
  { id: 'swirl_bokeh', name: 'Swirl Bokeh Portrait', desc: 'swirl bokeh portrait lens' },
  { id: 'vintage', name: 'Vintage Prime', desc: 'vintage prime lens' },
  { id: 'halation', name: 'Halation Diffusion', desc: 'halation diffusion filter' },
  { id: 'clinical', name: 'Clinical Sharp', desc: 'ultra-sharp clinical prime lens' },
];

const FOCAL_LENGTHS = [
  { value: 8, label: '8mm', perspective: 'ultra-wide perspective' },
  { value: 14, label: '14mm', perspective: 'wide-angle perspective' },
  { value: 24, label: '24mm', perspective: 'wide-angle dynamic' },
  { value: 35, label: '35mm', perspective: 'natural cinematic' },
  { value: 50, label: '50mm', perspective: 'standard portrait' },
  { value: 85, label: '85mm', perspective: 'classic portrait' },
];

const APERTURES = [
  { value: 'f/1.4', label: 'f/1.4', effect: 'shallow depth of field, creamy bokeh' },
  { value: 'f/4', label: 'f/4', effect: 'balanced depth of field' },
  { value: 'f/11', label: 'f/11', effect: 'deep focus clarity' },
];

const ASPECT_RATIOS = ['16:9', '21:9', '9:16', '1:1', '4:5'];
const RESOLUTIONS = ['1K', '2K', '4K'];

// Redacted Protocol cinema presets
const CINEMA_PRESETS: Record<string, string> = {
  classified_brief: 'a classified intelligence brief in a dimly lit underground facility, folders stamped TOP SECRET scattered on a metal desk, harsh fluorescent lighting, moody atmosphere',
  surveillance: 'covert surveillance footage aesthetic, dark control room with multiple monitors showing grainy footage, red classified stamps, mysterious government facility',
  declassified: 'a declassified document emerging from shadows, holographic light revealing redacted text, floating papers in a void, dramatic cinematic lighting',
  access_denied: 'ACCESS DENIED terminal screen with glitch effects, dark server room, red emergency lighting, classified data corruption, cyberpunk aesthetic',
  black_ops: 'a black operations briefing room, shadowy figures around a holographic table, classified maps and satellite imagery, dramatic rim lighting, cinematic composition',
  whistleblower: 'a lone figure holding leaked documents in a dark alley, rain reflections, neon signs in background, noir thriller aesthetic, volumetric fog',
  deep_state: 'conspiracy board with red string connecting photos, classified documents pinned to corkboard, dim interrogation room lighting, mysterious shadows',
  signal_intercept: 'signal intelligence interception, radio equipment in abandoned bunker, waveform displays, green phosphor monitors, cold war aesthetic reimagined',
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      prompt,
      preset,
      camera = 'modular_8k',
      lens = 'classic_anamorphic',
      focalLength = 35,
      aperture = 'f/4',
      aspectRatio = '16:9',
      resolution = '4K',
    } = body;

    if (!MUAPI_API_KEY) {
      return Response.json({ error: 'MUAPI_API_KEY not configured' }, { status: 503 });
    }

    // Use preset if no custom prompt
    const basePrompt = preset && CINEMA_PRESETS[preset]
      ? CINEMA_PRESETS[preset]
      : prompt;

    if (!basePrompt) {
      return Response.json({ error: 'PROMPT or PRESET required' }, { status: 400 });
    }

    // Find camera/lens descriptions
    const cameraInfo = CAMERAS.find(c => c.id === camera) || CAMERAS[0];
    const lensInfo = LENSES.find(l => l.id === lens) || LENSES[0];
    const focalInfo = FOCAL_LENGTHS.find(f => f.value === focalLength) || FOCAL_LENGTHS[3];
    const apertureInfo = APERTURES.find(a => a.value === aperture) || APERTURES[1];

    // Build cinema prompt
    const cinemaPrompt = `${basePrompt}, shot on a ${cameraInfo.desc}, using a ${lensInfo.desc} at ${focalInfo.value}mm (${focalInfo.perspective}), aperture ${apertureInfo.value}, ${apertureInfo.effect}, cinematic lighting, natural color science, high dynamic range, professional photography, ultra-detailed, ${resolution} resolution`;

    // Submit to Muapi
    const submitUrl = 'https://api.muapi.ai/api/v1/nano-banana-2';
    const submitResp = await fetch(submitUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': MUAPI_API_KEY,
      },
      body: JSON.stringify({
        prompt: cinemaPrompt,
        aspect_ratio: aspectRatio,
        resolution,
      }),
    });

    if (!submitResp.ok) {
      const errText = await submitResp.text();
      return Response.json({ error: `Muapi submit failed: ${submitResp.status} ${errText.slice(0, 200)}` }, { status: 502 });
    }

    const submitData = await submitResp.json();
    const requestId = submitData.request_id || submitData.id;

    if (!requestId) {
      return Response.json({ error: 'No request_id from Muapi' }, { status: 502 });
    }

    // Poll for result
    let result = null;
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 2000));

      const pollResp = await fetch(`https://api.muapi.ai/api/v1/predictions/${requestId}/result`, {
        headers: { 'x-api-key': MUAPI_API_KEY },
      });

      if (!pollResp.ok && pollResp.status >= 500) continue;

      const pollData = await pollResp.json();
      const status = pollData.status?.toLowerCase();

      if (status === 'completed' || status === 'succeeded' || status === 'success') {
        result = pollData;
        break;
      }
      if (status === 'failed' || status === 'error') {
        return Response.json({ error: `Generation failed: ${pollData.error || 'Unknown'}` }, { status: 502 });
      }
    }

    if (!result) {
      return Response.json({ error: 'Generation timed out' }, { status: 504 });
    }

    const imageUrl = result.outputs?.[0] || result.url || result.output?.url;
    if (!imageUrl) {
      return Response.json({ error: 'No image URL in result' }, { status: 502 });
    }

    return Response.json({
      success: true,
      imageUrl,
      prompt: cinemaPrompt,
      model: 'nano-banana-2',
      camera: cameraInfo.name,
      lens: lensInfo.name,
      focalLength: `${focalInfo.value}mm`,
      aperture: apertureInfo.value,
      aspectRatio,
      resolution,
    });

  } catch (err: any) {
    return Response.json(
      { error: `Cinema generation failed: ${err.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({
    service: 'Muapi.ai Cinema Studio',
    cameras: CAMERAS,
    lenses: LENSES,
    focalLengths: FOCAL_LENGTHS,
    apertures: APERTURES,
    aspectRatios: ASPECT_RATIOS,
    resolutions: RESOLUTIONS,
    presets: Object.keys(CINEMA_PRESETS),
  });
}
