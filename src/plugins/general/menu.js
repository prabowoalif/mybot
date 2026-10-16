const os = require("os");
const process = require("process");
const fs = require("fs");
const path = require("path");
const { proto, generateWAMessageFromContent } = require("@whiskeysockets/baileys");

module.exports = {
    name: "menu",
    alias: ["help", "start", "allmenu", "menudl", "menutools", "menugeneral"],
    category: "general",
    desc: "Menampilkan Panel Menu interaktif langsung di WhatsApp dengan banner ALIFxz",
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

        // Helper Pengiriman Pesan Gambar + Caption (Anti-Silent Drop & Selalu Menampilkan Logo ALIFxz)
        const sendMenuWithImage = async (captionText) => {
            if (imageBuffer) {
                return await sock.sendMessage(m.from, {
                    image: imageBuffer,
                    caption: captionText,
                    contextInfo: {
                        mentionedJid: [m.sender],
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: "120363186130999681@newsletter",
                            newsletterName: `${config.botName} Official`,
                            serverMessageId: 1
                        }
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
        let mainMenu = panelHeader +
`╭───「 📋 *PILIHAN PANEL MENU* 」───
│
│ 📥 *${prefix}menu dl* ➔ Panel Downloader
│ 🎨 *${prefix}menu tools* ➔ Panel AI & Tools
│ ⚙️ *${prefix}menu general* ➔ Panel Info & Sistem
│ 📜 *${prefix}menu all* ➔ Tampilkan Semua Fitur
│
╰─────────────────────────────\n`;

        if (isOwner) {
            mainMenu +=
`╭───「 👑 *PANEL KHUSUS OWNER* 」───
│ 🛠️ *${prefix}panel* ➔ Owner Control Panel
│ 🌐 *${prefix}mode <public|self>* ➔ Ganti Mode
│ 🔄 *${prefix}restart* ➔ Restart Bot
╰─────────────────────────────\n`;
        }

        mainMenu += `💡 *Tips:* Klik tombol *[ 📋 LIHAT MENU ]* di bawah atau ketik perintah di atas.\nTempel (paste) link media apa saja langsung di chat untuk auto-download!`;

        // 1. KIRIM MENU UTAMA DENGAN GAMBAR BANNER ALIFxz (100% Tampil di semua WhatsApp)
        await sendMenuWithImage(mainMenu);

        // 2. KIRIM TOMBOL INTERAKTIF POP-UP "LIHAT MENU" (Single Select Native Flow seperti FURINA V17)
        try {
            const sections = [
                {
                    title: "🌟 KATEGORI MENU",
                    rows: [
                        { title: "📥 DOWNLOADER", description: "TikTok, Douyin, IG, YT, Spotify, TeraBox", id: `${prefix}menu dl` },
                        { title: "🎨 TOOLS & AI", description: "Gemini AI, Sticker, Brat, HD, NoBG", id: `${prefix}menu tools` },
                        { title: "⚙️ INFO SISTEM", description: "Kecepatan Ping, Stats Server, Kontak", id: `${prefix}menu general` },
                        { title: "📦 SEMUA FITUR", description: "Tampilkan seluruh 67 perintah lengkap", id: `${prefix}menu all` }
                    ]
                }
            ];

            if (isOwner) {
                sections.push({
                    title: "👑 KONTROL OWNER",
                    rows: [
                        { title: "🛠️ OWNER PANEL", description: "Ubah Mode, Restart Bot, Stats Hardware", id: `${prefix}panel` }
                    ]
                });
            }

            const listnye = {
                title: "LIHAT MENU",
                sections: sections
            };

            const userJid = sock.user?.id ? sock.user.id.split(":")[0] + "@s.whatsapp.net" : m.from;

            const interactiveMsg = generateWAMessageFromContent(m.from, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata: {},
                            deviceListMetadataVersion: 2
                        },
                        interactiveMessage: proto.Message.InteractiveMessage.create({
                            contextInfo: {
                                mentionedJid: [m.sender],
                                forwardingScore: 99,
                                isForwarded: true,
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid: "120363186130999681@newsletter",
                                    newsletterName: `${config.botName} Official`,
                                    serverMessageId: 1
                                }
                            },
                            body: proto.Message.InteractiveMessage.Body.create({
                                text: "Klik tombol *[ 📋 LIHAT MENU ]* di bawah ini untuk membuka pop-up kategori:"
                            }),
                            footer: proto.Message.InteractiveMessage.Footer.create({
                                text: `By ${config.ownerName} • ${config.botName}`
                            }),
                            header: proto.Message.InteractiveMessage.Header.create({
                                title: "⚡ QUICK MENU SELECTOR",
                                subtitle: "",
                                hasMediaAttachment: false
                            }),
                            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                buttons: [
                                    {
                                        name: "single_select",
                                        buttonParamsJson: JSON.stringify(listnye)
                                    }
                                ]
                            })
                        })
                    }
                }
            }, { quoted: m.raw, userJid });

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
                                        attrs: { name: "single_select" }
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });
        } catch (buttonErr) {
            console.warn("[Menu] Info: Tombol interactive single_select dilewati:", buttonErr.message);
        }
    }
};
