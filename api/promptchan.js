export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const response = await fetch("https://prod.aicloudnetservices.com/api/external/create", {
            method: "POST",
            headers: {
                "x-api-key": req.headers['x-api-key'], // Passing the PromptChan key from the client
                "Content-Type": "application/json"
            },
            body: JSON.stringify(req.body)
        });

        if (!response.ok) {
            const errTxt = await response.text();
            throw new Error(errTxt || "PromptChan Gateway Timeout");
        }

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error("PromptChan Backend Error:", error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
