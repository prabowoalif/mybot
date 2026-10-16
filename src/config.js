require("dotenv").config();

// ==========================================
// PENGATURAN BOT WHATSAPP
// Nilai sensitif dibaca dari file .env agar tidak bocor ke Git
// ==========================================

module.exports = {
    // Nama bot Anda
    botName: process.env.BOT_NAME || "Nexa Bot",

    // Nama pemilik bot
    ownerName: process.env.OWNER_NAME || "Owner",

    // Nomor pemilik bot (format array string)
    ownerNumber: (process.env.OWNER_NUMBER || "628xxxxxxxxxx")
        .split(",")
        .map((num) => num.trim().replace(/[^0-9]/g, "")),

    // Karakter awalan perintah
    prefix: (process.env.PREFIX || "!,.,/").split(",").map((p) => p.trim()),

    // Mode login: true = Pairing Code, false = QR Scan
    usePairingCode: process.env.USE_PAIRING_CODE === "true",

    // Nomor WhatsApp bot kamu
    phoneNumber: (process.env.PHONE_NUMBER || "628xxxxxxxxxx").replace(/[^0-9]/g, ""),

    // Folder tempat menyimpan sesi login
    sessionDir: "./session"
};
