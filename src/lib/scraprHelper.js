const axios = require("axios");
const { execFile } = require("child_process");
const util = require("util");
const execFileAsync = util.promisify(execFile);
const scrapr = require("./scrapr");

const VERCEL_API_ENDPOINT = "https://telegram-downloader-bot-puce.vercel.app/api/download";

async function resolveRedirect(rawUrl) {
    try {
        const headRes = await axios.get(rawUrl, {
            maxRedirects: 5,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            },
            timeout: 5000,
            validateStatus: s => s < 400
        });
        return headRes.request?.res?.responseUrl || headRes.config?.url || rawUrl;
    } catch (_) {
        return rawUrl;
    }
}

async function extractViaYtDlp(url) {
    try {
        const { stdout } = await execFileAsync("yt-dlp", [
            "--dump-single-json",
            "--no-playlist",
            "--no-warnings",
            "--socket-timeout", "10",
            url
        ], { timeout: 20000 });

        const data = JSON.parse(stdout);
        const title = data.title || "Media Downloader";
        const thumbnail = data.thumbnail || "";
        const platform = (data.extractor_key || data.extractor || "Universal").toLowerCase();
        const videos = [];
        const audios = [];

        // Direct url if single stream
        if (data.url) {
            videos.push({ url: data.url, quality: data.format_note || "HD", type: "video" });
        }

        // Search in formats for progressive mp4 or direct video links
        if (Array.isArray(data.formats)) {
            const mp4s = data.formats.filter(f => f.url && f.ext === "mp4" && f.vcodec !== "none");
            if (mp4s.length > 0) {
                const withAudio = mp4s.filter(f => f.acodec && f.acodec !== "none");
                const targetList = withAudio.length > 0 ? withAudio : mp4s;
                const best = targetList[targetList.length - 1];
                if (!videos.some(v => v.url === best.url)) {
                    const qLabel = best.format_note || (best.height ? `${best.height}p` : "HD");
                    videos.unshift({ url: best.url, quality: qLabel, type: "video" });
                }
            }
        }

        return {
            title,
            thumbnail,
            platform,
            videos,
            audios,
            photos: [],
            files: [],
            source: "yt-dlp Engine"
        };
    } catch (_) {
        return null;
    }
}

function formatPlatformName(platform) {
    const map = {
        tiktok: "🎵 TikTok",
        instagram: "📸 Instagram",
        youtube: "🎬 YouTube",
        twitter: "🐦 Twitter / X",
        spotify: "🎧 Spotify",
        soundcloud: "☁️ SoundCloud",
        facebook: "📘 Facebook",
        pinterest: "📌 Pinterest",
        threads: "🧵 Threads",
        bilibili: "📺 Bilibili",
        douyin: "🎵 Douyin",
        reddit: "👽 Reddit",
        rednote: "📕 RedNote (Xiaohongshu)",
        pixiv: "🎨 Pixiv",
        applemusic: "🍎 Apple Music",
        bandcamp: "🎸 Bandcamp",
        terabox: "📦 TeraBox",
        resolver: "📁 File Resolver",
        sfile: "📁 Sfile.mobi",
        mediafire: "📁 MediaFire",
        pixeldrain: "📁 PixelDrain",
        catbox: "📁 Catbox",
        gdrive: "📁 Google Drive",
        krakenfiles: "📁 KrakenFiles"
    };
    return map[platform?.toLowerCase()] || `🌐 ${platform?.toUpperCase() || "Universal"}`;
}

