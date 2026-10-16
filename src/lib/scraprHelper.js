const axios = require("axios");
const scrapr = require("./scrapr");

const VERCEL_API_ENDPOINT = "https://telegram-downloader-bot-puce.vercel.app/api/download";

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
 * 1. Menghubungi API Vercel Serverless (telegram-downloader-bot)
 * 2. Jika Vercel offline/lambat, otomatis dialihkan ke scraper lokal
 */
async function extractMedia(url) {
    // Coba tembak Cloud API Vercel
    try {
        const res = await axios.get(`${VERCEL_API_ENDPOINT}?url=${encodeURIComponent(url)}`, {
            timeout: 25000
        });

        if (res.data && res.data.success) {
            const cleanVideos = (res.data.videos || []).filter(v => v.url && !v.url.includes("/api/hd") && !v.url.includes("snaptik.app/api/hd"));
            return {
                ...res.data,
                videos: cleanVideos.length > 0 ? cleanVideos : res.data.videos,
                source: "Vercel Cloud Serverless"
            };
        }
    } catch (_) {
        // Fallback ke scraper lokal
    }

    // Eksekusi lokal jika Vercel tidak merespons
    const rawRes = await scrapr(url);
    if (!rawRes || !rawRes.status) {
        throw new Error(rawRes?.message || "Gagal mengambil media dari tautan tersebut.");
    }

    return {
        ...normalizeResult(rawRes),
        source: "Local Engine"
    };
}

module.exports = {
    scrapr,
    formatPlatformName,
    normalizeResult,
    extractMedia
};
