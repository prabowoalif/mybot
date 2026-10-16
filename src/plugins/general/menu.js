const os = require("os");
const process = require("process");
const fs = require("fs");
const path = require("path");
const { proto, generateWAMessageFromContent, prepareWAMessageMedia } = require("@whiskeysockets/baileys");

module.exports = {
    name: "menu",
    alias: ["help", "start", "allmenu", "menudl", "menutools", "menugeneral"],
    category: "general",
    desc: "Menampilkan Panel Menu interaktif kartu WhatsApp dengan banner ALIFxz",
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

        // Path ke Banner Gambar Custom ALIFxz
        const localMenuImg = path.join(__dirname, "../../assets/menu.jpg");
        const hasImg = fs.existsSync(localMenuImg);
        const imageBuffer = hasImg ? fs.readFileSync(localMenuImg) : null;

        // Helper fallback pengiriman pesan gambar + teks
        const sendMenuWithImage = async (captionText) => {
            if (imageBuffer) {
                return await sock.sendMessage(m.from, {
                    image: imageBuffer,
                    caption: captionText,
                    contextInfo: {
                        mentionedJid: [m.sender]
                    }
                }, { quoted: m.raw });
            } else {
                return await m.reply(captionText);
            }
        };

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
│ 📦 *Total Fitur:* ${plugins.size} Perintah Aktif
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
            return await sendMenuWithImage(dlText);
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
│   └ _Ubah foto/video/GIF jadi stiker WA_
│
│ 🟢 *${prefix}brat* <teks>
│   └ _Buat stiker gaya album Brat viral_
│
│ 💎 *${prefix}hd* / *${prefix}remini*
│   └ _Upscale foto buram jadi jernih & tajam_
│
│ ✂️ *${prefix}nobg*
│   └ _Hapus latar belakang foto otomatis_
│
│ 📄 *${prefix}ocr*
│   └ _Ekstrak teks tulisan dari gambar_
│
│ 💬 *${prefix}fakenotif* <Nama | Pesan>
│   └ _Buat gambar preview notifikasi iPhone_
│
╰─────────────────────────────
_Ketik *${prefix}menu* untuk kembali ke Panel Utama._`;
            return await sendMenuWithImage(toolsText);
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
│   └ _Tampilkan kontak resmi pemilik bot_
│
│ 📋 *${prefix}menu*
│   └ _Tampilkan panel menu utama WhatsApp_
│
╰─────────────────────────────
_Ketik *${prefix}menu* untuk kembali ke Panel Utama._`;
            return await sendMenuWithImage(generalText);
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
            return await sendMenuWithImage(allText);
        }

        // 5. TAMPILAN DASHBOARD PANEL UTAMA (!menu)
        // Penyesuaian ucapan salam berdasarkan waktu lokal
        const currentHour = new Date().getHours();
        let greeting = "Good Night";
        let greetingEmoji = "🌙";
        if (currentHour >= 4 && currentHour < 11) {
            greeting = "Good Morning";
            greetingEmoji = "🌅";
        } else if (currentHour >= 11 && currentHour < 15) {
            greeting = "Good Afternoon";
            greetingEmoji = "☀️";
        } else if (currentHour >= 15 && currentHour < 18) {
            greeting = "Good Evening";
            greetingEmoji = "🌇";
        }

        const bodyGreeting = 
