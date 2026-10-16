const config = require("./config");
const { serialize } = require("./lib/serialize");
const { plugins } = require("./lib/loader");
const { log } = require("./lib/print");

/**
 * Pengatur alur pesan masuk (Message Router & Dispatcher)
 */
async function handleMessage(sock, chatUpdate) {
    try {
        const rawMsg = chatUpdate.messages[0];
        if (!rawMsg || !rawMsg.message) return;

        // Abaikan pesan dari bot sendiri agar tidak looping
        if (rawMsg.key.fromMe) return;

        // Serialisasi pesan
        const m = serialize(sock, rawMsg);
        if (!m.body) return;

        // Cari prefix yang cocok
        const matchedPrefix = config.prefix.find((p) => m.body.startsWith(p));
        if (!matchedPrefix) return;

        // Pisahkan nama command dan argumen
        const withoutPrefix = m.body.slice(matchedPrefix.length).trim();
        const args = withoutPrefix.split(/ +/);
        const commandName = args.shift().toLowerCase();
        const text = args.join(" ");

        // Cari plugin yang sesuai
        const plugin = plugins.get(commandName);
        if (!plugin) return;

        // Format nomor sender tanpa domain (@s.whatsapp.net)
        const senderNumber = m.sender.split("@")[0];
        const isOwner = config.ownerNumber.some((num) => num.replace(/[^0-9]/g, "") === senderNumber);

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
