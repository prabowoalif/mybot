const downloadPlugin = require("./download");

module.exports = {
    name: "youtube",
    alias: ["yt", "ytmp4", "ytmp3"],
    category: "downloader",
    desc: "Unduh video atau audio dari YouTube",
    async execute(ctx) {
        return downloadPlugin.execute(ctx);
    }
};
