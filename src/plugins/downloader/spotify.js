const downloadPlugin = require("./download");

module.exports = {
    name: "spotify",
    alias: ["sp", "spotdl", "lagu"],
    category: "downloader",
    desc: "Unduh lagu dan musik dari Spotify",
    async execute(ctx) {
        return downloadPlugin.execute(ctx);
    }
};
