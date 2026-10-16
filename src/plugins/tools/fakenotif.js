let Resvg;
try {
    const resvgModule = require("@resvg/resvg-js");
    Resvg = resvgModule.Resvg;
} catch (_) {
    Resvg = null;
}

function escapeXml(unsafe) {
    if (!unsafe) return "";
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function generateIosNotifSvg({ title, message, timeStr, dateStr }) {
    const width = 800;
    const height = 480;

    return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#1c1c1e" />
                <stop offset="50%" stop-color="#0a0a0c" />
                <stop offset="100%" stop-color="#141416" />
            </linearGradient>
            <linearGradient id="glass" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#3a3a3c" stop-opacity="0.85" />
                <stop offset="100%" stop-color="#2c2c2e" stop-opacity="0.75" />
            </linearGradient>
            <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.6" />
            </filter>
        </defs>

        <!-- Background Wallpaper Lockscreen -->
        <rect width="${width}" height="${height}" fill="url(#bg)" />

        <!-- Header: Lock Icon & Time -->
        <g fill="#f2f2f7" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif">
            <!-- Tanggal -->
            <text x="400" y="80" text-anchor="middle" font-size="22" font-weight="500" fill="#ebebf5" opacity="0.8">${escapeXml(dateStr)}</text>
            <!-- Jam Besar iOS -->
            <text x="400" y="195" text-anchor="middle" font-size="108" font-weight="700" letter-spacing="-1">${escapeXml(timeStr)}</text>
        </g>

        <!-- Notification Card (Glassmorphism) -->
        <g transform="translate(60, 260)" filter="url(#shadow)">
            <!-- Bubble Box -->
            <rect width="680" height="150" rx="34" fill="url(#glass)" stroke="#ffffff" stroke-opacity="0.15" stroke-width="1.2" />

            <!-- App Icon (WhatsApp Green) -->
            <rect x="26" y="24" width="46" height="46" rx="12" fill="#25D366" />
            <!-- WhatsApp Phone Symbol -->
            <path d="M 49 37 C 43 33 39 37 38 39 C 36 43 41 51 46 54 C 50 56 53 53 55 51 C 56 49 54 48 52 47 C 50 46 48 48 47 48 C 45 48 42 45 41 43 C 41 42 42 41 44 40 C 45 39 49 40 49 37 Z" fill="#ffffff" />

            <!-- App Name & Time Label -->
            <text x="86" y="44" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="600" fill="#8e8e93" letter-spacing="0.5">WHATSAPP</text>
            <text x="640" y="44" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="400" fill="#8e8e93">baru saja</text>

            <!-- Sender / Title -->
            <text x="86" y="74" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="21" font-weight="700" fill="#ffffff">${escapeXml(title)}</text>

            <!-- Message Body -->
            <text x="86" y="104" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="400" fill="#ebebf5" opacity="0.9">${escapeXml(message)}</text>
        </g>
    </svg>`;
}

module.exports = {
    name: "fakenotif",
    alias: ["fakephone", "fakepone", "notifwa"],
    category: "tools",
    desc: "Buat gambar meme notifikasi iPhone palsu",
    async execute({ m, text, prefix, command, sock }) {
        if (!text || !text.includes("|")) {
            return m.reply(
                `⚠️ *Format Salah!*\n\n` +
                `Gunakan tanda pemisah \`|\` antara nama dan pesan:\n` +
                `Contoh:\n*${prefix + command}* Ayang 💕 | Kamu lagi sama siapa sekarang? Aku di depan rumah.`
            );
        }

        const [title, ...msgParts] = text.split("|");
        const senderName = title.trim();
        const messageText = msgParts.join("|").trim();

        if (!senderName || !messageText) {
            return m.reply("⚠️ Nama dan pesan tidak boleh kosong!");
        }

        if (!Resvg) {
            return m.reply("⚠️ Engine render gambar (Resvg) belum terpasang di runtime sistem.");
        }

        const waitMsg = await m.reply("⏳ *Sedang merender tampilan notifikasi iPhone...*");

        try {
            const now = new Date();
            const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
            const dateStr = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });

            const svg = generateIosNotifSvg({
                title: senderName,
                message: messageText.length > 55 ? messageText.slice(0, 52) + "..." : messageText,
                timeStr,
                dateStr
            });

            const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 800 } });
            const pngBuffer = resvg.render().asPng();

            await sock.sendMessage(m.from, {
                image: pngBuffer,
                caption: `📱 *Fake iPhone Notification*\n👤 *Dari:* ${senderName}`
            }, { quoted: m.raw });

            if (waitMsg?.delete) {
                await waitMsg.delete();
            }
        } catch (err) {
            const errMsg = `❌ Gagal membuat notifikasi: ${err.message}`;
            if (waitMsg?.edit) {
                await waitMsg.edit(errMsg);
            } else {
                await m.reply(errMsg);
            }
        }
    }
};
