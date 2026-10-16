const axios = require("axios");
const FormData = require("form-data");

module.exports = {
    name: "ocr",
    alias: ["bacateks", "scanteks"],
    category: "tools",
    desc: "Membaca dan menyalin teks dari foto secara otomatis (OCR)",
    async execute({ m, prefix, command }) {
        try {
            const isMedia = m.type === "imageMessage";
            const isQuotedMedia = m.quoted && m.quoted.type === "imageMessage";

            if (!isMedia && !isQuotedMedia) {
                return m.reply(`⚠️ *Kirim atau balas foto yang ada teksnya* dengan caption *${prefix + command}*!`);
            }

            await m.reply("⏳ *Sedang memindai teks dari gambar (OCR), mohon tunggu...*");

            const buffer = isQuotedMedia ? await m.quoted.download() : await m.download();
            if (!buffer) return m.reply("❌ Gagal mengunduh gambar.");

            const form = new FormData();
            form.append("base64Image", `data:image/jpeg;base64,${buffer.toString("base64")}`);
            form.append("apikey", "helloworld");
            form.append("language", "eng"); // bisa membaca alfabet latin termasuk bahasa Indonesia

            const res = await axios.post("https://api.ocr.space/parse/image", form, {
                headers: {
                    ...form.getHeaders()
                },
                timeout: 30000
            });

            const parsedText = res.data?.ParsedResults?.[0]?.ParsedText?.trim();

            if (!parsedText) {
                return m.reply("❌ Tidak ada teks yang terdeteksi di dalam foto tersebut.");
            }

            let replyMsg = `📄 *HASIL PEMINDAIAN TEKS (OCR)*\n\n`;
            replyMsg += `────────────────────\n`;
            replyMsg += `${parsedText}\n`;
            replyMsg += `────────────────────\n`;
            replyMsg += `_Teks di atas sudah disalin otomatis, kamu bisa langsung copy-paste._`;

            await m.reply(replyMsg);

        } catch (err) {
            await m.reply(`❌ Gagal membaca teks dari foto:\n${err.message}`);
        }
    }
};
