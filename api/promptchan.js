export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // We use the environment variable for PromptChan API key so users don't have to provide it
        const pc_key = process.env.PROMPTCHAN_API_KEY;
        const promptChanPayload = req.body;
        
        if (!pc_key) {
             return res.status(500).json({ error: 'PROMPTCHAN_API_KEY not configured in Vercel Environment Variables.' });
        }

        console.log("=== PROMPTCHAN REQUEST ===");
        console.log("Endpoint: https://prod.aicloudnetservices.com/api/external/create");
        console.log("Payload:", JSON.stringify(promptChanPayload, null, 2));

        const response = await fetch("https://prod.aicloudnetservices.com/api/external/create", {
            method: "POST",
            headers: {
                "x-api-key": pc_key,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(promptChanPayload)
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
