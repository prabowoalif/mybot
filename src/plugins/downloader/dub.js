const axios = require("axios");
const { proto, generateWAMessageFromContent } = require("@whiskeysockets/baileys");

module.exports = {
    name: "dub",
    alias: ["dubbing", "aidub", "sulihsuara", "terjemahvideo"],
    category: "downloader",
    desc: "Sulih suara (AI Dubbing) video ke Bahasa Indonesia via Groq Whisper + ElevenLabs",

    async execute({ m, text, prefix, command, sock, config }) {
        const urlMatch = text.match(/https?:\/\/[^\s<>()"']+/gi);
        if (!urlMatch) {
            return m.reply(
                `🎙️ *ALIFXZ AI VIDEO DUBBER STUDIO* 🎙️\n\n` +
                `Fitur ini menerjemahkan dan menyulih suara (dubbing) video YouTube/TikTok/Reels ke Bahasa Indonesia secara alami menggunakan AI ElevenLabs!\n\n` +
                `*Cara Penggunaan:*\n` +
                `• *${prefix + command}* <url>\n` +
                `  _Dubbing otomatis dengan karakter suara George (Pria)_\n\n` +
                `• *${prefix + command}* <url> sarah\n` +
                `  _Dubbing dengan karakter suara Sarah (Wanita)_\n\n` +
                `*Pilihan Karakter Suara:*\n` +
                `• *George* (Pria - Narator Hangat & Menawan) [Default]\n` +
                `• *Sarah* (Wanita - Tenang, Percaya Diri, Elegan)\n` +
                `• *Adam* (Pria - Tegas & Berkarakter)\n` +
                `• *Alice* (Wanita - Edukatif & Ramah)\n\n` +
                `*Contoh:*\n` +
                `*${prefix + command}* https://youtu.be/PsHHHFtc2yQ`
            );
        }

        const url = urlMatch[0];
        const remainingText = text.replace(url, "").trim().toLowerCase();

        // Tentukan karakter suara yang dipilih
        let voice = "George";
        if (remainingText.includes("sarah")) voice = "Sarah";
        else if (remainingText.includes("adam")) voice = "Adam";
        else if (remainingText.includes("alice")) voice = "Alice";
        else if (remainingText.includes("george")) voice = "George";

        // Konfirmasi awal proses dubbing
        await m.reply(
            `🎙️ *MEMULAI ALIFXZ AI VIDEO DUBBING*\n\n` +
            `Sedang menyiapkan proses sulih suara Bahasa Indonesia...\n` +
            `🔗 *Sumber:* ${url}\n` +
            `🗣️ *Karakter Suara:* *${voice}*\n\n` +
            `⚙️ *Tahapan Proses:*\n` +
            `1️⃣ Unduh video sumber\n` +
            `2️⃣ Ekstrak audio & transkripsi (Groq Whisper)\n` +
            `3️⃣ Terjemahkan ke Bahasa Indonesia yang luwes (Groq GPT-OSS)\n` +
            `4️⃣ Sintesis vokal alami Bahasa Indonesia (ElevenLabs)\n` +
            `5️⃣ Gabungkan audio dubbing ke video asli\n\n` +
            `⏳ _Proses ini membutuhkan waktu sekitar 1–2 menit. Video hasil dubbing akan otomatis dikirim ke chat ini begitu selesai!_`
        );

        try {
            const apiRes = await axios.post("http://localhost:8000/api/dubber/link", {
                url: url,
                voice: voice,
                auto_dispatch: true,
                target_whatsapp: m.from
            }, { timeout: 15000 });

            if (!apiRes.data || !apiRes.data.success) {
                return m.reply(`⚠️ *Gagal memulai tugas dubbing:* ${apiRes.data?.error || "Terjadi kesalahan di server"}`);
            }
        } catch (err) {
            return m.reply(`⚠️ *Gagal menghubungi ALIFxz Dubber Engine:* ${err.response?.data?.detail || err.message}`);
        }
    }
};
