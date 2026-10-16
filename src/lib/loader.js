const fs = require("fs");
const path = require("path");
const { log } = require("./print");

// Map untuk menyimpan semua plugin yang terdaftar
const plugins = new Map();

/**
 * Membaca semua file plugin di dalam folder secara rekursif
 */
function loadPlugins(dir = path.join(__dirname, "../plugins")) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        return plugins;
    }

    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            loadPlugins(fullPath);
        } else if (file.endsWith(".js")) {
            loadPluginFile(fullPath);
        }
    }

    return plugins;
}

/**
 * Memuat atau memuat ulang satu file plugin
 */
function loadPluginFile(filePath) {
    try {
        // Hapus cache require agar mendukung hot-reloading tanpa restart bot
        delete require.cache[require.resolve(filePath)];
        const plugin = require(filePath);

        if (!plugin.name || typeof plugin.execute !== "function") {
            log.warn(`File plugin dilewati (tidak ada name atau execute): ${path.basename(filePath)}`);
            return;
        }

        // Tentukan kategori default berdasarkan nama folder jika tidak ditentukan
        if (!plugin.category) {
            const parentDir = path.basename(path.dirname(filePath));
            plugin.category = parentDir !== "plugins" ? parentDir : "general";
        }

        plugin.filePath = filePath;
        plugins.set(plugin.name.toLowerCase(), plugin);

        // Daftarkan juga alias jika ada
        if (Array.isArray(plugin.alias)) {
            plugin.alias.forEach((al) => plugins.set(al.toLowerCase(), plugin));
        }

        // Pantau perubahan file untuk fitur Hot-Reload otomatis
        watchPluginFile(filePath);
    } catch (err) {
        log.error(`Gagal memuat plugin ${path.basename(filePath)}: ${err.message}`);
    }
}

// Set untuk melacak file yang sudah dipantau agar tidak double-watch
const watchedFiles = new Set();

function watchPluginFile(filePath) {
    if (watchedFiles.has(filePath)) return;
    watchedFiles.add(filePath);

    fs.watch(filePath, (eventType) => {
        if (eventType === "change") {
            try {
                log.info(`Mendeteksi perubahan file: ${path.basename(filePath)}, memuat ulang...`);
                loadPluginFile(filePath);
                log.success(`Plugin ${path.basename(filePath)} berhasil diperbarui secara otomatis!`);
            } catch (err) {
                log.error(`Error saat hot-reload ${path.basename(filePath)}: ${err.message}`);
            }
        }
    });
}

module.exports = {
    plugins,
    loadPlugins,
    loadPluginFile
};
