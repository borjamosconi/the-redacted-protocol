// POST /api/cinema — Generate cinematic shot via Muapi.ai (7-key rotation)
// GET  /api/cinema — Returns cinema studio config

export const dynamic = 'force-dynamic'

// ── 7 API keys — rotates automatically when one is rate-limited / exhausted ──
const MUAPI_KEYS = [
  '5d29bb6fb6c78907d6d64b5f90c787ec10b3dc84e4f7e3b504ea5d2b14b7d502',
  '5a4014bf8a611ca7ddcc45c5e79f22c17e914d699d1a89c14bb971e9bce9fc28',
  'de401a7142dc46118018cd7114585c2c3f0c85cd81e4aac8aff7111828ad71a8',
  'f4889ad89f4560c40792bc3ea7e1146ad4bda634b2cd4f45323f39d101cfff4a',
  'a8a52194f46440d80e82e750a48eaf7bd755696715c0d9c4522e7eee06448b41',
  'a06abbddb625699f004a359c354584a76cce49e1fbfe9e16c5dd7d4aedd7ae01',
  'ebe67d1177b85997c7c0ec37282529180ced4eba6b4359161f96db5bfb6e7603',
]

// Round-robin index persists across requests within the same serverless instance
let _keyIndex = 0

/** Try a fetch with each key in sequence. Moves to next key on 401/402/403/429. */
async function fetchWithRotation(
  url: string,
  init: Omit<RequestInit, 'headers'> & { extraHeaders?: Record<string, string> }
): Promise<{ response: Response; key: string; keyIndex: number }> {
  const { extraHeaders = {}, ...rest } = init
  const startIndex = _keyIndex

  for (let attempt = 0; attempt < MUAPI_KEYS.length; attempt++) {
    const idx = (startIndex + attempt) % MUAPI_KEYS.length
    const key = MUAPI_KEYS[idx]
    const response = await fetch(url, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        ...extraHeaders,
      },
    })

    // Advance pointer on quota/auth errors so next call starts on a fresh key
    if (response.status === 429 || response.status === 402 || response.status === 403 || response.status === 401) {
      _keyIndex = (idx + 1) % MUAPI_KEYS.length
      continue
    }

    _keyIndex = idx // keep this key for the next call (don't waste quota)
    return { response, key, keyIndex: idx }
  }

  throw new Error('All 7 Muapi API keys are exhausted or rate-limited. Try again later.')
}

// ── Camera / lens / preset config ─────────────────────────────────────────────

const CAMERAS = [
  { id: 'modular_8k',   name: 'Modular 8K Digital',         desc: 'modular 8K digital cinema camera' },
  { id: 'full_frame',   name: 'Full-Frame Cine Digital',     desc: 'full-frame digital cinema camera' },
  { id: 'grand_70mm',   name: 'Grand Format 70mm Film',      desc: 'grand format 70mm film camera' },
  { id: 's35',          name: 'Studio Digital S35',          desc: 'Super 35 studio digital camera' },
  { id: 'classic_16mm', name: 'Classic 16mm Film',           desc: 'classic 16mm film camera' },
  { id: 'large_format', name: 'Premium Large Format Digital', desc: 'premium large-format digital cinema camera' },
]

const LENSES = [
  { id: 'creative_tilt',      name: 'Creative Tilt',          desc: 'creative tilt lens effect' },
  { id: 'compact_anamorphic', name: 'Compact Anamorphic',     desc: 'compact anamorphic lens' },
  { id: 'extreme_macro',      name: 'Extreme Macro',          desc: 'extreme macro lens' },
  { id: '70s_prime',          name: '70s Cinema Prime',       desc: '1970s cinema prime lens' },
  { id: 'classic_anamorphic', name: 'Classic Anamorphic',     desc: 'classic anamorphic lens' },
  { id: 'modern_prime',       name: 'Premium Modern Prime',   desc: 'premium modern prime lens' },
  { id: 'warm_prime',         name: 'Warm Cinema Prime',      desc: 'warm-toned cinema prime lens' },
  { id: 'swirl_bokeh',        name: 'Swirl Bokeh Portrait',   desc: 'swirl bokeh portrait lens' },
  { id: 'vintage',            name: 'Vintage Prime',          desc: 'vintage prime lens' },
  { id: 'halation',           name: 'Halation Diffusion',     desc: 'halation diffusion filter' },
  { id: 'clinical',           name: 'Clinical Sharp',         desc: 'ultra-sharp clinical prime lens' },
]

