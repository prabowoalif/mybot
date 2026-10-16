const axios = require("axios");
const FormData = require("form-data");

async function removeBackground(buffer) {
    const form = new FormData();
    form.append("image", buffer, { filename: "image.png" });
    form.append("format", "png");
    form.append("model", "v1");

    const res = await axios.post("https://api2.pixelcut.app/image/matte/v1", form, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            ...form.getHeaders()
        },
        responseType: "arraybuffer",
        timeout: 25000
    });

    return Buffer.from(res.data);
}

module.exports = {
    name: "nobg",
    alias: ["removebg", "hapusbg"],
    category: "tools",
    desc: "Menghapus latar belakang (background) foto otomatis",
    async execute({ m, prefix, command, sock }) {
        try {
            const isMedia = m.type === "imageMessage";
            const isQuotedMedia = m.quoted && m.quoted.type === "imageMessage";

            if (!isMedia && !isQuotedMedia) {
                return m.reply(`⚠️ *Kirim atau balas foto* dengan caption *${prefix + command}* untuk menghapus background!`);
            }

            await m.reply("⏳ *Sedang menghapus background foto, mohon tunggu...*");

            const buffer = isQuotedMedia ? await m.quoted.download() : await m.download();
            if (!buffer) return m.reply("❌ Gagal mengunduh gambar.");

            const resultBuffer = await removeBackground(buffer);

            // Kirim sebagai foto PNG transparan dan stiker
            await sock.sendMessage(m.from, {
                image: resultBuffer,
                caption: "✨ *Background foto berhasil dihapus!*"
            }, { quoted: m.raw });

        } catch (err) {
            await m.reply(`❌ Gagal menghapus background:\n${err.message}`);
        }
    }
};
