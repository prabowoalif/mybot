const os = require("os");
const process = require("process");
const { generateWAMessageFromContent } = require("@whiskeysockets/baileys");

module.exports = {
    name: "menu",
    alias: ["help", "start", "allmenu", "menudl", "menutools", "menugeneral"],
    category: "general",
    desc: "Menampilkan Panel Menu interaktif langsung di WhatsApp",
    async execute({ m, args, prefix, command, config, plugins, sock }) {
        const start = Date.now();
        const subMenu = (args[0] || (command.startsWith("menu") && command.length > 4 ? command.slice(4) : "")).toLowerCase();

        // Data Sistem & Pengguna
        const uptimeSec = Math.floor(process.uptime());
        const days = Math.floor(uptimeSec / 86400);
        const hours = Math.floor((uptimeSec % 86400) / 3600);
        const minutes = Math.floor((uptimeSec % 3600) / 60);
        const seconds = uptimeSec % 60;
        const uptimeStr = `${days > 0 ? `${days}h ` : ""}${hours}j ${minutes}m ${seconds}d`;

        const memory = process.memoryUsage();
        const usedRamMB = (memory.rss / 1024 / 1024).toFixed(1);
        const totalMemGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);

        const ownerList = [
            ...config.ownerNumber,
            (config.phoneNumber || "").replace(/[^0-9]/g, "")
        ].filter(Boolean).map(n => n.replace(/[^0-9]/g, ""));

        const cleanSender = (m.senderNumber || m.sender.split("@")[0] || "").replace(/[^0-9]/g, "");
        const rawSender = (m.sender.split("@")[0] || "").replace(/[^0-9]/g, "");
        const remoteJidClean = ((m.from || "").split("@")[0] || "").replace(/[^0-9]/g, "");

        const isOwner = 
            m.fromMe || 
            ownerList.includes(cleanSender) ||
            ownerList.includes(rawSender) ||
            ownerList.includes(remoteJidClean);

        const role = isOwner ? "👑 OWNER / DEVELOPER" : "👤 PENGGUNA";
        const currentMode = (global.botMode || "public").toUpperCase();
        const pingMs = Date.now() - start;

        // Header Panel Seragam
        const panelHeader = 
`╭───「 ⚡ *${config.botName.toUpperCase()} PANEL* ⚡ 」───
│ 🤖 *Bot Name:* ${config.botName}
│ 👑 *Owner:* ${config.ownerName}
│ 👤 *User:* ${m.pushName || "Kak"}
│ 🔰 *Role:* ${role}
│ 🌐 *Mode:* *[ ${currentMode} ]*
│
│ ⏱️ *Bot Uptime:* ${uptimeStr}
│ 💾 *RAM Server:* ${usedRamMB} MB / ${totalMemGB} GB
│ ⚡ *Kecepatan:* ${pingMs} ms
│ 📦 *Total Fitur:* ${plugins.size} Command Aktif
╰─────────────────────────────\n`;

        // 1. SUB-PANEL: DOWNLOADER (!menu dl)
        if (subMenu === "dl" || subMenu === "downloader") {
            const dlText = panelHeader +
`╭───「 📥 *PANEL MEDIA DOWNLOADER* 」───
│
│ 💡 *Auto-Detect:* Cukup tempel (paste) link langsung di chat tanpa ketik perintah!
│
│ 🎵 *TikTok Downloader*
│   └ *${prefix}tiktok* <url>
│   └ _Kualitas HD tanpa watermark otomatis_
│
│ 🎵 *Douyin Downloader*
│   └ *${prefix}dl* <url douyin>
│   └ _Mendukung video HD & slide foto_
│
│ 📸 *Instagram Downloader*
│   └ *${prefix}ig* <url ig>
│   └ _Reels, Postingan Foto, & Carousel_
│
│ 🎬 *YouTube Downloader*
│   └ *${prefix}yt* <url yt>
│   └ _Video MP4 & Audio MP3_
│
│ 🎧 *Musik & Audio*
│   └ *${prefix}spotify* <url spotify>
│   └ _Mendukung Spotify & SoundCloud_
│
│ 📁 *Universal & Cloud Files*
│   └ *${prefix}dl* <url>
│   └ _MediaFire, Sfile, TeraBox, Catbox, dll._
│
╰─────────────────────────────
_Ketik *${prefix}menu* untuk kembali ke Panel Utama._`;
            return await m.reply(dlText);
        }

        // 2. SUB-PANEL: TOOLS & AI (!menu tools)
        if (subMenu === "tools" || subMenu === "tool" || subMenu === "ai") {
            const toolsText = panelHeader +
`╭───「 🎨 *PANEL AI & CREATIVE TOOLS* 」───
│
│ 🤖 *${prefix}ai* <pertanyaan>
│   └ _Tanya jawab pintar dengan Google Gemini AI_
│
│ 🏷️ *${prefix}s* / *${prefix}sticker*
│   └ _Ubah foto/video/GIF jadi stiker WA (kirim atau balas media)_
│
│ 🟢 *${prefix}brat* <teks>
│   └ _Buat stiker gaya album Brat viral_
│
│ 💎 *${prefix}hd* / *${prefix}remini*
│   └ _Upscale foto buram jadi jernih & tajam_
│
│ ✂️ *${prefix}nobg*
│   └ _Hapus latar belakang foto otomatis (transparan)_
│
│ 📄 *${prefix}ocr*
│   └ _Ekstrak teks tulisan dari gambar/dokumen_
│
│ 💬 *${prefix}fakenotif* <Nama | Pesan>
│   └ _Buat gambar preview notifikasi iPhone aesthetic_
│
╰─────────────────────────────
_Ketik *${prefix}menu* untuk kembali ke Panel Utama._`;
            return await m.reply(toolsText);
        }

        // 3. SUB-PANEL: GENERAL & SYSTEM (!menu general)
        if (subMenu === "general" || subMenu === "info") {
            const generalText = panelHeader +
`╭───「 ⚙️ *PANEL INFORMASI SISTEM* 」───
│
│ ⚡ *${prefix}ping*
│   └ _Cek kecepatan respons bot_
│
│ 📊 *${prefix}stats*
│   └ _Cek statistik hardware RAM, CPU, dan OS server_
│
│ 📞 *${prefix}owner*
│   └ _Tampilkan kontak resmi pemilik/pengembang bot_
│
│ 📋 *${prefix}menu*
│   └ _Tampilkan panel menu utama WhatsApp_
│
╰─────────────────────────────
_Ketik *${prefix}menu* untuk kembali ke Panel Utama._`;
            return await m.reply(generalText);
        }

        // 4. SUB-PANEL: ALL MENU (!menu all)
        if (subMenu === "all") {
            const categorized = {};
            const visited = new Set();

            for (const [_, plugin] of plugins) {
                if (visited.has(plugin.name)) continue;
                visited.add(plugin.name);

                const cat = plugin.category ? plugin.category.toUpperCase() : "LAINNYA";
                if (!categorized[cat]) categorized[cat] = [];
                categorized[cat].push(plugin);
            }

            let allText = panelHeader + `╭───「 📜 *DAFTAR SELURUH PERINTAH* 」───\n\n`;
            for (const [category, list] of Object.entries(categorized)) {
                allText += `┌───「 *${category}* 」\n`;
                for (const cmd of list) {
                    const badge = cmd.isOwner ? " *(Owner)*" : cmd.isGroup ? " *(Grup)*" : "";
                    allText += `│ • *${prefix}${cmd.name}*${badge}\n`;
                    if (cmd.desc) allText += `│   └ _${cmd.desc}_\n`;
                }
                allText += `└───\n\n`;
            }
            allText += `_Ketik *${prefix}menu* untuk kembali ke Panel Utama._`;
            return await m.reply(allText);
        }

        // 5. TAMPILAN DASHBOARD PANEL UTAMA (!menu)
        let mainMenu = panelHeader +
`╭───「 📋 *PILIHAN PANEL MENU* 」───
│
│ Ketik perintah di bawah untuk membuka panel:
│
│ 📥 *${prefix}menu dl*
│   └ _Panel Media Downloader (TikTok, IG, YT, Spotify, dll.)_
│
│ 🎨 *${prefix}menu tools*
│   └ _Panel AI Pintar & Creative Tools (Sticker, Brat, HD, AI)_
│
│ ⚙️ *${prefix}menu general*
│   └ _Panel Sistem & Informasi Performa Bot_
│
│ 📜 *${prefix}menu all*
│   └ _Tampilkan seluruh daftar fitur secara lengkap_
│
╰─────────────────────────────\n`;

        if (isOwner) {
            mainMenu +=
`╭───「 👑 *PANEL KHUSUS OWNER* 」───
│
│ 🛠️ *${prefix}panel*
│   └ _Buka panel kontrol Owner langsung di WhatsApp_
│ 🌐 *${prefix}mode <public|self>*
│   └ _Ubah mode akses bot_
│ 🔄 *${prefix}restart*
│   └ _Restart bot dari WhatsApp_
│
╰─────────────────────────────\n`;
        }

        mainMenu += 
`\n💡 *Tips:* Silakan klik tombol *[ 📋 LIHAT MENU ]* di bawah atau ketik perintah secara manual.`;

        // Susun pilihan menu untuk tombol popup Single Select
        const rows = [
            {
                header: "📥 DOWNLOADER",
                title: "Panel Media Downloader",
                description: "Unduh TikTok, Douyin, IG, YT, Spotify, TeraBox",
                id: `${prefix}menu dl`
            },
            {
                header: "🎨 KREATIF & AI",
                title: "Panel AI & Creative Tools",
                description: "Gemini AI, Stiker WA, Brat, HD Upscale, NoBG",
                id: `${prefix}menu tools`
            },
            {
                header: "⚙️ INFORMASI BOT",
                title: "Panel Informasi Sistem",
                description: "Status Kecepatan Ping, Server Hardware, Kontak",
                id: `${prefix}menu general`
            },
            {
                header: "📜 SEMUA FITUR",
                title: "Daftar Seluruh Perintah",
                description: "Tampilkan seluruh 67 perintah lengkap",
                id: `${prefix}menu all`
            }
        ];

        if (isOwner) {
            rows.push({
                header: "👑 KONTROL OWNER",
                title: "Owner Control Panel",
                description: "Ubah Mode, Restart Bot, Statistik Hardware",
                id: `${prefix}panel`
            });
        }

        const buttons = [
            {
                name: "single_select",
                buttonParamsJson: JSON.stringify({
                    title: "📋 LIHAT MENU",
                    sections: [
                        {
                            title: "PILIHAN KATEGORI MENU",
                            highlight_label: "Rekomendasi",
                            rows
                        }
                    ]
                })
            },
            {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: "⚡ Cek Speed (Ping)",
                    id: `${prefix}ping`
                })
            },
            {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: "📞 Kontak Owner",
                    id: `${prefix}owner`
                })
            }
        ];

        try {
            const interactiveMessage = {
                header: {
                    title: `⚡ ${config.botName.toUpperCase()} PANEL DASHBOARD ⚡`,
                    subtitle: `Mode: ${currentMode} • Ping: ${pingMs}ms`,
                    hasMediaAttachment: false
                },
                body: { text: mainMenu },
                footer: { text: `© ${config.botName} • Klik tombol 'LIHAT MENU' di bawah` },
                nativeFlowMessage: {
                    buttons
                }
            };

            const msg = generateWAMessageFromContent(m.from, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata: {},
                            deviceListMetadataVersion: 2
                        },
                        interactiveMessage
                    }
                }
            }, { quoted: m.raw });

            await sock.relayMessage(m.from, msg.message, { messageId: msg.key.id });
        } catch (err) {
            console.warn("[Menu] Gagal mengirim interactive message, fallback ke m.reply:", err.message);
            await m.reply(mainMenu);
        }
    }
};
