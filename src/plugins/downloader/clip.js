const axios = require("axios");
const { proto, generateWAMessageFromContent } = require("@whiskeysockets/baileys");
const { scrapr } = require("../../lib/scraprHelper");
const downloadPlugin = require("./download");

// Penyimpanan sesi interaktif pengguna
// Key: "from:sender" -> { url, title, durationSec, partCount, clipDurationMins, createdAt }
const clipSessions = new Map();
const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 menit

function cleanExpiredSessions() {
    const now = Date.now();
    for (const [key, session] of clipSessions.entries()) {
        if (now - session.createdAt > SESSION_TIMEOUT_MS) {
            clipSessions.delete(key);
        }
    }
}

// Jalankan pembersihan sesi setiap 2 menit
if (typeof setInterval === "function") {
    const cleaner = setInterval(cleanExpiredSessions, 2 * 60 * 1000);
    if (cleaner.unref) cleaner.unref();
}

module.exports = {
    name: "clip",
    alias: ["clipper", "potong", "shorts", "reels", "klip"],
    category: "downloader",
    desc: "Potong video menjadi klip 9:16 vertikal (TikTok/Shorts) dengan subtitle CapCut otomatis",

    hasSession(key) {
        cleanExpiredSessions();
        return clipSessions.has(key);
    },

    async handleChoice({ sock, m, choice, sessionKey, prefix }) {
        cleanExpiredSessions();
        const session = clipSessions.get(sessionKey);
        if (!session) return false;

        const choiceClean = choice.toLowerCase().trim();

        // Opsi 1: Download Video Asli (Full HD)
        if (choiceClean === "1") {
            clipSessions.delete(sessionKey);
            await m.reply("📥 *Mengunduh Video Asli (Kualitas HD)... Mohon tunggu sebentar!*");
            return await downloadPlugin.execute({
                sock,
                m,
                args: [session.url],
                text: session.url,
                prefix: prefix || ".",
                command: "dl"
            });
        }

        // Opsi A / ALL / SEMUA: Potong Semua Bagian
        if (choiceClean === "a" || choiceClean === "all" || choiceClean === "semua") {
            clipSessions.delete(sessionKey);
            await m.reply(
                `⚡ *Sedang memproses SEMUA bagian (${session.partCount} klip) ke format 9:16 Vertikal + Subtitle CapCut...*\n\n` +
                `⏳ Estimasi waktu: ~15 detik per klip.\n` +
                `_Klip akan dikirim bertahap ke chat ini begitu selesai._`
            );

            try {
                await axios.post("http://localhost:8000/api/clipper/link", {
                    url: session.url,
                    clipper_mode: "duration",
                    clip_duration_mins: session.clipDurationMins || 3.0,
                    selected_parts: null,
                    reframe_mode: "blur_background",
                    caption_style: "capcut_yellow",
                    burn_subtitles: true,
                    auto_dispatch: true,
                    target_whatsapp: m.from
                }, { timeout: 15000 });
                return true;
            } catch (err) {
                await m.reply(`⚠️ *Gagal memicu ALIFxz Clipper Engine:* ${err.response?.data?.detail || err.message}`);
                return true;
            }
        }

        // Opsi Bagian Tertentu: [2] = Part 1, [3] = Part 2, dst.
        const num = parseInt(choiceClean, 10);
        if (!isNaN(num) && num >= 2 && num <= session.partCount + 1) {
            const partIndex = num - 1;
            clipSessions.delete(sessionKey);

            const startSec = (partIndex - 1) * 180;
            const endSec = Math.min(partIndex * 180, session.durationSec);
            const startStr = `${String(Math.floor(startSec / 60)).padStart(2, "0")}:${String(Math.floor(startSec % 60)).padStart(2, "0")}`;
            const endStr = `${String(Math.floor(endSec / 60)).padStart(2, "0")}:${String(Math.floor(endSec % 60)).padStart(2, "0")}`;

            await m.reply(
                `✂️ *Sedang memproses Klip Bagian ${partIndex} (${startStr} - ${endStr}) ke format 9:16 Vertikal...*\n\n` +
                `✨ Otomatis dibuat dengan:\n` +
                `• Aspect ratio 9:16 vertikal\n` +
                `• Background blur cinema\n` +
                `• Subtitle CapCut kuning animasi presisi\n\n` +
                `⏳ _Video akan langsung dikirim ke chat ini begitu selesai dirender (estimasi ~16 detik)._`
            );

            try {
                await axios.post("http://localhost:8000/api/clipper/link", {
                    url: session.url,
                    clipper_mode: "duration",
                    clip_duration_mins: session.clipDurationMins || 3.0,
                    selected_parts: [partIndex],
                    reframe_mode: "blur_background",
                    caption_style: "capcut_yellow",
                    burn_subtitles: true,
                    auto_dispatch: true,
                    target_whatsapp: m.from
                }, { timeout: 15000 });
                return true;
            } catch (err) {
                await m.reply(`⚠️ *Gagal memicu ALIFxz Clipper Engine:* ${err.response?.data?.detail || err.message}`);
                return true;
            }
        }

        return false;
    },

    async execute({ m, text, prefix, command, sock }) {
        const urlMatch = text.match(/https?:\/\/[^\s<>()"']+/gi);
        if (!urlMatch) {
            return m.reply(
                `🎬 *ALIFXZ VIDEO CLIPPER & DOWNLOADER*\n\n` +
                `Fitur ini memungkinkan kamu memotong video panjang jadi klip vertikal 9:16 (TikTok/Reels/Shorts) lengkap dengan subtitle animasi CapCut.\n\n` +
                `*Cara Penggunaan:*\n` +
                `• *${prefix + command}* <url>\n` +
                `  _Membuka menu interaktif pilihan download atau potong klip per bagian_\n\n` +
                `• *${prefix + command}* <url> 1\n` +
                `  _Langsung potong bagian 1 (00:00 - 03:00)_\n\n` +
                `• *${prefix + command}* <url> all\n` +
                `  _Langsung potong semua bagian_\n\n` +
                `*Contoh:*\n` +
                `*${prefix + command}* https://www.youtube.com/watch?v=xxxxxx`
            );
        }

        const url = urlMatch[0];
        const remainingText = text.replace(url, "").trim();

        // 1. Eksekusi langsung jika pengguna menyertakan argumen nomor bagian
        if (remainingText) {
            const low = remainingText.toLowerCase();
            if (low === "all" || low === "semua" || low === "a") {
                await m.reply(
                    `⚡ *Memproses SEMUA klip 9:16 dengan Subtitle CapCut...*\n` +
                    `_Video akan dikirim bertahap ke chat ini._`
                );
                try {
                    await axios.post("http://localhost:8000/api/clipper/link", {
                        url,
                        clipper_mode: "duration",
                        clip_duration_mins: 3.0,
                        selected_parts: null,
                        reframe_mode: "blur_background",
                        caption_style: "capcut_yellow",
                        burn_subtitles: true,
                        auto_dispatch: true,
                        target_whatsapp: m.from
                    }, { timeout: 15000 });
                    return;
                } catch (err) {
                    return m.reply(`⚠️ *Gagal menghubungkan ke Clipper Engine:* ${err.message}`);
                }
            }

            const directPart = parseInt(remainingText, 10);
            if (!isNaN(directPart) && directPart >= 1) {
                await m.reply(
                    `✂️ *Memproses Klip Bagian ${directPart} ke format 9:16 Vertikal + Subtitle CapCut...*\n` +
                    `⏳ _Video akan dikirim ke chat ini begitu selesai dirender (estimasi ~16 detik)._`
                );
                try {
                    await axios.post("http://localhost:8000/api/clipper/link", {
                        url,
                        clipper_mode: "duration",
                        clip_duration_mins: 3.0,
                        selected_parts: [directPart],
                        reframe_mode: "blur_background",
                        caption_style: "capcut_yellow",
                        burn_subtitles: true,
                        auto_dispatch: true,
                        target_whatsapp: m.from
                    }, { timeout: 15000 });
                    return;
                } catch (err) {
                    return m.reply(`⚠️ *Gagal menghubungkan ke Clipper Engine:* ${err.message}`);
                }
            }
        }

        // 2. Tampilkan Menu Interaktif: Probe durasi video terlebih dahulu
        const loadingMsg = await m.reply("🔍 *Menganalisis durasi & konten video...*");

        let probeData = null;
        try {
            const probeRes = await axios.get(`http://localhost:8000/api/probe?url=${encodeURIComponent(url)}`, { timeout: 12000 });
            if (probeRes.data && probeRes.data.success) {
                probeData = probeRes.data;
            }
        } catch (e) {
            // Abaikan jika probe engine gagal, fallback ke default kalkulasi
        }

        const title = probeData?.title || "Video Source";
        const durSec = probeData?.duration_seconds || 180;
        const durFormatted = probeData?.duration_formatted || `${Math.floor(durSec / 60)}:${String(Math.floor(durSec % 60)).padStart(2, "0")}`;

        // Kalkulasi jumlah bagian (per 3 menit = 180 detik)
        const partCount = Math.max(1, Math.ceil(durSec / 180));

        // Simpan sesi interaktif
        const sessionKey = `${m.from}:${m.senderNumber || m.sender}`;
        clipSessions.set(sessionKey, {
            url,
            title,
            durationSec: durSec,
            partCount,
            clipDurationMins: 3.0,
            createdAt: Date.now()
        });

        // Susun daftar menu per bagian
        let partsList = "";
        for (let i = 1; i <= partCount; i++) {
            const sSec = (i - 1) * 180;
            const eSec = Math.min(i * 180, durSec);
            const sStr = `${String(Math.floor(sSec / 60)).padStart(2, "0")}:${String(Math.floor(sSec % 60)).padStart(2, "0")}`;
            const eStr = `${String(Math.floor(eSec / 60)).padStart(2, "0")}:${String(Math.floor(eSec % 60)).padStart(2, "0")}`;
            partsList += `[${i + 1}] ✂️ *Potong Klip 9:16 - Bagian ${i}* (${sStr} - ${eStr})\n`;
        }

        const menuText =
`🎬 *ALIFXZ VIDEO CLIPPER & DOWNLOADER* 🎬

📌 *Judul:* ${title}
⏱ *Durasi:* ${durFormatted} (${partCount} Bagian @ 3 Menit)
🔗 *Link:* ${url}

Pilih aksi yang ingin kamu lakukan:
━━━━━━━━━━━━━━━━━━━━━
[1] 📥 *Download Video Asli (Full HD)*
${partsList}[A] ⚡ *Potong Semua Bagian (${partCount} Klip Sekaligus)*
━━━━━━━━━━━━━━━━━━━━━
👉 *Balas pesan ini dengan angka/huruf pilihanmu (misal: 1, 2, atau A).*

✨ *Fitur Klip 9:16 Vertikal:*
• Reframe otomatis 9:16 untuk TikTok, Reels, & Shorts
• Background cinematic blur
• Subtitle animasi CapCut kuning presisi
• Render ultra cepat (~16 detik) langsung ke WA`;

        // Susun Tombol Interaktif Native Flow
        const rowsParts = [];
        for (let i = 1; i <= partCount; i++) {
            const sSec = (i - 1) * 180;
            const eSec = Math.min(i * 180, durSec);
            const sStr = `${String(Math.floor(sSec / 60)).padStart(2, "0")}:${String(Math.floor(sSec % 60)).padStart(2, "0")}`;
            const eStr = `${String(Math.floor(eSec / 60)).padStart(2, "0")}:${String(Math.floor(eSec % 60)).padStart(2, "0")}`;
            rowsParts.push({
                title: `✂️ Potong Bagian ${i} (${sStr} - ${eStr})`,
                description: `Klip 9:16 Vertikal + Subtitle CapCut`,
                id: `${prefix || "."}clip ${url} ${i}`
            });
        }

        const sections = [
            {
                title: "🔥 PILIH BAGIAN KLIP (9:16 + CAPCUT)",
                rows: rowsParts
            },
            {
                title: "⚡ PILIHAN CEPAT LAINNYA",
                rows: [
                    {
                        title: "⚡ Potong Semua Part",
                        description: `Proses seluruh ${partCount} part sekaligus`,
                        id: `${prefix || "."}clip ${url} all`
                    },
                    {
                        title: "📥 Download Video Asli",
                        description: "Unduh video asli resolusi HD tanpa potong",
                        id: `${prefix || "."}dl ${url}`
                    },
                    {
                        title: "🎙️ AI Dubbing Indonesia",
                        description: "Sulih suara Bahasa Indonesia (George)",
                        id: `${prefix || "."}dub ${url}`
                    }
                ]
            }
        ];

        const buttons = [
            {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: "⚡ Potong Part 1 (Cepat)",
                    id: `${prefix || "."}clip ${url} 1`
                })
            },
            {
                name: "single_select",
                buttonParamsJson: JSON.stringify({
                    title: "Select Menu ✂️🎬",
                    sections: sections
                })
            }
        ];

        try {
            const userJid = sock.user?.id ? sock.user.id.split(":")[0] + "@s.whatsapp.net" : m.from;
            const isPrivate = !m.isGroup;
            const additionalNodes = [
                {
                    tag: "biz",
                    attrs: {},
                    content: [
                        {
                            tag: "interactive",
                            attrs: { type: "native_flow", v: "1" },
                            content: [
                                {
                                    tag: "native_flow",
                                    attrs: { v: "9", name: "mixed" }
                                }
                            ]
                        }
                    ]
                }
            ];

            if (isPrivate) {
                additionalNodes.push({ tag: "bot", attrs: { biz_bot: "1" } });
            }

            const bodyContent = 
`📌 *Judul:* ${title}
⏱ *Durasi:* ${durFormatted} (${partCount} Bagian @ 3 Menit)
🔗 *Sumber:* ${url}

Silakan klik tombol di bawah untuk memilih opsi pemotongan klip:
_(Atau balas langsung angka 1, 2, atau A di chat)_`;

            const interactiveMsg = generateWAMessageFromContent(m.from, {
                interactiveMessage: proto.Message.InteractiveMessage.create({
                    contextInfo: {
                        mentionedJid: [m.sender]
                    },
                    body: proto.Message.InteractiveMessage.Body.create({
                        text: bodyContent
                    }),
                    footer: proto.Message.InteractiveMessage.Footer.create({
                        text: "CREATED BY ALIFxz Studio Bot"
                    }),
                    header: proto.Message.InteractiveMessage.Header.create({
                        title: "⚡ PILIHAN MENU KLIP 9:16",
                        subtitle: "",
                        hasMediaAttachment: false
                    }),
                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                        buttons: buttons
                    })
                })
            }, { quoted: m.raw, userJid });

            await sock.relayMessage(m.from, interactiveMsg.message, {
                messageId: interactiveMsg.key.id,
                additionalNodes: additionalNodes
            });
        } catch (cardErr) {
            console.warn("[Clip] Gagal relay interactive card, fallback ke teks biasa:", cardErr.message);
            await m.reply(menuText);
        }
    }
};
