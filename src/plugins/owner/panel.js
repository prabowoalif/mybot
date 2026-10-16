const os = require("os");
const process = require("process");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "panel",
    alias: ["dashboard", "cp", "controlpanel", "ownerpanel"],
    category: "owner",
    desc: "Panel kontrol bot langsung dari WhatsApp (Khusus Owner)",
    isOwner: true,
    async execute({ m, args, prefix, command, sock, config, plugins }) {
        const subCommand = (args[0] || "").toLowerCase();

        // 1. Sub-command: Ganti Mode Bot (!panel mode public / !panel mode self)
        if (subCommand === "mode") {
            const targetMode = (args[1] || "").toLowerCase();
            if (targetMode === "public" || targetMode === "publik") {
                global.botMode = "public";
                return m.reply("✅ *Mode Bot Berhasil Diubah!*\n\n🌐 *Mode Saat Ini:* *PUBLIC*\n_Semua pengguna dan grup sekarang dapat menggunakan bot ini._");
            } else if (targetMode === "self" || targetMode === "pribadi") {
                global.botMode = "self";
                return m.reply("🔒 *Mode Bot Berhasil Diubah!*\n\n🛡️ *Mode Saat Ini:* *SELF*\n_Hanya Owner yang dapat merespons dan menggunakan perintah bot._");
            } else {
                return m.reply(`⚙️ *Pengaturan Mode Bot:*\n\n• *${prefix + command} mode public* ➔ Izinkan semua orang menggunakan bot.\n• *${prefix + command} mode self* ➔ Khusus Owner saja.`);
            }
        }

        // 2. Sub-command: Restart Bot (!panel restart)
        if (subCommand === "restart") {
            await m.reply("🔄 *Memulai ulang bot (Restarting)...*\n_Sistem akan menyala kembali secara otomatis dalam 2-3 detik._");
            setTimeout(() => {
                process.exit(0);
            }, 1000);
            return;
        }

        // 3. Sub-command: Status / Stats Sistem (!panel stats)
        if (subCommand === "stats" || subCommand === "status") {
            const memory = process.memoryUsage();
            const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
            const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
            const usedRss = (memory.rss / 1024 / 1024).toFixed(1);
            const usedHeap = (memory.heapUsed / 1024 / 1024).toFixed(1);

            const uptimeSec = Math.floor(process.uptime());
            const hours = Math.floor(uptimeSec / 3600);
            const minutes = Math.floor((uptimeSec % 3600) / 60);
            const seconds = uptimeSec % 60;

            const text = 
`╭───「 📊 *SERVER HARDWARE STATS* 」───
│ 💻 *Platform:* ${os.type()} ${os.arch()}
│ 🧠 *CPU Model:* ${os.cpus()[0]?.model || "Multi-Core CPU"}
│ ⚙️ *CPU Cores:* ${os.cpus().length} Cores
│ 📦 *Node.js:* ${process.version}
│ ⏱️ *Bot Uptime:* ${hours}j ${minutes}m ${seconds}d
│
│ 💾 *RAM Sistem:* ${(totalMem - freeMem).toFixed(2)} GB / ${totalMem} GB
│ 📈 *RAM Bot (RSS):* ${usedRss} MB
│ 📉 *Heap Memory:* ${usedHeap} MB
│ 🌐 *Mode Akses:* ${(global.botMode || "public").toUpperCase()}
│ 🔌 *Status WA:* Connected
╰─────────────────────────────`;
            return m.reply(text);
        }

        // Tampilan Utama Panel Kontrol Owner
        const uptimeSec = Math.floor(process.uptime());
        const hours = Math.floor(uptimeSec / 3600);
        const minutes = Math.floor((uptimeSec % 3600) / 60);
        const seconds = uptimeSec % 60;
        const memoryUsed = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
        const currentMode = (global.botMode || "public").toUpperCase();

        const panelMenu = 
`╭───「 👑 *OWNER CONTROL PANEL* 」───
│ 🤖 *Bot:* ${config.botName}
│ 👑 *Owner:* ${config.ownerName}
│ 🌐 *Mode Saat Ini:* *[ ${currentMode} ]*
│ ⏱️ *Aktif:* ${hours}j ${minutes}m ${seconds}d
│ 💾 *RAM Bot:* ${memoryUsed} MB
│ 📦 *Fitur Terpasang:* ${plugins.size} Perintah
╰─────────────────────────────

╭───「 🛠️ *KONTROL CEPAT WA* 」───
│
│ 1️⃣ *Ganti Mode Akses:*
│    • *${prefix}mode public*
│      ➔ Buka bot untuk semua orang & grup.
│    • *${prefix}mode self*
│      ➔ Kunci bot khusus Owner saja.
│
│ 2️⃣ *Pemeliharaan Sistem:*
│    • *${prefix}restart*
│      ➔ Muat ulang bot secara instan.
│    • *${prefix}stats*
│      ➔ Cek CPU, RAM, & Uptime detail.
│
│ 3️⃣ *Informasi Bot:*
│    • *${prefix}menu*
│      ➔ Buka Panel Menu Utama WhatsApp.
│
╰─────────────────────────────
_Gunakan perintah di atas langsung dari chat WhatsApp._`;

        const localMenuImg = path.join(__dirname, "../../assets/menu.jpg");
        if (fs.existsSync(localMenuImg)) {
            await sock.sendMessage(m.from, {
                image: fs.readFileSync(localMenuImg),
                caption: panelMenu,
                contextInfo: {
                    mentionedJid: [m.sender]
                }
            }, { quoted: m.raw });
        } else {
            await m.reply(panelMenu);
        }
    }
};
