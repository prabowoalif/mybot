const fs = require("fs");
const path = require("path");
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

function wrapText(text, maxCharsPerLine = 34) {
    const words = text.split(" ");
    const lines = [];
    let currentLine = "";

    for (const w of words) {
        if ((currentLine + " " + w).trim().length <= maxCharsPerLine) {
            currentLine = (currentLine + " " + w).trim();
        } else {
            if (currentLine) lines.push(currentLine);
            currentLine = w;
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
}

// Convert emoji file to base64
function getEmojiBase64(name) {
    const p = path.join(__dirname, "../../assets/emojis", `${name}.png`);
    if (fs.existsSync(p)) {
        return `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`;
    }
    return "";
}

function generateIosLongpressChat({ message, timeStr }) {
    const width = 720;
    const height = 1280;

    const emojiThumb = getEmojiBase64("thumb");
    const emojiHeart = getEmojiBase64("heart");
    const emojiJoy = getEmojiBase64("joy");
    const emojiSurprised = getEmojiBase64("surprised");
    const emojiCry = getEmojiBase64("cry");
    const emojiPray = getEmojiBase64("pray");

    const messageLines = wrapText(message, 32);
    const lineSpacing = 32;
    const textBlockHeight = messageLines.length * lineSpacing;
    const bubbleHeight = Math.max(90, 48 + textBlockHeight);
    
    // Bubble Width calculation
    const longestLineLength = Math.max(...messageLines.map(l => l.length));
    const bubbleWidth = Math.min(540, Math.max(340, longestLineLength * 15.5 + 85));

    // Positions
    const bubbleX = 40;
    const bubbleY = 460;
    const reactionY = bubbleY - 80;
    const menuY = bubbleY + bubbleHeight + 16;
    const menuWidth = 420;

    const textSvgLines = messageLines.map((line, idx) => {
        return `<text x="22" y="${36 + (idx * lineSpacing)}" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="400" letter-spacing="-0.2">${escapeXml(line)}</text>`;
    }).join("\n");

    return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <!-- Heavy Dark Bokeh Background Blur -->
            <filter id="bgBlur" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="16" />
            </filter>

            <!-- Drop Shadow for floating iOS elements -->
            <filter id="popShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#000000" flood-opacity="0.75" />
            </filter>
        </defs>

        <!-- Base Dark Chat Wallpaper -->
        <rect width="${width}" height="${height}" fill="#0b141a" />

        <!-- ================= 1. BLURRED CHAT BACKGROUND LAYER ================= -->
        <g filter="url(#bgBlur)" opacity="0.65">
            <!-- Top Chat bubbles (Blurred) -->
            <rect x="360" y="80" width="320" height="90" rx="20" fill="#005c4b" />
            <rect x="50" y="210" width="380" height="85" rx="20" fill="#202c33" />
            <rect x="280" y="320" width="400" height="95" rx="20" fill="#005c4b" />
            
            <!-- Lower Chat bubbles (Blurred) -->
            <rect x="340" y="580" width="340" height="90" rx="20" fill="#005c4b" />
            <rect x="50" y="720" width="390" height="85" rx="20" fill="#202c33" />
            <rect x="300" y="860" width="380" height="95" rx="20" fill="#005c4b" />
            <rect x="50" y="990" width="350" height="85" rx="20" fill="#202c33" />
        </g>

        <!-- Dimming Overlay (Focus Lighting) -->
        <rect width="${width}" height="${height}" fill="#000000" opacity="0.55" />

        <!-- ================= 2. EMOJI REACTION PILL (ABOVE BUBBLE) ================= -->
        <g transform="translate(${bubbleX}, ${reactionY})" filter="url(#popShadow)">
            <!-- Pill background -->
            <rect width="470" height="66" rx="33" fill="#212426" stroke="#ffffff" stroke-opacity="0.12" stroke-width="0.8" />
            
            <!-- Emojis -->
            <image href="${emojiThumb}" x="22" y="14" width="38" height="38" />
            <image href="${emojiHeart}" x="84" y="14" width="38" height="38" />
            <image href="${emojiJoy}" x="146" y="14" width="38" height="38" />
            <image href="${emojiSurprised}" x="208" y="14" width="38" height="38" />
            <image href="${emojiCry}" x="270" y="14" width="38" height="38" />
            <image href="${emojiPray}" x="332" y="14" width="38" height="38" />

            <!-- Plus Icon Button -->
            <circle cx="420" cy="33" r="18" fill="#323639" />
            <path d="M 412 33 L 428 33 M 420 25 L 420 41" stroke="#8e8e93" stroke-width="2.5" stroke-linecap="round" />
        </g>

        <!-- ================= 3. FOCUSED INCOMING CHAT BUBBLE ================= -->
        <g transform="translate(${bubbleX}, ${bubbleY})" filter="url(#popShadow)">
            <!-- Left tail corner (iOS authentic bottom-left tail) -->
            <path d="M 0 ${bubbleHeight} C 10 ${bubbleHeight} 14 ${bubbleHeight - 6} 14 ${bubbleHeight - 16} L 14 ${bubbleHeight} Z" fill="#202c33" />

            <!-- Main Bubble Rect -->
            <rect width="${bubbleWidth}" height="${bubbleHeight}" rx="20" fill="#202c33" stroke="#ffffff" stroke-opacity="0.08" stroke-width="0.8" />

            <!-- Message Lines -->
            ${textSvgLines}

            <!-- Time Stamp (bottom right inside bubble) -->
            <text x="${bubbleWidth - 18}" y="${bubbleHeight - 14}" text-anchor="end" fill="#8e8e93" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="400">${escapeXml(timeStr)}</text>
        </g>

        <!-- ================= 4. iOS CONTEXT ACTION MENU ================= -->
        <g transform="translate(${bubbleX}, ${menuY})" filter="url(#popShadow)">
            <!-- Context Menu Background Card -->
            <rect width="${menuWidth}" height="378" rx="20" fill="#212426" stroke="#ffffff" stroke-opacity="0.1" stroke-width="0.8" />

            <!-- Helper font settings -->
            <g font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif" font-size="19" font-weight="400">
                
                <!-- 1. Beri Bintang -->
                <text x="26" y="36" fill="#ffffff">Beri Bintang</text>
                <!-- Star icon -->
                <path d="M 374 26 L 377 34 L 386 34 L 379 39 L 381 48 L 374 43 L 367 48 L 369 39 L 362 34 L 371 34 Z" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round" />
                <line x1="26" y1="54" x2="394" y2="54" stroke="#2c3033" stroke-width="1" />

                <!-- 2. Balas -->
                <text x="26" y="90" fill="#ffffff">Balas</text>
                <!-- Reply Arrow icon -->
                <path d="M 384 76 C 378 76 372 79 370 85 L 366 85 M 371 80 L 366 85 L 371 90" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                <line x1="26" y1="108" x2="394" y2="108" stroke="#2c3033" stroke-width="1" />

                <!-- 3. Teruskan -->
                <text x="26" y="144" fill="#ffffff">Teruskan</text>
                <!-- Forward Arrow icon -->
                <path d="M 366 130 C 372 130 378 133 380 139 L 384 139 M 379 134 L 384 139 L 379 144" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                <line x1="26" y1="162" x2="394" y2="162" stroke="#2c3033" stroke-width="1" />

                <!-- 4. Salin -->
                <text x="26" y="198" fill="#ffffff">Salin</text>
                <!-- Copy Sheet icon -->
                <rect x="367" y="184" width="12" height="15" rx="3" fill="none" stroke="#ffffff" stroke-width="1.8" />
                <rect x="373" y="189" width="12" height="15" rx="3" fill="none" stroke="#ffffff" stroke-width="1.8" />
                <line x1="26" y1="216" x2="394" y2="216" stroke="#2c3033" stroke-width="1" />

                <!-- 5. Sematkan -->
                <text x="26" y="252" fill="#ffffff">Sematkan</text>
                <!-- Pin icon -->
                <path d="M 374 238 L 378 242 L 372 248 L 378 252 L 368 253 L 364 249 Z M 370 252 L 364 258" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                <line x1="26" y1="270" x2="394" y2="270" stroke="#2c3033" stroke-width="1" />

                <!-- 6. Laporkan -->
                <text x="26" y="306" fill="#ffffff">Laporkan</text>
                <!-- Warning Triangle icon -->
                <path d="M 374 292 L 384 310 L 364 310 Z M 374 298 L 374 303 M 374 306 L 374 307.5" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                <line x1="26" y1="324" x2="394" y2="324" stroke="#2c3033" stroke-width="1" />

                <!-- 7. Hapus (Red Accent) -->
                <text x="26" y="358" fill="#ff453a">Hapus</text>
                <!-- Trash Can icon -->
                <path d="M 366 347 L 382 347 M 371 347 L 371 344 C 371 343 372 342 373 342 L 375 342 C 376 342 377 343 377 344 L 377 347 M 368 347 L 369 361 C 369 362 370 363 371 363 L 377 363 C 378 363 379 362 379 361 L 380 347" fill="none" stroke="#ff453a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </g>
        </g>

    </svg>`;
}

module.exports = {
    name: "fakenotif",
    alias: ["fakechat", "qc", "chatblur", "blurwa", "fakephone", "fakepone", "notifwa"],
    category: "tools",
    desc: "Buat gambar chat WhatsApp aesthetic iOS dengan efek blur dan menu reaksi",
    async execute({ m, text, prefix, command, sock }) {
        if (!text) {
            return m.reply(
                `⚠️ *Masukkan teks chat yang ingin dibuat!*\n\n` +
                `Contoh:\n*${prefix + command}* kamu baik mangkanya semua jahat sama kamu.\n\n` +
                `_Tips: Bisa juga tambahkan waktu custom dengan tanda \`|\`_\n` +
                `Contoh: *${prefix + command}* 16.31 | kamu baik mangkanya semua jahat sama kamu.`
            );
        }

        let messageText = text.trim();
        let customTime = null;

        if (text.includes("|")) {
            const parts = text.split("|");
            const possibleTime = parts[0].trim();
            if (/^\d{1,2}[:.]\d{2}$/.test(possibleTime)) {
                customTime = possibleTime.replace(":", ".");
                messageText = parts.slice(1).join("|").trim();
            }
        }

        if (!messageText) {
            return m.reply("⚠️ Teks pesan tidak boleh kosong!");
        }

        if (!Resvg) {
            return m.reply("⚠️ Engine render gambar (Resvg) belum terpasang di runtime sistem.");
        }

        const waitMsg = await m.reply("⏳ *Sedang merender tampilan chat WhatsApp iOS blur...*");

        try {
            const now = new Date();
            const timeStr = customTime || now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(":", ".");

            const svg = generateIosLongpressChat({
                message: messageText,
                timeStr: timeStr
            });

            const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 720 } });
            const pngBuffer = resvg.render().asPng();

            await sock.sendMessage(m.from, {
                image: pngBuffer,
                caption: `✨ *WhatsApp iOS Aesthetic Chat*`
            }, { quoted: m.raw });

            if (waitMsg?.delete) {
                await waitMsg.delete();
            }
        } catch (err) {
            const errMsg = `❌ Gagal membuat gambar chat: ${err.message}`;
            if (waitMsg?.edit) {
                await waitMsg.edit(errMsg);
            } else {
                await m.reply(errMsg);
            }
        }
    }
};
