const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const QRCode = require("qrcode");
const qrcodeTerminal = require("qrcode-terminal");
const path = require("path");
const fs = require("fs");
const config = require("./config");
const { handleMessage } = require("./handler");
const { log, colors } = require("./lib/print");

let currentSocket = null;

async function startSocket() {
    // Muat atau buat sesi multi-file
    const { state, saveCreds } = await useMultiFileAuthState(config.sessionDir);
    const { version, isLatest } = await fetchLatestBaileysVersion();

    log.info(`Menggunakan Baileys versi v${version.join(".")} (Terbaru: ${isLatest})`);

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
        },
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        generateHighQualityLinkPreview: true
    });

    currentSocket = sock;

    // 1. FITUR LOGIN DENGAN PAIRING CODE (8 DIGIT)
    if (config.usePairingCode && !sock.authState.creds.registered) {
        const cleanNumber = config.phoneNumber.replace(/[^0-9]/g, "");

        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(cleanNumber);
                console.log("\n" + colors.bgBlue + colors.white + colors.bold + " === KODE PAIRING WHATSAPP === " + colors.reset);
                console.log(` Kode Login Kamu : ${colors.bold + colors.green}${code}${colors.reset}`);
                console.log(" Cara Memasukkan:");
                console.log(" 1. Buka WhatsApp di HP Anda");
                console.log(" 2. Titik tiga di pojok kanan atas > Perangkat Tertaut");
                console.log(" 3. Klik 'Tautkan Perangkat' > 'Tautkan dengan nomor telepon saja'");
                console.log(" 4. Masukkan kode 8 digit di atas.");
                console.log(colors.bgBlue + "                               " + colors.reset + "\n");
            } catch (err) {
                log.error(`Gagal meminta kode pairing: ${err.message}`);
            }
        }, 3000);
    }

    // Simpan kredensial sesi jika ada perubahan
    sock.ev.on("creds.update", saveCreds);

    // Pantau status koneksi WhatsApp
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // 2. FITUR LOGIN DENGAN QR CODE (JIKA PAIRING CODE TIDAK AKTIF)
        if (qr && !config.usePairingCode) {
            console.log("\n" + colors.bgGreen + colors.white + colors.bold + " === SILAKAN SCAN QR CODE INI === " + colors.reset);
            qrcodeTerminal.generate(qr, { small: true });

            try {
                const qrPath = path.resolve("./qr.png");
                await QRCode.toFile(qrPath, qr, { width: 400 });
                log.info(`Gambar QR Code disimpan di: ${qrPath}`);
            } catch (err) {
                log.warn(`Gagal membuat file gambar QR: ${err.message}`);
            }
        }

        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            log.warn(`Koneksi terputus (Status: ${statusCode}). Mencoba menghubungkan kembali: ${shouldReconnect}`);

            if (shouldReconnect) {
                startSocket();
            } else {
                log.error("Sesi telah keluar (Logged Out). Silakan hapus folder 'session' dan login ulang.");
            }
        } else if (connection === "open") {
            console.log("\n" + colors.bgGreen + colors.white + colors.bold + " === BOT WHATSAPP AKTIF & TERHUBUNG === " + colors.reset);
            log.success(`Terhubung sebagai: ${sock.user?.name || "Bot"} (${sock.user?.id.split(":")[0]})`);
            log.info(`Prefix aktif: ${config.prefix.join(", ")}`);
            log.info(`Ketik ${config.prefix[0]}menu di WhatsApp untuk melihat daftar fitur.\n`);
        }
    });

    // Tangani pesan masuk
    sock.ev.on("messages.upsert", async (chatUpdate) => {
        await handleMessage(sock, chatUpdate);
    });

    return sock;
}

module.exports = { startSocket, getSocket: () => currentSocket };
