export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured in Vercel Environment Variables' });
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                // OpenRouter required site verification headers
                "HTTP-Referer": "https://promptchan.studio",
                "X-OpenRouter-Title": "PromptChan Pro Elite"
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error("OpenRouter API Error:", error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
