const downloadPlugin = require("./download");

module.exports = {
    name: "tiktok",
    alias: ["tt", "ttdl", "vt"],
    category: "downloader",
    desc: "Unduh video TikTok tanpa watermark",
    async execute(ctx) {
        return downloadPlugin.execute(ctx);
    }
};