function normalizeResult(res) {
    const result = res.result || {};
    const platform = res.platform || "unknown";
    const title = result.title || result.filename || "Media Downloader";
    const thumbnail = result.thumbnail || "";

    const videos = [];
    const audios = [];
    const photos = [];
    const files = [];

    // 1. Process downloads array if present
    if (Array.isArray(result.downloads)) {
        for (const d of result.downloads) {
            if (!d.url) continue;
            const type = (d.type || "").toLowerCase();
            const quality = d.quality || "Default";

            if (type.includes("video") || type === "mp4") {
                if (d.url.includes("/api/hd") || d.url.includes("snaptik.app/api/hd")) continue;
                videos.push({ url: d.url, quality, type: "video" });
            } else if (type.includes("audio") || type.includes("music") || type === "mp3") {
                audios.push({ url: d.url, quality, type: "audio" });
            } else if (type.includes("photo") || type.includes("image") || type === "jpg" || type === "png") {
                photos.push({ url: d.url, quality, type: "photo" });
            } else {
                files.push({ url: d.url, quality, type: "file" });
            }
        }
    }

    // 2. Process items array if present
    if (Array.isArray(result.items)) {
        for (const item of result.items) {
            const itemUrl = item.url || item.download;
            if (!itemUrl) continue;
            const itemType = (item.type || "").toLowerCase();
            if (itemType.includes("video")) {
                videos.push({ url: itemUrl, quality: item.quality || "HD", type: "video" });
            } else if (itemType.includes("photo") || itemType.includes("image")) {
                photos.push({ url: itemUrl, quality: "Photo", type: "photo" });
            }
        }
    }

    // 3. Process direct url/download
    if (result.url && !videos.length && !audios.length && !photos.length && !files.length) {
        if (result.type === "video") {
            videos.push({ url: result.url, quality: "HD", type: "video" });
        } else if (result.type === "audio") {
            audios.push({ url: result.url, quality: "Audio", type: "audio" });
        } else if (result.type === "photo") {
            photos.push({ url: result.url, quality: "Photo", type: "photo" });
        } else {
            files.push({ url: result.url, quality: result.size || "Direct", type: "file" });
        }
    }

    if (result.download && !videos.length && !audios.length && !photos.length && !files.length) {
        files.push({ url: result.download, quality: "Direct Download", type: "file" });
    }

    return {
        title,
        thumbnail,
        platform,
        size: result.size,
        filename: result.filename,
        videos,
        audios,
        photos,
        files
    };
}

/**
 * Fungsi cerdas ekstraksi media:
 * 1. Auto-unshorten redirect links (vt.tiktok.com, youtu.be, fb.watch, dll.)
 * 2. Menghubungi API Vercel Serverless (dengan timeout cepat 7s)
 * 3. Fallback ke Scrapr lokal
 * 4. Fallback ke yt-dlp Engine lokal (1000+ platform)
 */
async function extractMedia(url) {
    let targetUrl = url.trim();

    // 0. Resolve Shortened URLs
    if (
        targetUrl.includes("vt.tiktok.com") ||
        targetUrl.includes("vm.tiktok.com") ||
        targetUrl.includes("youtu.be") ||
        targetUrl.includes("fb.watch") ||
        targetUrl.includes("t.co") ||
        targetUrl.includes("pin.it") ||
        targetUrl.includes("bit.ly") ||
        targetUrl.includes("instagram.com/share")
    ) {
        targetUrl = await resolveRedirect(targetUrl);
    }

    // 1. Coba tembak Cloud API Vercel (Timeout cepat 7 detik agar tidak menggantung)
    try {
        const res = await axios.get(`${VERCEL_API_ENDPOINT}?url=${encodeURIComponent(targetUrl)}`, {
            timeout: 7000
        });

        if (res.data && res.data.success) {
            const cleanVideos = (res.data.videos || []).filter(v => v.url && !v.url.includes("/api/hd") && !v.url.includes("snaptik.app/api/hd"));
            if (cleanVideos.length > 0 || (res.data.photos && res.data.photos.length > 0) || (res.data.audios && res.data.audios.length > 0)) {
                return {
                    ...res.data,
                    videos: cleanVideos.length > 0 ? cleanVideos : res.data.videos,
                    source: "Vercel Cloud Serverless"
                };
            }
        }
    } catch (_) {
        // Lanjutkan ke scraper lokal
    }

    // 2. Eksekusi scraper lokal (@alifxz/scrapr)
    try {
        const rawRes = await scrapr(targetUrl);
        if (rawRes && rawRes.status) {
            const normalized = normalizeResult(rawRes);
            if (normalized.videos.length > 0 || normalized.photos.length > 0 || normalized.audios.length > 0 || normalized.files.length > 0) {
                return {
                    ...normalized,
                    source: "Local Scrapr Engine"
                };
            }
        }
    } catch (_) {
        // Lanjutkan ke yt-dlp fallback
    }

    // 3. Fallback Utama: yt-dlp Engine Lokal (Mendukung ribuan platform & link dinamis)
    const ytdlpRes = await extractViaYtDlp(targetUrl);
    if (ytdlpRes && (ytdlpRes.videos.length > 0 || ytdlpRes.audios.length > 0)) {
        return ytdlpRes;
    }

    throw new Error("Gagal mengambil media dari tautan tersebut (pastikan link bersifat publik dan dapat diakses).");
}

module.exports = {
    scrapr,
    formatPlatformName,
    normalizeResult,
    extractMedia,
    resolveRedirect,
    extractViaYtDlp
};
