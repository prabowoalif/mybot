const axios = require("axios");
const crypto = require("crypto");
let HttpsProxyAgent;
try {
  HttpsProxyAgent = require("https-proxy-agent").HttpsProxyAgent;
} catch (_) {}

const SAVETUBE_KEY = Buffer.from("C5D58EF67A7584E4A29F6C35BBC4EB12", "hex");

function extractVideoId(url) {
  const regex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function getAxiosConfig(extraHeaders = {}) {
  const config = {
    headers: { ...extraHeaders },
  };
  const proxyUrl = process.env.PROXY_URL;
  if (proxyUrl && HttpsProxyAgent) {
    config.httpsAgent = new HttpsProxyAgent(proxyUrl);
    config.proxy = false;
  }
  return config;
}

async function fetchOembed(videoId) {
  try {
    const res = await axios.get(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      getAxiosConfig({ timeout: 5000 }),
    );
    return {
      title: res.data?.title || "YouTube Video",
      thumbnail:
        res.data?.thumbnail_url ||
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  } catch (_) {
    return {
      title: "YouTube Video",
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  }
}

function decodeSavetube(enc) {
  if (!enc || typeof enc !== "string") return null;
  try {
    const data = Buffer.from(enc, "base64");
    const iv = data.subarray(0, 16);
    const content = data.subarray(16);
    const decipher = crypto.createDecipheriv("aes-128-cbc", SAVETUBE_KEY, iv);
    const decrypted = Buffer.concat([decipher.update(content), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8"));
  } catch (_) {
    return null;
  }
}

/**
 * Fallback 1: SaveTube Engine (Direct high-speed CDN, resilient against cloud datacenter blocks)
 */
async function convertViaSavetube(canonicalUrl, format, quality) {
  try {
    const axiosCfg = getAxiosConfig();
    const cdnRes = await axios.get("https://media.savetube.vip/api/random-cdn", {
      ...axiosCfg,
      timeout: 5000,
    });
    const cdn = cdnRes.data?.cdn;
    if (!cdn) return null;

    const infoRes = await axios.post(
      `https://${cdn}/v2/info`,
      { url: canonicalUrl },
      {
        ...axiosCfg,
        headers: {
          ...(axiosCfg.headers || {}),
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          Referer: "https://save-tube.com/",
        },
        timeout: 8000,
      },
    );

    if (!infoRes.data?.status || !infoRes.data?.data) return null;
    const info = decodeSavetube(infoRes.data.data);
    if (!info || !info.key) return null;

    const downloadType = format === "mp3" ? "audio" : "video";
    const cleanQuality = String(quality || (format === "mp3" ? "128" : "720")).replace(/[^0-9]/g, "") || "720";

    const dlRes = await axios.post(
      `https://${cdn}/download`,
      {
        downloadType,
        quality: cleanQuality,
        key: info.key,
      },
      {
        ...axiosCfg,
        headers: {
          ...(axiosCfg.headers || {}),
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          Referer: "https://save-tube.com/",
        },
        timeout: 10000,
      },
    );

    if (dlRes.data?.status && dlRes.data?.data?.downloadUrl) {
      return {
        type: downloadType,
        quality: `${cleanQuality}${downloadType === "audio" ? "kbps" : "p"}`,
        url: dlRes.data.data.downloadUrl,
      };
    }
  } catch (_) {}
  return null;
}

/**
 * Fallback 2: Community Downloader REST APIs (Ryzendesu, Vreden, Siputzx)
 */
async function convertViaCommunityApis(canonicalUrl, format) {
  const isAudio = format === "mp3" || format === "audio";
  const epType = isAudio ? "ytmp3" : "ytmp4";

  const endpoints = [
    `https://api.siputzx.my.id/api/d/${epType}?url=${encodeURIComponent(canonicalUrl)}`,
    `https://api.vreden.my.id/api/${epType}?url=${encodeURIComponent(canonicalUrl)}`,
    `https://api.ryzendesu.vip/api/downloader/${epType}?url=${encodeURIComponent(canonicalUrl)}`,
  ];

  const axiosCfg = getAxiosConfig();
  for (const ep of endpoints) {
    try {
      const res = await axios.get(ep, { ...axiosCfg, timeout: 8000 });
      const data = res.data;
      if (data && (data.status === true || data.status === "success" || data.status === 200)) {
        const dlUrl =
          data.data?.downloadUrl ||
          data.data?.url ||
          data.result?.url ||
          data.result?.download ||
          data.download?.url ||
          data.url;
        if (dlUrl && typeof dlUrl === "string" && dlUrl.startsWith("http")) {
          return {
            type: isAudio ? "audio" : "video",
            quality: data.data?.quality || data.result?.quality || (isAudio ? "128kbps" : "720p"),
            url: dlUrl,
          };
        }
      }
    } catch (_) {}
  }
  return null;
}

/**
 * Primary: convert1s with fast polling (reduced attempts for Vercel Serverless timeout safety)
 */
async function convertViaConvert1s(canonicalUrl, format, quality) {
  try {
    const axiosCfg = getAxiosConfig({
      Origin: "https://media.ytmp3.gg",
      Referer: "https://media.ytmp3.gg/",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Content-Type": "application/json",
    });

    const res = await axios.post(
      "https://hub.convert1s.com/api/download",
      {
        url: canonicalUrl,
        os: "macos",
        output: {
          type: format === "mp4" ? "video" : "audio",
          format,
          quality: quality || "720p",
        },
        audio: { bitrate: "128k" },
      },
      { ...axiosCfg, timeout: 8000 },
    );

    const conv = res.data;
    if (!conv || conv.error || !conv.statusUrl) return null;

    let downloadUrl = null;
    let attempts = 0;
    // Reduced polling: max 4 attempts x 1000ms = max 4s to prevent Serverless timeout
    while (!downloadUrl && attempts < 4) {
      await new Promise((r) => setTimeout(r, 1000));
      const poll = await axios.get(conv.statusUrl, { ...axiosCfg, timeout: 5000 });
      attempts++;
      if (poll.data?.status === "completed" && poll.data?.downloadUrl) {
        downloadUrl = poll.data.downloadUrl;
        break;
      }
      if (poll.data?.status === "error" || poll.data?.status === "failed") break;
    }

    return downloadUrl
      ? {
          type: format === "mp3" ? "audio" : "video",
          quality: conv.selectedQuality || quality || "720p",
          url: downloadUrl,
        }
      : null;
  } catch (_) {
    return null;
  }
}

async function scrape(url, format = "mp4") {
  try {
    const videoId = extractVideoId(url);
    if (!videoId) throw new Error("Invalid YouTube URL");

    const meta = await fetchOembed(videoId);
    const downloads = [];
    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const targetQuality = format === "mp3" ? "" : "720p";

    // Tier 1: Try modern fast converter (convert1s) with fast polling
    const primary = await convertViaConvert1s(
      canonicalUrl,
      format,
      targetQuality,
    );
    if (primary) downloads.push(primary);

    // Tier 2: Fallback to SaveTube / Vreden Engine (anti-cloud-block direct CDN)
    if (downloads.length === 0) {
      const savetube = await convertViaSavetube(
        canonicalUrl,
        format,
        targetQuality,
      );
      if (savetube) downloads.push(savetube);
    }

    // Tier 3: Fallback to Community APIs (Ryzendesu, Vreden, Siputzx)
    if (downloads.length === 0) {
      const commApi = await convertViaCommunityApis(
        canonicalUrl,
        format,
      );
      if (commApi) downloads.push(commApi);
    }

    // Tier 4: Fallback to legacy ytmp3.mobi / ymcdn
    if (downloads.length === 0) {
      const axiosCfg = getAxiosConfig({
        Origin: "https://ytmp3.mobi",
        Referer: "https://ytmp3.mobi/en8/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
        Accept: "*/*",
      });
      const client = axios.create({ ...axiosCfg, timeout: 8000 });

      const { data: initData } = await client.get(
        `https://a.ymcdn.org/api/v1/init?p=y&23=1llum1n471&_=${Math.random()}`,
      );
      if (initData?.convertURL) {
        let { data: convData } = await client.get(
          `${initData.convertURL}&v=${videoId}&f=${format}&_=${Math.random()}`,
        );

        while (convData && convData.redirect > 0 && convData.redirectURL) {
          const redirRes = await client.get(
            `${convData.redirectURL}&v=${videoId}&f=${format}&_=${Math.random()}`,
          );
          convData = redirRes.data;
        }

        if (convData && !convData.error) {
          let progress = 0;
          let finalUrl = convData.downloadURL;
          let attempts = 0;
          while (progress < 3 && attempts < 6) {
            await new Promise((r) => setTimeout(r, 1200));
            const { data: progData } = await client.get(
              `${convData.progressURL}&_=${Math.random()}`,
            );
            progress = progData?.progress ?? 0;
            if (progData?.downloadURL) finalUrl = progData.downloadURL;
            if (progress === 4) break;
            attempts++;
          }
          if (finalUrl && progress >= 3) {
            downloads.push({
              type: format === "mp3" ? "audio" : "video",
              quality: format === "mp3" ? "320kbps" : "720p",
              url: finalUrl.startsWith("//") ? `https:${finalUrl}` : finalUrl,
            });
          }
        }
      }
    }

    if (downloads.length === 0) {
      throw new Error("Unable to resolve YouTube download stream across all scrapers and fallbacks.");
    }

    return {
      status: true,
      result: {
        title: meta.title,
        thumbnail: meta.thumbnail,
        type: format === "mp3" ? "audio" : "video",
        downloads,
      },
    };
  } catch (error) {
    return {
      status: false,
      message: error.message,
    };
  }
}

module.exports = { scrape, extractVideoId };