const FOCAL_LENGTHS = [
  { value: 8,  label: '8mm',  perspective: 'ultra-wide perspective' },
  { value: 14, label: '14mm', perspective: 'wide-angle perspective' },
  { value: 24, label: '24mm', perspective: 'wide-angle dynamic' },
  { value: 35, label: '35mm', perspective: 'natural cinematic' },
  { value: 50, label: '50mm', perspective: 'standard portrait' },
  { value: 85, label: '85mm', perspective: 'classic portrait' },
]

const APERTURES = [
  { value: 'f/1.4', label: 'f/1.4', effect: 'shallow depth of field, creamy bokeh' },
  { value: 'f/4',   label: 'f/4',   effect: 'balanced depth of field' },
  { value: 'f/11',  label: 'f/11',  effect: 'deep focus clarity' },
]

const ASPECT_RATIOS = ['16:9', '21:9', '9:16', '1:1', '4:5']
const RESOLUTIONS   = ['1K', '2K', '4K']

// Available generation models
const MODELS = [
  { id: 'nano-banana-2', name: 'Nano Banana 2', type: 'image', desc: 'Cinematic AI image generation' },
  { id: 'wan-2.1',       name: 'Wan 2.1',       type: 'video', desc: 'AI video generation (text-to-video)' },
  { id: 'wan-2.1-i2v',   name: 'Wan 2.1 I2V',   type: 'video', desc: 'Image-to-video (animated)' },
]

