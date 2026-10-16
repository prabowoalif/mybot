module.exports = {
    name: "owner",
    alias: ["creator", "pembuat"],
    category: "general",
    desc: "Menampilkan kontak pemilik bot",
    async execute({ m, config, sock }) {
        const primaryOwner = config.ownerNumber[0] || "";
        const cleanNumber = primaryOwner.replace(/[^0-9]/g, "");

        // Kirim vCard Kontak WhatsApp
        const vcard = 'BEGIN:VCARD\n'
            + 'VERSION:3.0\n'
            + `FN:${config.ownerName}\n`
            + `ORG:${config.botName};\n`
            + `TEL;type=CELL;type=VOICE;waid=${cleanNumber}:+${cleanNumber}\n`
            + 'END:VCARD';

        await sock.sendMessage(m.from, {
            contacts: {
                displayName: config.ownerName,
                contacts: [{ vcard }]
            }
        }, { quoted: m.raw });

        await m.reply(`Itu adalah kontak pemilik/developer *${config.botName}*. Silakan chat jika ada keperluan atau pertanyaan seputar bot.`);
    }
};
