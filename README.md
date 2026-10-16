# Nexa WA Bot - Modular Base

Pondasi Bot WhatsApp modern, ringan, dan sangat mudah dikembangkan berbasis `@whiskeysockets/baileys`.

---

## 📁 Struktur Folder

```text
wa-bot/
├── session/                 # Sesi login WhatsApp (otomatis dibuat setelah login)
├── src/
│   ├── config.js            # Pengaturan: nama bot, nomor bot, prefix, nomor owner
│   ├── connection.js        # Pengelola koneksi socket WhatsApp & pairing code
│   ├── handler.js           # Router pesan & pemfilter izin (owner, group, admin)
│   ├── lib/
│   │   ├── print.js         # Logger terminal berwarna rapi
│   │   ├── loader.js        # Pemindai plugin otomatis + Hot-Reloading
│   │   └── serialize.js     # Helper parsing pesan (m.body, m.reply, dll.)
│   └── plugins/             # TEMPAT MENAMBAH FITUR BARU
│       ├── general/
│       │   ├── menu.js      # Daftar perintah otomatis terkelompok
│       │   ├── ping.js      # Status latency & RAM
│       │   └── owner.js     # Kontak pemilik bot
│       └── downloader/
│           └── tiktok.js    # Tempat sambungkan downloader kamu
├── index.js                 # Entry point utama
└── package.json
```

---

## 🚀 Cara Menjalankan

1. Buka file `src/config.js`, atur nomor WhatsApp kamu:
   ```javascript
   phoneNumber: "628xxxxxxxxxx", // nomor yang ingin dijadikan bot
   ownerNumber: ["628xxxxxxxxxx"] // nomor kamu sebagai pemilik
   ```

2. Jalankan bot di terminal:
   ```bash
   node index.js
   ```

3. Terminal akan memunculkan **Kode Pairing 8 Digit**.
4. Buka WhatsApp di HP:
   * Masuk ke **Setelan > Perangkat Tertaut > Tautkan Perangkat**
   * Pilih **"Tautkan dengan nomor telepon saja"**
   * Masukkan kode yang muncul di terminal.

---

## 🧩 Cara Menambah Fitur Baru

Untuk menambah fitur baru, cukup buat satu file `.js` di dalam folder `src/plugins/<kategori>/`.

Contoh membuat perintah `!halo`:
Buat file `src/plugins/general/halo.js`:

```javascript
module.exports = {
    name: "halo",                // Nama perintah: !halo
    alias: ["hi", "hei"],        // Nama alias tambahan
    category: "general",         // Kategori di menu
    desc: "Menyapa pengguna",    // Deskripsi perintah
    isOwner: false,              // true jika khusus owner
    isGroup: false,              // true jika khusus di grup
    async execute({ m, text }) {
        await m.reply(`Halo juga kak ${m.pushName}! Ada yang bisa dibantu?`);
    }
};
```
*Catatan: Bot memiliki fitur **Hot-Reload**. Kamu tidak perlu mematikan dan menyalakan ulang bot saat mengedit atau menambah file plugin!*
