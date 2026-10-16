const axios = require("axios");
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
        const waitMsg = await m.reply("⏳ *Sedang memproses tautan via Vercel Cloud, mohon tunggu sebentar...*");

        try {
            const media = await extractMedia(url);
            const platformName = formatPlatformName(media.platform);

            let caption = `*${platformName} Downloader*\n\n`;
            if (media.title) caption += `📌 *Judul:* ${media.title}\n`;
            if (media.size) caption += `📦 *Ukuran:* ${media.size}\n`;

            // 1. Jika ada video, utamakan kirim video kualitas tertinggi (Auto HD)
            if (media.videos && media.videos.length > 0) {
                // Filter link API yang tidak dapat di-stream langsung
                const validVideos = media.videos.filter(v => 
                    v.url && 
                    !v.url.includes("/api/hd") && 
                    !v.url.includes("snaptik.app/api/hd")
                );

                const candidateVideos = validVideos.length > 0 ? validVideos : media.videos;

                // Urutkan kualitas: Prioritas HD / 1080p / High terlebih dahulu
                const sortedVideos = [...candidateVideos].sort((a, b) => {
                    const qA = (a.quality || "").toLowerCase();
                    const qB = (b.quality || "").toLowerCase();
                    const isHdA = qA.includes("hd") || qA.includes("1080") || qA.includes("high");
                    const isHdB = qB.includes("hd") || qB.includes("1080") || qB.includes("high");
                    if (isHdA && !isHdB) return -1;
                    if (!isHdA && isHdB) return 1;
                    return 0;
                });

                const isDocMode = text.includes("-doc") || text.includes("--doc") || command === "doc" || command === "dldoc";
                let sent = false;
                let lastError = null;

                for (const vid of sortedVideos) {
                    const rawQ = (vid.quality || "").trim();
                    const qStr = rawQ && !["default", "normal"].includes(rawQ.toLowerCase())
                        ? `${rawQ} (Auto-HD)`
                        : "HD No Watermark (Auto-HD)";
                    const qualityLabel = `\n💎 *Kualitas:* ${qStr}`;

                    // Coba kirim langsung via URL Stream
                    try {
                        if (isDocMode) {
                            await sock.sendMessage(m.from, {
                                document: { url: vid.url },
                                fileName: `${(media.title || "video_hd").slice(0, 30).replace(/[/\\?%*:|"<>]/g, "")}.mp4`,
                                mimetype: "video/mp4",
                                caption: caption + qualityLabel + "\n📁 _Dikirim sebagai dokumen (0% kompresi)_"
                            }, { quoted: m.raw });
                        } else {
                            await sock.sendMessage(m.from, {
                                video: { url: vid.url },
                                caption: caption + qualityLabel,
                                mimetype: "video/mp4"
                            }, { quoted: m.raw });
                        }
                        sent = true;
                        break;
                    } catch (streamErr) {
                        // Jika URL stream diblokir atau gagal di-fetch Baileys, unduh buffer dengan browser user-agent
                        try {
                            const res = await axios.get(vid.url, {
                                responseType: "arraybuffer",
                                headers: {
                                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                                    "Referer": url
                                },
                                timeout: 45000
                            });
                            const videoBuffer = Buffer.from(res.data);

                            if (isDocMode) {
                                await sock.sendMessage(m.from, {
                                    document: videoBuffer,
                                    fileName: `${(media.title || "video_hd").slice(0, 30).replace(/[/\\?%*:|"<>]/g, "")}.mp4`,
                                    mimetype: "video/mp4",
                                    caption: caption + qualityLabel + "\n📁 _Dikirim sebagai dokumen (0% kompresi)_"
                                }, { quoted: m.raw });
                            } else {
                                await sock.sendMessage(m.from, {
                                    video: videoBuffer,
                                    caption: caption + qualityLabel,
                                    mimetype: "video/mp4"
                                }, { quoted: m.raw });
                            }
                            sent = true;
                            break;
                        } catch (bufferErr) {
                            lastError = bufferErr;
                        }
                    }
                }

                if (sent) {
                    if (waitMsg?.delete) await waitMsg.delete();
                    return;
                }
                if (lastError) throw lastError;
            }

            // 2. Jika ada kumpulan foto (misal IG Carousel / TikTok slide)
            if (media.photos && media.photos.length > 0) {
                const maxPhotos = Math.min(media.photos.length, 10);
                for (let i = 0; i < maxPhotos; i++) {
                    const photoUrl = media.photos[i].url;
                    try {
                        await sock.sendMessage(m.from, {
                            image: { url: photoUrl },
                            caption: i === 0 ? caption : ""
                        }, { quoted: m.raw });
                    } catch (_) {
                        try {
                            const res = await axios.get(photoUrl, {
                                responseType: "arraybuffer",
                                headers: {
                                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                                },
                                timeout: 20000
                            });
                            await sock.sendMessage(m.from, {
                                image: Buffer.from(res.data),
                                caption: i === 0 ? caption : ""
                            }, { quoted: m.raw });
                        } catch (err) {
                            console.warn("Gagal mengirim foto slide:", err.message);
                        }
                    }
                }
                if (waitMsg?.delete) await waitMsg.delete();
                return;
            }

            // 3. Jika berupa audio / musik (Spotify, SoundCloud, Apple Music)
            if (media.audios && media.audios.length > 0) {
                const targetAudio = media.audios[0].url;
                try {
                    await sock.sendMessage(m.from, {
                        audio: { url: targetAudio },
                        mimetype: "audio/mp4",
                        fileName: `${(media.title || "audio").replace(/[/\\?%*:|"<>]/g, "")}.mp3`
                    }, { quoted: m.raw });
                } catch (_) {
                    const res = await axios.get(targetAudio, { responseType: "arraybuffer", timeout: 30000 });
                    await sock.sendMessage(m.from, {
                        audio: Buffer.from(res.data),
                        mimetype: "audio/mp4",
                        fileName: `${(media.title || "audio").replace(/[/\\?%*:|"<>]/g, "")}.mp3`
                    }, { quoted: m.raw });
                }
                if (waitMsg?.delete) await waitMsg.delete();
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
            }

            if (waitMsg?.delete) {
                await waitMsg.delete();
            }
        } catch (err) {
            const errMsg = `❌ Terjadi kesalahan saat mengunduh:\n${err.message}`;
            if (waitMsg?.edit) {
                await waitMsg.edit(errMsg);
            } else {
                await m.reply(errMsg);
            }
        }
    }
};