// Redacted Protocol cinema presets
const CINEMA_PRESETS: Record<string, string> = {
  classified_brief:  'a classified intelligence brief in a dimly lit underground facility, folders stamped TOP SECRET scattered on a metal desk, harsh fluorescent lighting, moody atmosphere',
  surveillance:      'covert surveillance footage aesthetic, dark control room with multiple monitors showing grainy footage, red classified stamps, mysterious government facility',
  declassified:      'a declassified document emerging from shadows, holographic light revealing redacted text, floating papers in a void, dramatic cinematic lighting',
  access_denied:     'ACCESS DENIED terminal screen with glitch effects, dark server room, red emergency lighting, classified data corruption, cyberpunk aesthetic',
  black_ops:         'a black operations briefing room, shadowy figures around a holographic table, classified maps and satellite imagery, dramatic rim lighting, cinematic composition',
  whistleblower:     'a lone figure holding leaked documents in a dark alley, rain reflections, neon signs in background, noir thriller aesthetic, volumetric fog',
  deep_state:        'conspiracy board with red string connecting photos, classified documents pinned to corkboard, dim interrogation room lighting, mysterious shadows',
  signal_intercept:  'signal intelligence interception, radio equipment in abandoned bunker, waveform displays, green phosphor monitors, cold war aesthetic reimagined',
  rdx_launch:        'futuristic crypto protocol launch event, holographic RDX token logo floating in dark space, red energy particles, cinematic reveal, 8K quality',
  blockchain_node:   'Solana blockchain node visualization, glowing red data streams, distributed network grid, dark cyberpunk aesthetic, cinematic wide shot',
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      prompt,
      preset,
      model       = 'nano-banana-2',
      camera      = 'modular_8k',
      lens        = 'classic_anamorphic',
      focalLength = 35,
      aperture    = 'f/4',
      aspectRatio = '16:9',
      resolution  = '4K',
      duration    = 5,   // seconds (for video)
    } = body

    // Use preset if no custom prompt
    const basePrompt = preset && CINEMA_PRESETS[preset] ? CINEMA_PRESETS[preset] : prompt
    if (!basePrompt) {
      return Response.json({ error: 'prompt or preset required' }, { status: 400 })
    }

    const cameraInfo   = CAMERAS.find(c => c.id === camera)      || CAMERAS[0]
    const lensInfo     = LENSES.find(l => l.id === lens)          || LENSES[4]
    const focalInfo    = FOCAL_LENGTHS.find(f => f.value === focalLength) || FOCAL_LENGTHS[3]
    const apertureInfo = APERTURES.find(a => a.value === aperture) || APERTURES[1]
    const modelInfo    = MODELS.find(m => m.id === model)          || MODELS[0]

    // Build enriched prompt
    const cinemaPrompt = modelInfo.type === 'video'
      ? `${basePrompt}, cinematic motion, professional videography, high dynamic range, ${resolution} resolution`
      : `${basePrompt}, shot on a ${cameraInfo.desc}, using a ${lensInfo.desc} at ${focalInfo.value}mm (${focalInfo.perspective}), aperture ${apertureInfo.value}, ${apertureInfo.effect}, cinematic lighting, natural color science, ultra-detailed, ${resolution} resolution`

    // ── Submit job ──────────────────────────────────────────────────────────
    const submitBody: Record<string, any> = {
      prompt: cinemaPrompt,
      aspect_ratio: aspectRatio,
      resolution,
    }
    if (modelInfo.type === 'video') submitBody.duration = duration

    const { response: submitResp, keyIndex } = await fetchWithRotation(
      `https://api.muapi.ai/api/v1/${model}`,
      { method: 'POST', body: JSON.stringify(submitBody) }
    )

    if (!submitResp.ok) {
      const errText = await submitResp.text()
      return Response.json({ error: `Muapi submit failed (${submitResp.status}): ${errText.slice(0, 300)}` }, { status: 502 })
    }

    const submitData = await submitResp.json()
    const requestId  = submitData.request_id || submitData.id

    if (!requestId) {
      return Response.json({ error: 'No request_id from Muapi', raw: submitData }, { status: 502 })
    }

    // ── Poll for result (max 120 s) ─────────────────────────────────────────
    const pollKey   = MUAPI_KEYS[keyIndex]
    const maxPolls  = 60
    let result: any = null

    for (let i = 0; i < maxPolls; i++) {
      await new Promise(r => setTimeout(r, 2000))

      const pollResp = await fetch(
        `https://api.muapi.ai/api/v1/predictions/${requestId}/result`,
        { headers: { 'x-api-key': pollKey } }
      )

      if (!pollResp.ok && pollResp.status >= 500) continue

      const pollData = await pollResp.json()
      const status   = (pollData.status ?? '').toLowerCase()

      if (['completed', 'succeeded', 'success', 'done'].includes(status)) {
        result = pollData
        break
      }
      if (['failed', 'error', 'cancelled'].includes(status)) {
        return Response.json({ error: `Generation failed: ${pollData.error || 'unknown'}` }, { status: 502 })
      }
    }

    if (!result) {
      return Response.json({ error: 'Generation timed out (120s)' }, { status: 504 })
    }

    // ── Extract output URL ──────────────────────────────────────────────────
    const outputUrl =
      result.outputs?.[0]     ||
      result.video_url         ||
      result.url               ||
      result.output?.url       ||
      result.output?.[0]       ||
      result.image_url         ||
      null

    if (!outputUrl) {
      return Response.json({ error: 'No output URL in result', raw: result }, { status: 502 })
    }

    const isVideo = modelInfo.type === 'video' || /\.(mp4|webm|mov)/.test(outputUrl)

    return Response.json({
      success:     true,
      outputUrl,
      isVideo,
      type:        modelInfo.type,
      model:       modelInfo.name,
      prompt:      cinemaPrompt,
      keyUsed:     keyIndex + 1,  // 1-indexed for display (never expose raw key)
      camera:      cameraInfo.name,
      lens:        lensInfo.name,
      focalLength: `${focalInfo.value}mm`,
      aperture:    apertureInfo.value,
      aspectRatio,
      resolution,
    })

  } catch (err: any) {
    return Response.json(
      { error: err.message || 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return Response.json({
    service:      'Muapi.ai Cinema Studio',
    keys:         MUAPI_KEYS.length,
    currentKey:   _keyIndex + 1,
    models:       MODELS,
    cameras:      CAMERAS,
    lenses:       LENSES,
    focalLengths: FOCAL_LENGTHS,
    apertures:    APERTURES,
    aspectRatios: ASPECT_RATIOS,
    resolutions:  RESOLUTIONS,
    presets:      Object.keys(CINEMA_PRESETS),
  })
}
