module.exports = {
    name: "menu",
    alias: ["help", "start"],
    category: "general",
    desc: "Menampilkan daftar seluruh perintah bot",
    async execute({ m, prefix, config, plugins }) {
        // Kelompokkan plugin berdasarkan kategori dan hindari duplikasi karena alias
        const categorized = {};
        const visited = new Set();

        for (const [_, plugin] of plugins) {
            if (visited.has(plugin.name)) continue;
            visited.add(plugin.name);

            const cat = plugin.category ? plugin.category.toUpperCase() : "LAINNYA";
            if (!categorized[cat]) categorized[cat] = [];
            categorized[cat].push(plugin);
        }

        const date = new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        });

        let text = `╭───「 *${config.botName.toUpperCase()}* 」\n`;
        text += `│ 👋 *Halo,* ${m.pushName || "Kak"}!\n`;
        text += `│ 📅 *Tanggal:* ${date}\n`;
        text += `│ 🔑 *Prefix:* [ ${prefix} ]\n`;
        text += `╰───────────────────\n\n`;

        // Tampilkan perintah per kategori
        for (const [category, list] of Object.entries(categorized)) {
            text += `┌───「 *${category}* 」\n`;
            for (const cmd of list) {
                const badge = cmd.isOwner ? " *(Owner)*" : cmd.isGroup ? " *(Grup)*" : "";
                text += `│ • *${prefix}${cmd.name}*${badge}\n`;
                if (cmd.desc) {
                    text += `│   └ _${cmd.desc}_\n`;
                }
            }
            text += `└───\n\n`;
        }

        text += `_Ketik salah satu perintah di atas untuk menggunakan bot._\n`;
        text += `_Ada kendala? Hubungi Owner dengan perintah *${prefix}owner*._`;

        await m.reply(text);
    }
};
