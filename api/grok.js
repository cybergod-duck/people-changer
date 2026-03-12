export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured in Vercel Environment Variables' });
    }

    try {
        // Intercept Grok requests and build a dynamic failover routing array
        let requestBody = { ...req.body };
        if (requestBody.model && requestBody.model.startsWith("x-ai/grok")) {
            // Delete the strict model key
            delete requestBody.model;
            // Add OpenRouter's fallback routing array using valid x-ai tags
            requestBody.models = [
                "x-ai/grok-3",
                "x-ai/grok-3-mini",
                "x-ai/grok-2",
                "x-ai/grok-2-vision"
            ];
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                // OpenRouter required site verification headers
                "HTTP-Referer": "https://supergod.studio",
                "X-OpenRouter-Title": "Supergod Studio"
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error("OpenRouter API Error:", error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
