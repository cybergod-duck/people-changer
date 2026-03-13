function sanitizePrompt(text) {
  let out = (text || '').toString();
  // nuke/soften age-ish terms to avoid bans
  out = out.replace(/\bchild[- ]?bearing\b/gi, 'curvy');
  out = out.replace(/\bteen(ager|age)?\b/gi, 'adult');
  out = out.replace(/\byoung girl\b/gi, 'woman');
  out = out.replace(/\b(little|young|small) (girl|boy|child)\b/gi, 'woman');
  return out;
}

function clampSliders(input) {
  return {
    age_slider: Math.max(18, parseFloat(input.age_slider ?? 18)),
    weight_slider: Math.max(-1, Math.min(1, parseFloat(input.weight_slider ?? 0))),
    breast_slider: Math.max(-1, Math.min(1, parseFloat(input.breast_slider ?? 0))),
    ass_slider: Math.max(-1, Math.min(1, parseFloat(input.ass_slider ?? 0))),
  };
}

function toPromptchanPayload(input) {
  // Map to exact field names per debug advice (no underscores where suggested)
  return {
    style: input.style,
    poses: typeof input.poses === 'string' ? input.poses : "Default",
    filter: input.filter,
    emotion: input.emotion,
    detail: parseFloat(input.detail ?? 0),
    prompt: input.prompt,
    seed: parseInt(input.seed ?? -1),
    quality: input.quality,
    creativity: parseInt(input.creativity ?? 50),
    imagesize: input.image_size || input.imagesize,
    negativeprompt: input.negative_prompt || input.negativeprompt,
    restorefaces: input.restore_faces ?? input.restorefaces ?? false,
    ageslider: parseInt(input.age_slider ?? 18),
    weightslider: parseFloat(input.weight_slider ?? 0),
    breastslider: parseFloat(input.breast_slider ?? 0),
    assslider: parseFloat(input.ass_slider ?? 0),
  };
}

function sanitizeAndClampPayload(input) {
  const sanitized = { ...input };
  if (sanitized.prompt) sanitized.prompt = sanitizePrompt(sanitized.prompt);
  if (sanitized.negative_prompt) sanitized.negative_prompt = sanitizePrompt(sanitized.negative_prompt);
  const clamped = clampSliders(sanitized);
  Object.assign(sanitized, clamped);
  return toPromptchanPayload(sanitized);
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // We use the environment variable for PromptChan API key so users don't have to provide it
        const pc_key = process.env.PROMPTCHAN_API_KEY;
        if (!pc_key) {
             return res.status(500).json({ error: 'PROMPTCHAN_API_KEY not configured in Vercel Environment Variables.' });
        }

        let payload = { ...req.body };

        // Sanitize and clamp per Vercel debug advice + OpenAPI alignment
        payload = sanitizeAndClampPayload(payload);

        console.log("=== PROMPTCHAN REQUEST ===");
        console.log("Endpoint: https://prod.aicloudnetservices.com/api/external/create");
        console.log("Payload (sanitized):", JSON.stringify(payload, null, 2));

        const response = await fetch("https://prod.aicloudnetservices.com/api/external/create", {
            method: "POST",
            headers: {
                "x-api-key": pc_key,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errTxt = await response.text();
            console.error("=== PROMPTCHAN ERROR ===");
            console.error("Status:", response.status);
            console.error("Body:", errTxt);
            
            // Structured error for the frontend
            return res.status(502).json({ 
                error: `Render engine (PromptChan) returned status ${response.status}.`, 
                details: errTxt 
            });
        }

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error("PromptChan Backend Error:", error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
