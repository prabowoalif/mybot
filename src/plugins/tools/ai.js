const axios = require("axios");

// Kumpulan API key cadangan (otomatis berpindah jika salah satu kuota habis)
const GEMINI_KEYS = [
    "AIzaSyBhUYKWmbG8BpGsBsm2QiEBzJhufdSwq1w",
    "AIzaSyDOPNhY2hIMnYPaUNRpHDmhMR04xau18xE",
    "AIzaSyCpX7QkYD4uKMxg3AaQjffWV8M6ZixfNsk",
    "AIzaSyB38oowbo9Q5hBsvgbx0q3BLtRdF9A_l-U",
    "AIzaSyAkO0aCzjVkNNQah_twiwWenC4vc6QBhvs",
    "AIzaSyAJhP3ffhBXYY_h5-OUFjLVbWGZWDvoIOs"
];

let keyIndex = 0;

async function askGemini(prompt) {
    let lastError = null;

    for (let i = 0; i < GEMINI_KEYS.length; i++) {
        const apiKey = GEMINI_KEYS[(keyIndex + i) % GEMINI_KEYS.length];
        try {
            const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;
            const res = await axios.post(url, {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000
                }
            }, {
                headers: { "Content-Type": "application/json" },
                timeout: 25000
            });

            keyIndex = (keyIndex + i + 1) % GEMINI_KEYS.length;
            const answer = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (answer) return answer;
        } catch (err) {
            lastError = err;
        }
    }

    // Fallback cadangan jika semua key Google limit
    const fallbackRes = await axios.get("https://api.siputzx.my.id/api/ai/gemini?prompt=" + encodeURIComponent(prompt), { timeout: 15000 });
    if (fallbackRes.data?.data) return fallbackRes.data.data;

    throw new Error(lastError?.response?.data?.error?.message || "Semua kuota AI sedang sibuk.");
}

module.exports = {
    name: "ai",
    alias: ["gpt", "tanya", "ask"],
    category: "tools",
    desc: "Tanya jawab cerdas dengan AI (Gemini)",
    async execute({ m, text, prefix, command }) {
        if (!text) {
            return m.reply(
                `🤖 *Halo! Saya adalah Asisten AI.*\n\n` +
                `Silakan tanyakan apa saja:\n` +
                `Contoh: *${prefix + command}* Jelaskan cara kerja gravitasi secara singkat\n` +
                `Contoh: *${prefix + command}* Buatkan puisi tentang hujan`
            );
        }

        await m.reply("💭 *AI sedang berpikir...*");

        try {
            const answer = await askGemini(text);
            await m.reply(answer);
        } catch (err) {
            await m.reply(`❌ Maaf, gagal mendapatkan jawaban dari AI:\n${err.message}`);
        }
    }
};