`${greetingEmoji} *${greeting},* 👋 hai *${m.pushName || "Kak"}*, perkenalkan saya adalah bot WhatsApp yang diciptakan oleh *${config.botName}*.

Tujuannya untuk membantu berbagai kebutuhan seperti Media Downloader (TikTok, IG, YouTube, Spotify), AI Assistant Gemini, Creative Tools, Info Server, dan fitur otomatis lainnya.

╭───「 ⚡ *${config.botName.toUpperCase()} DASHBOARD* ⚡ 」───
│ 🤖 *Bot Name:* ${config.botName}
│ 👑 *Developer:* ${config.ownerName}
│ 👤 *User:* ${m.pushName || "Kak"}
│ 🔰 *Role:* ${role}
│ 🌐 *Mode Akses:* *[ ${currentMode} ]*
│
│ ⏱️ *Bot Uptime:* ${uptimeStr}
│ 💾 *RAM Server:* ${usedRamMB} MB / ${totalMemGB} GB
│ ⚡ *Respons:* ${pingMs} ms
│ 📦 *Total Fitur:* ${plugins.size} Perintah Aktif
╰─────────────────────────────

💡 *Cara Penggunaan:*
• Klik tombol *[ 🌩️ All Menu (Image) ]* untuk membuka seluruh daftar perintah.
• Klik tombol *[ Select Menu 🌩️👾 ]* untuk memilih kategori via menu pop-up.
• Tempel (paste) link media apa saja langsung di chat untuk auto-download!`;

        // Susun pilihan kategori untuk pop-up Select Menu
        const sections = [
            {
                title: "🌟 KATEGORI UTAMA",
                rows: [
                    { title: "📥 DOWNLOADER", description: "TikTok, Douyin, IG, YT, Spotify, TeraBox", id: `${prefix}menu dl` },
                    { title: "🎨 TOOLS & AI", description: "Gemini AI, Sticker, Brat, HD, NoBG", id: `${prefix}menu tools` },
                    { title: "⚙️ INFO SISTEM", description: "Kecepatan Ping, Stats Server, Kontak", id: `${prefix}menu general` },
                    { title: "📦 SEMUA FITUR", description: "Tampilkan seluruh 71 perintah bot", id: `${prefix}menu all` }
                ]
            }
        ];

        if (isOwner) {
            sections.push({
                title: "👑 KONTROL OWNER",
                rows: [
                    { title: "🛠️ OWNER PANEL", description: "Buka kontrol bot & status server", id: `${prefix}panel` },
                    { title: "🌐 GANTI MODE", description: "Ubah mode Public / Self", id: `${prefix}mode` },
                    { title: "🔄 RESTART BOT", description: "Mulai ulang sistem bot", id: `${prefix}restart` }
                ]
            });
        }

        // Siapkan Media Attachment untuk Header Kartu
        let headerMedia = {};
        if (imageBuffer) {
            try {
                headerMedia = await prepareWAMessageMedia(
                    { image: imageBuffer },
                    { upload: sock.waUploadToServer }
                );
            } catch (e) {
                console.warn("[Menu] Gagal memproses gambar header:", e.message);
            }
        }
        const hasMedia = Object.keys(headerMedia).length > 0;

        // Buat Tombol Aksi (Quick Reply & Single Select List)
        const buttons = [
            {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: "🌩️ All Menu (Image)",
                    id: `${prefix}menu all`
                })
            },
            {
                name: "single_select",
                buttonParamsJson: JSON.stringify({
                    title: "Select Menu 🌩️👾",
                    sections: sections
                })
            }
        ];

        // Parameter Kartu Limited Time Offer (Banner Tag Ikon & Kode Kupon Diskon)
        const messageParams = {
            limited_time_offer: {
                text: `'${config.botName}'`,
                url: "https://whatsapp.com",
                copy_code: `script by ${config.ownerName.toLowerCase()}`,
                expiration_time: Date.now() + (24 * 60 * 60 * 1000)
            }
        };

        const userJid = sock.user?.id ? sock.user.id.split(":")[0] + "@s.whatsapp.net" : m.from;

        // Buat Pesan Interaktif Lengkap (Satu Bubble: Foto + Tag Card + Body + Footer + 2 Tombol)
        const interactiveMsg = generateWAMessageFromContent(m.from, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: proto.Message.InteractiveMessage.create({
                        contextInfo: {
                            mentionedJid: [m.sender]
                        },
                        body: proto.Message.InteractiveMessage.Body.create({
                            text: bodyGreeting
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.create({
                            text: `CREATED BY ${config.botName}`
                        }),
                        header: proto.Message.InteractiveMessage.Header.create({
                            title: "",
                            subtitle: "",
                            hasMediaAttachment: hasMedia,
                            ...(hasMedia ? headerMedia : {})
                        }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                            buttons: buttons,
                            messageParamsJson: JSON.stringify(messageParams)
                        })
                    })
                }
            }
        }, { quoted: m.raw, userJid });

        try {
            await sock.relayMessage(m.from, interactiveMsg.message, {
                messageId: interactiveMsg.key.id,
                additionalNodes: [
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
                                        attrs: { name: "mixed" }
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });
        } catch (err) {
            console.warn("[Menu] Gagal relay interactive card, fallback ke image message:", err.message);
            await sendMenuWithImage(bodyGreeting);
        }
    }
};
