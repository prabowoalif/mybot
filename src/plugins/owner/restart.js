module.exports = {
    name: "restart",
    alias: ["reboot", "reloadbot"],
    category: "owner",
    desc: "Memulai ulang proses bot dari WhatsApp",
    isOwner: true,
    async execute({ m }) {
        await m.reply("🔄 *Memulai ulang bot (Restarting)...*\n_Sistem akan kembali online secara otomatis dalam beberapa detik._");
        setTimeout(() => {
            process.exit(0);
        }, 1200);
    }
};
