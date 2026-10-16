const { startSocket } = require("./src/connection");
const { loadPlugins, plugins } = require("./src/lib/loader");
const { log, colors } = require("./src/lib/print");
const { startServer } = require("./src/server");
const config = require("./src/config");

console.clear();
console.log(colors.cyan + colors.bold);
console.log("  _   _                 ____        _   ");
console.log(" | \\ | | _____  ____ _  | __ )  ___ | |_ ");
console.log(" |  \\| |/ _ \\ \\/ / _` | |  _ \\ / _ \\| __|");
console.log(" | |\\  |  __/>  < (_| | | |_) | (_) | |_ ");
console.log(" |_| \\_|\\___/_/\\_\\__,_| |____/ \\___/ \\__|");
console.log(colors.reset);
console.log(`${colors.gray}--- Sistem Modular Bot WhatsApp v1.0.0 ---${colors.reset}\n`);

// 1. Muat seluruh plugin modular
log.info("Memuat seluruh plugin dari folder src/plugins/...");
loadPlugins();
log.success(`Berhasil memuat ${colors.bold}${plugins.size}${colors.reset} perintah aktif.`);

// 2. Jalankan Web Control Dashboard
startServer();

// 3. Inisialisasi koneksi WhatsApp
log.info("Memulai koneksi ke WhatsApp Socket...");
startSocket();

// 4. Mencegah bot mati mendadak jika ada error tidak terduga
process.on("uncaughtException", (err) => {
    log.error(`Uncaught Exception: ${err.message}`);
});

process.on("unhandledRejection", (err) => {
    log.error(`Unhandled Rejection: ${err.message || err}`);
});
