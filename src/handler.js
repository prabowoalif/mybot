const config = require("./config");
const { serialize } = require("./lib/serialize");
const { plugins } = require("./lib/loader");
const { log } = require("./lib/print");
const { scrapr } = require("./lib/scraprHelper");

/**
 * Pengatur alur pesan masuk (Message Router & Dispatcher)
 */
async function handleMessage(sock, chatUpdate) {
    try {
        const rawMsg = chatUpdate.messages[0];
        if (!rawMsg || !rawMsg.message) return;

        // Abaikan pesan otomatis yang dikirim oleh socket bot agar tidak looping
        if (rawMsg.key.fromMe) {
            const textContent = (
                rawMsg.message?.conversation ||
                rawMsg.message?.extendedTextMessage?.text ||
                rawMsg.message?.imageMessage?.caption ||
                rawMsg.message?.videoMessage?.caption ||
                ""
            ).trim();

            const isCommand = config.prefix.some((p) => textContent.startsWith(p));
            const isAutoUrl = !isCommand && /https?:\/\/[^\s<>()"']+/gi.test(textContent);

            if (!isCommand && !isAutoUrl) return;
            if (
                textContent.includes("Mohon tunggu") ||
                textContent.includes("PANEL") ||
                textContent.includes("Downloader") ||
                textContent.includes("Terjadi kesalahan")
            ) {
                return;
            }
        }

        // Serialisasi pesan
        const m = serialize(sock, rawMsg);
        if (!m.body) return;

        // Identifikasi Owner & Status Mode
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

        // Jika bot dalam mode 'self', hanya Owner yang diproses
        if (global.botMode === "self" && !isOwner) {
            return;
        }

        // Cari prefix yang cocok
        const matchedPrefix = config.prefix.find((p) => m.body.startsWith(p));
        if (!matchedPrefix) {
            // FITUR AUTO DOWNLOADER (Langsung unduh saat kirim link tanpa prefix)
            const urlMatches = m.body.match(/https?:\/\/[^\s<>()"']+/gi);
            if (urlMatches && urlMatches.length > 0) {
                const firstUrl = urlMatches[0];
                const detected = scrapr.detect(firstUrl);
                if (detected && detected.status) {
                    const downloadPlugin = plugins.get("download");
                    if (downloadPlugin) {
                        log.info(`Auto Downloader: Mendeteksi link ${detected.platform} dari ${m.pushName || m.sender}`);
                        return await downloadPlugin.execute({
                            sock,
                            m,
                            args: [firstUrl],
                            text: firstUrl,
                            prefix: "",
                            command: "auto-download",
                            config,
                            plugins
                        });
                    }
                }
            }
            return;
        }

        // Pisahkan nama command dan argumen
        const withoutPrefix = m.body.slice(matchedPrefix.length).trim();
        const args = withoutPrefix.split(/ +/);
        const commandName = args.shift().toLowerCase();
        const text = args.join(" ");

        // Cari plugin yang sesuai
        const plugin = plugins.get(commandName);
        if (!plugin) return;

        // Cetak log ke terminal
        log.message({
            from: m.from,
            sender: m.pushName || senderNumber,
            command: `${matchedPrefix}${commandName}`,
            isGroup: m.isGroup
        });

        // 1. Validasi: Khusus Pemilik Bot (Owner)
        if (plugin.isOwner && !isOwner) {
            return m.reply("⚠️ *Akses Ditolak!* Fitur ini hanya dapat digunakan oleh Owner bot.");
        }

        // 2. Validasi: Khusus di dalam Grup
        if (plugin.isGroup && !m.isGroup) {
            return m.reply("⚠️ *Gagal!* Perintah ini hanya bisa digunakan di dalam grup.");
        }

        // 3. Validasi: Khusus Chat Pribadi (Private)
        if (plugin.isPrivate && m.isGroup) {
            return m.reply("⚠️ *Gagal!* Perintah ini hanya bisa digunakan di chat pribadi.");
        }

        // 4. Validasi Admin Grup (jika dibutuhkan)
        let isSenderAdmin = false;
        let isBotAdmin = false;
        if (m.isGroup && (plugin.isAdmin || plugin.isBotAdmin)) {
            const groupMetadata = await sock.groupMetadata(m.from);
            const participants = groupMetadata.participants || [];

            const senderObj = participants.find((p) => p.id.split("@")[0] === senderNumber);
            isSenderAdmin = senderObj?.admin === "admin" || senderObj?.admin === "superadmin";

            const botId = sock.user?.id ? sock.user.id.split(":")[0] : "";
            const botObj = participants.find((p) => p.id.split("@")[0] === botId);
            isBotAdmin = botObj?.admin === "admin" || botObj?.admin === "superadmin";

            if (plugin.isAdmin && !isSenderAdmin && !isOwner) {
                return m.reply("⚠️ *Akses Ditolak!* Perintah ini hanya untuk Admin grup.");
            }

            if (plugin.isBotAdmin && !isBotAdmin) {
                return m.reply("⚠️ *Bot Belum Admin!* Jadikan bot sebagai admin grup terlebih dahulu untuk menggunakan fitur ini.");
            }
        }

        // Eksekusi fungsi plugin
        await plugin.execute({
            sock,
            m,
            args,
            text,
            prefix: matchedPrefix,
            command: commandName,
            config,
            plugins,
            isOwner,
            isSenderAdmin,
            isBotAdmin
        });

    } catch (err) {
        log.error(`Error saat mengeksekusi pesan: ${err.message}`);
        console.error(err);
    }
}

module.exports = { handleMessage };
