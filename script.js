    <script>
        let currentPrompt = "";
        let currentNegative = "";
        let currentPayload = {};
        let history = [];
        let editCount = 0;
        const MAX_EDITS = 3;

        async function handleChat() {
            if (editCount >= MAX_EDITS) {
                addMsg('assistant', "Maximum edits reached. Prompt is locked in.");
                return;
            }

            const input = document.getElementById('chat-input');
            const msg = input.value.trim();
            if (!msg) return;

            addMsg('user', msg);
            input.value = '';
            input.style.height = 'auto';
            setStatus('Grok Engineering...');

            const mainImg = document.getElementById('main-image');
            const hasImage = mainImg.src && !mainImg.classList.contains('hidden');
            let userMsgContent = msg;

            if (editCount === 0 && hasImage) {
                userMsgContent = [
                    { type: "text", text: msg },
                    { type: "image_url", image_url: { url: mainImg.src } }
                ];
            }

            const userMessageObj = { role: "user", content: userMsgContent };

            try {
                const res = await fetch("/api/grok", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "x-ai/grok-4.1-fast",
                        messages: [
                            {
                                role: "system",
                                content: `You are an Elite NSFW Prompt Engineer. Your job is to create the perfect prompt based on the user's physical description requests AND the stylistic photo provided across iterative turns. Output ONLY valid JSON matching this exact schema:
{
  "style": "Cinematic",
  "poses": "Default",
  "filter": "Default",
  "emotion": "Default",
  "detail": 0.0,
  "prompt": "detailed prompt string",
  "seed": 0,
  "quality": "Ultra",
  "creativity": 0,
  "image_size": "512x512",
  "negative_prompt": "negative prompt string",
  "restore_faces": true,
  "age_slider": 0,
  "weight_slider": 0.0,
  "breast_slider": 0.0,
  "ass_slider": 0.0
}`
                            },
                            ...history,
                            userMessageObj
                        ],
                        response_format: { type: "json_object" }
                    })
                });

                const data = await res.json();
                if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

                    if(!data.choices?.[0]?.message?.content) {
                        throw new Error('Invalid response: no choices or content');
            }

                let aiData;
            try {
                aiData = JSON.parse(data.choices[0].message.content);
            } catch (e) {
                const content = data.choices[0].message.content;
                const jsonMatch = /\{[\s\S]*?\}/.exec(content);
                if (jsonMatch) {
                    aiData = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error(`JSON parse failed: ${e.message}. Content preview: ${content.substring(0, 200)}...`);
                }
            }

            // ACTUAL CONNECTION: Grok to Global State
            currentPayload = aiData;
            currentPrompt = aiData.prompt || aiData.positive_prompt || '';
            currentNegative = aiData.negative_prompt || aiData.negativePrompt || aiData.neg_prompt || '';

            // UI UPDATE: The Live Output Feed
            updateLiveFeed(currentPrompt);

            history.push(userMessageObj);
            history.push({ role: "assistant", content: data.choices[0].message.content });

            editCount++;
            addMsg('assistant', `Vector analysis complete. Edit ${editCount}/${MAX_EDITS} used.\n\nPrompt: ${currentPrompt}`);

            if (editCount >= MAX_EDITS) {
                input.disabled = true;
                input.placeholder = "Prompt Locked In.";
                addMsg('assistant', "Max edits reached. Final prompt locked in. It is photo + final description = output.");
            }

            if (msg.toLowerCase().match(/\b(go|generate|make|render|execute)\b/)) {
                triggerGeneration();
            }
        } catch (e) {
            addMsg('assistant', `Sync Error: ${e.message}`);
        } finally { setStatus('System Ready'); }
        }

        async function triggerGeneration() {
            if (!currentPayload) return addMsg('assistant', "No PromptChan payload generated. Initiate Grok first.");

            const loader = document.getElementById('loader');
            const canvas = document.getElementById('canvas-container');
            const btn = document.getElementById('generate-btn');
            const stage = document.getElementById('render-stage');

            loader.classList.remove('hidden');
            canvas.classList.add('generating');
            btn.disabled = true;
            stage.innerText = "Syncing with Node...";

            const payload = {
                ...currentPayload,
                style: document.getElementById('style-select').value,
                seed: Math.floor(Math.random() * 1000000000)
            };

            // Redirecting through Vercel Serverless to bypass CORS headers
            const target = "/api/promptchan";

            try {
                stage.innerText = "Decrypting Response...";
                const res = await fetch(target, {
                    method: "POST",
                    headers: {
                        "x-api-key": document.getElementById('pc-key').value,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    const errTxt = await res.text();
                    throw new Error(errTxt || "Gateway Timeout");
                }

                const data = await res.json();
                if (data.image) {
                    const img = document.getElementById('main-image');
                    img.src = `data:image/png;base64,${data.image}`;
                    img.classList.remove('hidden');
                    document.getElementById('canvas-placeholder').classList.add('hidden');
                    document.getElementById('canvas-actions').classList.remove('hidden');
                    stage.innerText = "Asset Finalized";
                }
            } catch (e) {
                addMsg('assistant', `PromptChan Link Failed: ${e.message}`);
                stage.innerText = "Link Interrupted";
            } finally {
                setTimeout(() => {
                    loader.classList.add('hidden');
                    canvas.classList.remove('generating');
                    btn.disabled = false;
                }, 1000);
            }
        }

        // === UI & HELPERS ===
        function updateLiveFeed(text) {
            const feed = document.getElementById('live-prompt-view');
            const status = document.getElementById('feed-status');
            feed.innerText = text;
            status.classList.remove('bg-zinc-800');
            status.classList.add('bg-green-500', 'shadow-[0_0_8px_#22c55e]');
        }

        function addMsg(role, text) {
            const container = document.getElementById('chat-messages');
            const div = document.createElement('div');
            div.className = `p-5 rounded-2xl text-[11px] leading-relaxed transition-all ${role === 'user' ? 'bg-blue-600/10 text-blue-200 border border-blue-500/20 ml-8' : 'bg-zinc-900 border border-white/5 text-zinc-400 mr-8'}`;
            div.innerText = text;
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        }

        function setStatus(t) { document.getElementById('api-status').innerText = t; }
        function toggleSettings() { document.getElementById('settings-modal').classList.toggle('hidden'); }

        function setupDragAndDrop() {
            const dz = document.getElementById('dropzone');
            dz.onclick = () => document.getElementById('file-upload').click();
            document.getElementById('file-upload').onchange = (e) => {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const preview = document.getElementById('ref-preview');
                    preview.src = ev.target.result;
                    preview.classList.remove('hidden');
                    document.getElementById('upload-prompt').classList.add('hidden');
                    document.getElementById('vision-btn').classList.remove('hidden');

                    if (typeof editCount !== 'undefined') {
                        editCount = 0;
                        history = [];
                        const input = document.getElementById('chat-input');
                        input.disabled = false;
                        input.placeholder = "Input scene parameters...";
                    }
                };
                reader.readAsDataURL(file);
            };
        }

        async function analyzeReference() {
            const src = document.getElementById('ref-preview').src;
            const mainImg = document.getElementById('main-image');
            mainImg.src = src;
            mainImg.classList.remove('hidden');
            document.getElementById('canvas-placeholder').classList.add('hidden');
            document.getElementById('canvas-actions').classList.remove('hidden');

            addMsg('assistant', "Photo locked on main screen. What is your basic prompt instruction? (0/3 Edits)");
            document.getElementById('chat-input').focus();
        }
        function clearCanvas() {
            document.getElementById('main-image').classList.add('hidden');
            document.getElementById('canvas-placeholder').classList.remove('hidden');
            document.getElementById('canvas-actions').classList.add('hidden');
        }
        function downloadResult() {
            const a = document.createElement('a');
            a.download = `PC-ELITE-${Date.now()}.png`;
            a.href = document.getElementById('main-image').src;
            a.click();
        }

        window.onload = () => { setupDragAndDrop(); };
        const tx = document.getElementById('chat-input');
        tx.addEventListener('input', function () { this.style.height = 'auto'; this.style.height = (this.scrollHeight) + 'px'; });
    </script>
