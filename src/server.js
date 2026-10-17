const express = require("express");
const os = require("os");
const path = require("path");
const fs = require("fs");
const config = require("./config");
const { plugins } = require("./lib/loader");
const { getSocket } = require("./connection");
const { log } = require("./lib/print");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "150mb" }));
app.use(express.urlencoded({ extended: true, limit: "150mb" }));

// Endpoint Webhook untuk menerima kiriman video dari ALIFxz Studio
app.post("/kirim-video", async (req, res) => {
    try {
        const sock = getSocket();
        if (!sock) {
            return res.status(503).json({ success: false, error: "Bot WhatsApp belum terhubung / login." });
        }

        const target = req.body.target || config.ownerNumber[0];
        const caption = req.body.caption || "Video dari ALIFxz Studio";
        const filePath = req.body.filePath || req.body.video_path;

        if (!target) {
            return res.status(400).json({ success: false, error: "Nomor target WhatsApp tidak diberikan." });
        }

        let cleanNumber = target.replace(/[^0-9]/g, "");
        if (cleanNumber.startsWith("0")) {
            cleanNumber = "62" + cleanNumber.slice(1);
        }
        const jid = cleanNumber + "@s.whatsapp.net";

        let videoPayload;
        if (filePath && fs.existsSync(filePath)) {
            videoPayload = fs.readFileSync(filePath);
        } else if (req.body.video_base64) {
            videoPayload = Buffer.from(req.body.video_base64, "base64");
        } else {
            return res.status(400).json({ success: false, error: `File video tidak ditemukan di: ${filePath}` });
        }

        await sock.sendMessage(jid, {
            video: videoPayload,
            caption: caption,
            mimetype: "video/mp4"
        });

        res.json({ success: true, message: `Video berhasil dikirim ke ${cleanNumber}` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// API Status
app.get("/api/stats", (req, res) => {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const memoryUsage = process.memoryUsage();
    const ramUsedMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(1);
    const ramTotalGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);

    // Hitung unik plugins
    const visited = new Set();
    const commandList = [];
    for (const [_, plugin] of plugins) {
        if (visited.has(plugin.name)) continue;
        visited.add(plugin.name);
        commandList.push({
            name: plugin.name,
            alias: plugin.alias || [],
            category: plugin.category || "general",
            desc: plugin.desc || "-"
        });
    }

    res.json({
        botName: config.botName,
        botNumber: config.phoneNumber,
        ownerNumber: config.ownerNumber[0] || "-",
        uptime: `${hours}j ${minutes}m ${seconds}d`,
        ramUsed: `${ramUsedMB} MB`,
        ramTotal: `${ramTotalGB} GB`,
        platform: `${os.platform()} (${os.arch()})`,
        prefix: config.prefix,
        totalCommands: commandList.length,
        commands: commandList
    });
});

// Endpoint gambar QR jika ada
app.get("/qr", (req, res) => {
    const qrPath = path.resolve("./qr.png");
    if (fs.existsSync(qrPath)) {
        res.sendFile(qrPath);
    } else {
        res.status(404).send("QR Code tidak ditemukan atau bot sudah terhubung.");
    }
});

// Tampilan Web Dashboard yang Keren
app.get("/", (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${config.botName} - Control Dashboard</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
            body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0b0f19; color: #f3f4f6; }
            .glass { background: rgba(17, 24, 39, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); }
            .glow-cyan { box-shadow: 0 0 25px rgba(6, 182, 212, 0.25); }
        </style>
    </head>
    <body class="min-h-screen p-4 md:p-8">
        <div class="max-w-7xl mx-auto space-y-6">
            <!-- Header Top Bar -->
            <header class="glass rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 glow-cyan">
                <div class="flex items-center gap-4">
                    <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white text-2xl shadow-lg">
                        <i class="fa-solid fa-robot"></i>
                    </div>
                    <div>
                        <h1 class="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">${config.botName}</h1>
                        <p class="text-gray-400 text-sm">WhatsApp Autonomous System • v1.0.0</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <div class="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold">
                        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        SYSTEM ACTIVE
                    </div>
                    <span id="liveClock" class="px-4 py-2 rounded-xl bg-gray-800/80 text-gray-300 text-sm font-mono border border-gray-700">--:--:--</span>
                </div>
            </header>

            <!-- Stats Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="glass rounded-2xl p-5 hover:border-cyan-500/30 transition-all">
                    <div class="flex items-center justify-between text-gray-400 mb-3">
                        <span class="text-sm font-medium">WhatsApp Bot</span>
                        <i class="fa-brands fa-whatsapp text-green-400 text-lg"></i>
                    </div>
                    <p class="text-xl font-bold text-white font-mono" id="statBotNumber">+${config.phoneNumber}</p>
                    <p class="text-xs text-gray-400 mt-1">Multi-Device Socket</p>
                </div>

                <div class="glass rounded-2xl p-5 hover:border-blue-500/30 transition-all">
                    <div class="flex items-center justify-between text-gray-400 mb-3">
                        <span class="text-sm font-medium">Owner Controller</span>
                        <i class="fa-solid fa-user-shield text-blue-400 text-lg"></i>
                    </div>
                    <p class="text-xl font-bold text-white font-mono" id="statOwnerNumber">+${config.ownerNumber[0] || '-'}</p>
                    <p class="text-xs text-gray-400 mt-1">Master Administrator</p>
                </div>

                <div class="glass rounded-2xl p-5 hover:border-purple-500/30 transition-all">
                    <div class="flex items-center justify-between text-gray-400 mb-3">
                        <span class="text-sm font-medium">RAM Allocation</span>
                        <i class="fa-solid fa-microchip text-purple-400 text-lg"></i>
                    </div>
                    <p class="text-xl font-bold text-white font-mono" id="statRam">-</p>
                    <p class="text-xs text-emerald-400 mt-1">Sangat Ringan (&lt;100MB)</p>
                </div>

                <div class="glass rounded-2xl p-5 hover:border-amber-500/30 transition-all">
                    <div class="flex items-center justify-between text-gray-400 mb-3">
                        <span class="text-sm font-medium">System Uptime</span>
                        <i class="fa-solid fa-stopwatch text-amber-400 text-lg"></i>
                    </div>
                    <p class="text-xl font-bold text-white font-mono" id="statUptime">-</p>
                    <p class="text-xs text-gray-400 mt-1" id="statPlatform">Node.js Engine</p>
                </div>
            </div>

            <!-- Main Feature Tabs & Command List -->
            <div class="glass rounded-2xl p-6">
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 class="text-lg font-bold text-white flex items-center gap-2">
                            <i class="fa-solid fa-puzzle-piece text-cyan-400"></i>
                            Daftar Fitur & Plugin Aktif
                            <span id="badgeTotalCmd" class="ml-2 px-2.5 py-0.5 rounded-full text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">0</span>
                        </h2>
                        <p class="text-sm text-gray-400">Seluruh fitur modular yang terdaftar secara real-time</p>
                    </div>
                    <!-- Search Input -->
                    <input type="text" id="searchCmd" placeholder="Cari perintah..." class="px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-sm text-white focus:outline-none focus:border-cyan-500 w-full sm:w-64">
                </div>

                <!-- Command Cards Grid -->
                <div id="commandContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <!-- Populated via Javascript -->
                </div>
            </div>
        </div>

        <script>
            function updateClock() {
                const now = new Date();
                document.getElementById('liveClock').innerText = now.toLocaleTimeString('id-ID');
            }
            setInterval(updateClock, 1000);
            updateClock();

            let allCommands = [];

            async function fetchStats() {
                try {
                    const res = await fetch('/api/stats');
                    const data = await res.json();
                    document.getElementById('statRam').innerText = data.ramUsed + ' / ' + data.ramTotal;
                    document.getElementById('statUptime').innerText = data.uptime;
                    document.getElementById('statPlatform').innerText = data.platform;
                    document.getElementById('badgeTotalCmd').innerText = data.totalCommands + ' Aktif';
                    allCommands = data.commands;
                    renderCommands(allCommands);
                } catch(e) {
                    console.error("Gagal mengambil data stats", e);
                }
            }

            function renderCommands(list) {
                const container = document.getElementById('commandContainer');
                container.innerHTML = '';
                list.forEach(cmd => {
                    const aliases = cmd.alias && cmd.alias.length ? cmd.alias.map(a => '<span class="px-1.5 py-0.5 rounded bg-gray-800 text-xs text-gray-400 font-mono">!' + a + '</span>').join(' ') : '';
                    const card = document.createElement('div');
                    card.className = "p-4 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-gray-700 transition-all flex flex-col justify-between";
                    card.innerHTML = \`
                        <div>
                            <div class="flex items-center justify-between gap-2 mb-2">
                                <span class="font-bold text-cyan-400 font-mono text-base">!\${cmd.name}</span>
                                <span class="text-xs uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">\${cmd.category}</span>
                            </div>
                            <p class="text-sm text-gray-300 mb-3">\${cmd.desc}</p>
                        </div>
                        <div class="pt-2 border-t border-gray-800/80 flex items-center gap-1.5 flex-wrap">
                            <span class="text-xs text-gray-500">Alias:</span>
                            \${aliases || '<span class="text-xs text-gray-600">-</span>'}
                        </div>
                    \`;
                    container.appendChild(card);
                });
            }

            document.getElementById('searchCmd').addEventListener('input', (e) => {
                const q = e.target.value.toLowerCase();
                const filtered = allCommands.filter(c => c.name.includes(q) || (c.desc && c.desc.toLowerCase().includes(q)) || (c.category && c.category.includes(q)));
                renderCommands(filtered);
            });

            fetchStats();
            setInterval(fetchStats, 5000);
        </script>
    </body>
    </html>
    `;
    res.send(html);
});

function startServer() {
    app.listen(PORT, () => {
        log.success(`Web Panel Dashboard aktif di: http://localhost:${PORT}`);
    });
}

module.exports = { startServer };
