const fs = require('fs');

async function testPromptChan() {
    console.log("Starting PromptChan local test...");
    
    // Attempt to read the .env file or rely on environment variables
    const promptChanKey = process.env.PROMPTCHAN_API_KEY || "wZ2BHVdSNppsG2Fr1rYJ9Q"; 
    
    const payload = {
        style: "Cinematic",
        poses: "Default",
        filter: "Default",
        emotion: "Default",
        detail: 1,
        prompt: "RAW photo, a highly detailed cinematic portrait of a beautiful blonde woman in neon lighting, 8k resolution, photorealistic",
        seed: Math.floor(Math.random() * 1000000),
        quality: "Ultra",
        creativity: 0,
        image_size: "512x512",
        negative_prompt: "ugly, low quality, deformed, cartoon, illustration",
        restore_faces: true,
        age_slider: 0,
        weight_slider: 0,
        breast_slider: 0,
        ass_slider: 0,
        pc_key: promptChanKey
    };

    try {
        // Use local dev server if running, otherwise bypass Vercel locally and test the remote endpoint directly 
        // to see the API errors (since Vercel edge functions are hard to execute nakedly in pure Node)
        
        console.log("=== SENDING TEST PAYLOAD TO EXTERNAL API ===");
        const { pc_key, ...promptChanPayload } = payload;
        
        const response = await fetch("https://prod.aicloudnetservices.com/api/external/create", {
            method: "POST",
            headers: {
                "x-api-key": promptChanKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(promptChanPayload)
        });

        if (!response.ok) {
            const errTxt = await response.text();
            console.error("=== PROMPTCHAN ERROR ===");
            console.error("Status:", response.status);
            console.error("Body:", errTxt);
        } else {
            const data = await response.json();
            console.log("SUCCESS! API Returned:", Object.keys(data));
            if(data.image) {
                console.log("Base64 image length:", data.image.length);
            }
        }

    } catch (e) {
        console.error("Script error:", e);
    }
}

testPromptChan();
