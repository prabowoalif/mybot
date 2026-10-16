const { extractMedia, formatPlatformName } = require("../../lib/scraprHelper");

module.exports = {
    name: "download",
    alias: ["dl", "unduh"],
    category: "downloader",
    desc: "Unduh media otomatis dari TikTok, IG, YT, Twitter, Spotify, dll.",
    async execute({ m, text, prefix, command, sock }) {
        const urlMatch = text.match(/https?:\/\/[^\s<>()"']+/gi);
        if (!urlMatch) {
            return m.reply(
                `⚠️ *Format Salah!*\n\n` +
                `Gunakan perintah dengan menyertakan link:\n` +
                `Contoh: *${prefix + command}* https://vt.tiktok.com/xxxxxx/\n` +
                `Contoh: *${prefix + command}* https://www.instagram.com/reel/xxxxxx/`
            );
        }

        const url = urlMatch[0];
        await m.reply("⏳ *Sedang memproses tautan via Vercel Cloud, mohon tunggu sebentar...*");

        try {
            const media = await extractMedia(url);
            const platformName = formatPlatformName(media.platform);

            let caption = `*${platformName} Downloader*\n\n`;
            if (media.title) caption += `📌 *Judul:* ${media.title}\n`;
            if (media.size) caption += `📦 *Ukuran:* ${media.size}\n`;

            // 1. Jika ada video, utamakan kirim video
            if (media.videos && media.videos.length > 0) {
                const targetVideo = media.videos[0].url;
                await sock.sendMessage(m.from, {
                    video: { url: targetVideo },
                    caption: caption
                }, { quoted: m.raw });
                return;
            }

            // 2. Jika ada kumpulan foto (misal IG Carousel / TikTok slide)
            if (media.photos && media.photos.length > 0) {
                const maxPhotos = Math.min(media.photos.length, 5);
                for (let i = 0; i < maxPhotos; i++) {
                    await sock.sendMessage(m.from, {
                        image: { url: media.photos[i].url },
                        caption: i === 0 ? caption : ""
                    }, { quoted: m.raw });
                }
                return;
            }

            // 3. Jika berupa audio / musik (Spotify, SoundCloud, Apple Music)
            if (media.audios && media.audios.length > 0) {
                const targetAudio = media.audios[0].url;
                await sock.sendMessage(m.from, {
                    audio: { url: targetAudio },
                    mimetype: "audio/mp4",
                    fileName: `${(media.title || "audio").replace(/[/\\?%*:|"<>]/g, "")}.mp3`
                }, { quoted: m.raw });
                return;
            }

            // 4. Jika berupa file dokumen (MediaFire, Sfile, TeraBox)
            if (media.files && media.files.length > 0) {
                const targetFile = media.files[0].url;
                await sock.sendMessage(m.from, {
                    document: { url: targetFile },
                    fileName: media.filename || "file_download",
                    mimetype: "application/octet-stream"
                }, { quoted: m.raw });
                return;
            }

            await m.reply("❌ Tidak ditemukan media yang dapat diunduh dari tautan tersebut.");

        } catch (err) {
            await m.reply(`❌ Terjadi kesalahan saat mengunduh:\n${err.message}`);
        }
    }
};
