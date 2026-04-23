// POST /api/image/generate — Generate image via Pollinations.ai (100% free, no API key)
// Limit: 1 image per wallet per day
// GET /api/image/generate — Returns service info

export const dynamic = 'force-dynamic';

// In-memory rate limit tracker
const dailyImageGenerations = new Map<string, { date: string; count: number }>();

const MAX_IMAGES_PER_WALLET_PER_DAY = 1;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, style, walletAddress } = body;

    if (!prompt) {
      return Response.json({ error: 'PROMPT required' }, { status: 400 });
    }

    // Rate limit: 1 image per wallet per day
    if (walletAddress) {
      const today = new Date().toISOString().split('T')[0];
      const userGen = dailyImageGenerations.get(walletAddress);

      if (userGen && userGen.date === today && userGen.count >= MAX_IMAGES_PER_WALLET_PER_DAY) {
        return Response.json({
          error: 'DAILY_LIMIT_REACHED',
          message: `You've reached the daily limit of ${MAX_IMAGES_PER_WALLET_PER_DAY} image(s) per wallet.`,
          retryAfter: 'Tomorrow (resets at midnight UTC)',
        }, { status: 429 });
      }

      if (userGen && userGen.date === today) {
        userGen.count += 1;
      } else {
        dailyImageGenerations.set(walletAddress, { date: today, count: 1 });
      }
    }

    // Build prompt with style
    const stylePresets: Record<string, string> = {
      censoredFigure: ', dark dystopian figure with holographic rainbow censor bars, red and orange iridescent interference, floating redacted documents, dark grid background, cinematic lighting, cyberpunk',
      accessDenied: ', red ACCESS DENIED rubber stamp on dark background, glitch effect, VHS distortion, holographic interference, classified documents, cyberpunk dystopian, dramatic lighting',
      floatingDocuments: ', floating redacted documents with black bars and censorship symbols, dark grid background, holographic light, classified papers scattered in void, dark aesthetic, ultra detailed',
      circuitBoard: ', circuit board pattern with redacted elements, glowing red traces, holographic interference, dark background with grid overlay, cyberpunk tech, macro photography',
      classifiedDoc: ', classified document with black redaction bars, TOP SECRET stamp, holographic light effects, dark moody lighting, floating in void, grid background, photorealistic',
      glitchInterference: ', digital glitch interference pattern, holographic rainbow distortion, red and orange tones, VHS tracking error, dark background, classified document fragments, cyberpunk',
    };

    let finalPrompt = prompt;
    if (style && stylePresets[style]) {
      finalPrompt = prompt + stylePresets[style];
    } else {
      finalPrompt = prompt + ', dark grid background, red and orange tones, holographic interference, cyberpunk, redacted protocol aesthetic, cinematic lighting, highly detailed, 8k';
    }

    // Pollinations.ai URL (100% free, no API key)
    const seed = Math.floor(Math.random() * 999999);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=1024&height=1024&seed=${seed}&nologo=true`;

    return Response.json({
      success: true,
      imageUrl,
      prompt: finalPrompt,
      style: style || 'default',
      message: 'Image generated successfully',
      dailyRemaining: walletAddress
        ? MAX_IMAGES_PER_WALLET_PER_DAY - (dailyImageGenerations.get(walletAddress)?.count || 0)
        : 'unlimited',
    });

  } catch (err: any) {
    return Response.json(
      { error: `Image generation failed: ${err.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({
    service: 'Pollinations.ai Image Generation',
    free: true,
    noApiKey: true,
    dailyLimitPerWallet: MAX_IMAGES_PER_WALLET_PER_DAY,
    activeGenerationsToday: dailyImageGenerations.size,
  });
}
