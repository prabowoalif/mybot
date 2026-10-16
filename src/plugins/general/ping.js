const os = require("os");

module.exports = {
    name: "ping",
    alias: ["speed", "p"],
    category: "general",
    desc: "Cek responsivitas dan kecepatan bot",
    async execute({ m }) {
        const start = Date.now();
        const uptime = process.uptime();

        // Hitung durasi aktif
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        const uptimeStr = `${hours}j ${minutes}m ${seconds}d`;

        // Penggunaan memori RAM
        const ramUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const ramTotal = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);

        const latency = Date.now() - start;

        const text = `🏓 *P O N G !*\n\n` +
            `• *Kecepatan:* ${latency} ms\n` +
            `• *Uptime:* ${uptimeStr}\n` +
            `• *RAM Bot:* ${ramUsed} MB / ${ramTotal} GB\n` +
            `• *Platform:* ${os.platform()} (${os.arch()})`;

        await m.reply(text);
    }
};
