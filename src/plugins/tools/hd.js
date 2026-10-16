const axios = require("axios");
const FormData = require("form-data");
const crypto = require("crypto");

async function upscaleLive3D(buffer) {
    const API_URL = "https://app-v1.live3d.io";
    const randomUUID = crypto.randomUUID();
    const currentStamp = Math.floor(Date.now() / 1000);
    const randomGaId = Math.floor(Math.random() * 2000000000) + 1000000000;

    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://live3d.io/",
        "Origin": "https://live3d.io",
        "fp": "010dceb8565a75c3b93b66b070546d7f",
        "fp1": "9GlRXTJCUFqITQFnKiPGq3Nd4uSmiRXlhzkk99/OqIF67mUmpXn5hUB5/oSwbaVR",
        "Brand-Key": "8f3f0c7387123ae0",
        "Cookie": `_ga=GA1.1.${randomGaId}.${currentStamp}; crisp-client%2Fsession%2F44d2a7f7-07ad-4dfb-8c30-fe794fc2a392=session_${randomUUID};`
    };

    const form = new FormData();
    form.append("file", buffer, { filename: "enhance.jpg" });

    const uploadRes = await axios.post(`${API_URL}/aitools/upload-img`, form, {
        headers: {
            ...headers,
            "X-code": Date.now().toString(),
            ...form.getHeaders()
        },
        timeout: 20000
    });

    if (uploadRes.data?.code !== 200) throw new Error("Gagal mengunggah gambar ke server HD.");
    const uploadedPath = uploadRes.data.data.path;

    const createRes = await axios.post(`${API_URL}/aitools/of/create`, {
        fn_name: "demo-image-upscaler",
        call_type: 3,
        input: { source_image: uploadedPath, scale: 4, request_from: 9 },
        data: "",
        request_from: 9,
        origin_from: "8f3f0c7387123ae0"
    }, {
        headers: { ...headers, "X-code": Date.now().toString(), "Content-Type": "application/json" },
        timeout: 20000
    });

    if (createRes.data?.code !== 200) throw new Error("Gagal membuat antrean enhance.");
    const taskId = createRes.data.data.task_id;

    // Polling status
    for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        const statusRes = await axios.post(`${API_URL}/aitools/of/check-status`, {
            task_id: taskId,
            fn_name: "demo-image-upscaler",
            call_type: 3,
            request_from: 9,
            origin_from: "8f3f0c7387123ae0"
        }, {
            headers: { ...headers, "X-code": Date.now().toString(), "Content-Type": "application/json" }
        });

        const dataStatus = statusRes.data?.data;
        if (dataStatus?.status === 2 && dataStatus.result_image) {
            return `https://temp.live3d.io/${dataStatus.result_image}`;
        }
    }

    throw new Error("Waktu pemrosesan enhance habis (Timeout).");
}

module.exports = {
    name: "hd",
    alias: ["remini", "hdr", "enhance"],
    category: "tools",
    desc: "Menjernihkan dan memperbesar foto buram menjadi HD",
    async execute({ m, prefix, command, sock }) {
        try {
            const isMedia = m.type === "imageMessage";
            const isQuotedMedia = m.quoted && m.quoted.type === "imageMessage";

            if (!isMedia && !isQuotedMedia) {
                return m.reply(`⚠️ *Kirim atau balas foto* dengan caption *${prefix + command}* untuk menjernihkannya!`);
            }

            await m.reply("⏳ *Sedang meningkatkan kualitas foto ke HD (AI Enhancer), mohon tunggu...*");

            const buffer = isQuotedMedia ? await m.quoted.download() : await m.download();
            if (!buffer) return m.reply("❌ Gagal mengunduh gambar.");

            const resultUrl = await upscaleLive3D(buffer);

            await sock.sendMessage(m.from, {
                image: { url: resultUrl },
                caption: "✨ *Foto berhasil ditingkatkan ke resolusi HD!*"
            }, { quoted: m.raw });

        } catch (err) {
            await m.reply(`❌ Gagal meningkatkan kualitas foto:\n${err.message}`);
        }
    }
};
