const downloadPlugin = require("./download");

module.exports = {
    name: "instagram",
    alias: ["ig", "reels", "igdl"],
    category: "downloader",
    desc: "Unduh video Reels & postingan Instagram",
    async execute(ctx) {
        return downloadPlugin.execute(ctx);
    }
};
