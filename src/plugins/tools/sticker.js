const { Sticker, StickerTypes } = require("wa-sticker-formatter");

module.exports = {
    name: "sticker",
    alias: ["s", "stiker"],
    category: "tools",
    desc: "Ubah foto/video pendek jadi stiker WhatsApp",
    async execute({ m, config, sock }) {
        try {
            const isMedia = m.type === "imageMessage" || m.type === "videoMessage";
            const isQuotedMedia = m.quoted && (m.quoted.type === "imageMessage" || m.quoted.type === "videoMessage");

            if (!isMedia && !isQuotedMedia) {
                return m.reply("⚠️ *Kirim atau balas foto/video pendek* dengan caption `!s` untuk dijadikan stiker!");
            }

            await m.reply("⏳ *Sedang membuat stiker...*");

            const buffer = isQuotedMedia ? await m.quoted.download() : await m.download();
            if (!buffer) return m.reply("❌ Gagal mengunduh media dari pesan.");

            const sticker = new Sticker(buffer, {
                pack: config.botName || "ALIFxz",
                author: config.ownerName || "Owner",
                type: StickerTypes.FULL,
                quality: 60
            });

            const stickerBuffer = await sticker.toBuffer();
            await sock.sendMessage(m.from, { sticker: stickerBuffer }, { quoted: m.raw });
        } catch (err) {
            await m.reply(`❌ Gagal membuat stiker: ${err.message}`);
        }
    }
};
