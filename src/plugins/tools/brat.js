const axios = require("axios");
const { Sticker, StickerTypes } = require("wa-sticker-formatter");

module.exports = {
    name: "brat",
    alias: ["stikerbrat", "bratstiker"],
    category: "tools",
    desc: "Buat stiker teks brat ala album Brat (viral)",
    async execute({ m, text, prefix, command, config, sock }) {
        if (!text) {
            return m.reply(`⚠️ *Masukkan teks!*\n\nContoh:\n*${prefix + command}* kamu nanya`);
        }

        await m.reply("⏳ *Sedang membuat stiker brat...*");

        try {
            const url = `https://aqul-brat.hf.space/api/brat?text=${encodeURIComponent(text)}`;
            const response = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });

            const sticker = new Sticker(response.data, {
                pack: config.botName || "Nexa Bot",
                author: config.ownerName || "Owner",
                type: StickerTypes.FULL,
                quality: 70
            });

            const stickerBuffer = await sticker.toBuffer();
            await sock.sendMessage(m.from, { sticker: stickerBuffer }, { quoted: m.raw });
        } catch (err) {
            await m.reply(`❌ Gagal membuat stiker brat: ${err.message}`);
        }
    }
};
