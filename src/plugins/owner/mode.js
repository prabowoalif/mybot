module.exports = {
    name: "mode",
    alias: ["botmode", "setmode"],
    category: "owner",
    desc: "Ubah mode akses bot (public/self)",
    isOwner: true,
    async execute({ m, args, prefix, command }) {
        const targetMode = (args[0] || "").toLowerCase();

        if (targetMode === "public" || targetMode === "publik") {
            global.botMode = "public";
            return m.reply(
                `✅ *Mode Bot Berhasil Diubah!*\n\n` +
                `🌐 *Mode Saat Ini:* *PUBLIC*\n` +
                `_Semua pengguna dan anggota grup dapat menggunakan bot ini._`
            );
        } else if (targetMode === "self" || targetMode === "pribadi") {
            global.botMode = "self";
            return m.reply(
                `🔒 *Mode Bot Berhasil Diubah!*\n\n` +
                `🛡️ *Mode Saat Ini:* *SELF*\n` +
                `_Bot sekarang hanya akan merespons pesan dari Owner._`
            );
        } else {
            const current = (global.botMode || "public").toUpperCase();
            return m.reply(
                `⚙️ *Pengaturan Mode Bot*\n\n` +
                `Status saat ini: *[ ${current} ]*\n\n` +
                `Format perintah:\n` +
                `• *${prefix + command} public* ➔ Izinkan semua orang\n` +
                `• *${prefix + command} self* ➔ Khusus Owner saja`
            );
        }
    }
};
