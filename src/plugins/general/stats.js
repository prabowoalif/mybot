const os = require("os");
const process = require("process");

module.exports = {
    name: "stats",
    alias: ["status", "botstatus", "server"],
    category: "general",
    desc: "Menampilkan statistik performa server dan bot di WhatsApp",
    async execute({ m, config, plugins }) {
        const start = Date.now();
        const memory = process.memoryUsage();
        const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
        const usedMem = (totalMem - freeMem).toFixed(2);
        const rssMB = (memory.rss / 1024 / 1024).toFixed(1);
        const heapMB = (memory.heapUsed / 1024 / 1024).toFixed(1);

        const uptimeSec = Math.floor(process.uptime());
        const days = Math.floor(uptimeSec / 86400);
        const hours = Math.floor((uptimeSec % 86400) / 3600);
        const minutes = Math.floor((uptimeSec % 3600) / 60);
        const seconds = uptimeSec % 60;
        const uptimeStr = `${days > 0 ? `${days}h ` : ""}${hours}j ${minutes}m ${seconds}d`;

        const pingMs = Date.now() - start;

        const text =
`╭───「 📊 *PANEL STATISTIK BOT* 」───
│ 🤖 *Bot:* ${config.botName}
│ 👑 *Owner:* ${config.ownerName}
│ 🌐 *Mode:* ${(global.botMode || "public").toUpperCase()}
│ ⚡ *Respons:* ${pingMs} ms
│ ⏱️ *Aktif:* ${uptimeStr}
│
│ 💻 *OS:* ${os.type()} ${os.arch()}
│ 🧠 *CPU:* ${os.cpus()[0]?.model?.trim().slice(0, 25) || "Multi-Core"} (${os.cpus().length} Cores)
│ 📦 *Node.js:* ${process.version}
│ 💾 *RAM Server:* ${usedMem} GB / ${totalMem} GB
│ 📈 *RAM Bot:* ${rssMB} MB (Heap: ${heapMB} MB)
│ 📁 *Fitur:* ${plugins.size} Command Aktif
╰─────────────────────────────`;

        await m.reply(text);
    }
};
