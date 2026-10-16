const fs = require("fs");
const path = require("path");

function resolvePhoneFromLid(jid, sessionDir = "./session") {
    if (!jid) return jid;
    if (jid.endsWith("@s.whatsapp.net")) return jid;
    
    // Jika formatnya @lid
    const lidUser = jid.split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
    try {
        const reverseFile = path.join(sessionDir, `lid-mapping-${lidUser}_reverse.json`);
        if (fs.existsSync(reverseFile)) {
            const pn = JSON.parse(fs.readFileSync(reverseFile, "utf8"));
            if (pn) return `${String(pn).replace(/[^0-9]/g, "")}@s.whatsapp.net`;
        }
    } catch (_) {}
    return jid;
}

/**
 * Mempermudah pembacaan objek pesan dari Baileys
 * Menyediakan shorthand seperti m.body, m.sender, m.reply, m.download, dll.
 */
function serialize(sock, msg) {
    if (!msg) return msg;

    const m = {};
    m.raw = msg;
    m.key = msg.key;
    m.id = msg.key.id;
    m.from = msg.key.remoteJid;
    m.isGroup = m.from.endsWith("@g.us");
    m.fromMe = msg.key.fromMe;
    
    // Sender ID
    m.sender = m.fromMe
        ? jidNormalizedUser(sock.user?.id || "")
        : (m.isGroup ? msg.key.participant : m.from) || "";
    m.sender = jidNormalizedUser(m.sender);

    // Resolusi nomor telepon asli (jika pengirim menggunakan Privacy LID WhatsApp)
    m.senderPn = resolvePhoneFromLid(m.sender);
    m.senderNumber = m.senderPn.split("@")[0].replace(/[^0-9]/g, "");

    // Pushname (nama display pengirim)
    m.pushName = msg.pushName || "Pengguna";

    if (msg.message) {
        m.type = getContentType(msg.message);
        m.message = m.type === "ephemeralMessage" ? msg.message.ephemeralMessage.message : msg.message;
        
        // Ekstrak isi teks pesan
        m.body = 
            m.message?.conversation ||
            m.message?.[m.type]?.text ||
            m.message?.[m.type]?.caption ||
            m.message?.extendedTextMessage?.text ||
            "";

        // Cek Quoted Message (Pesan yang dibalas)
        const contextInfo = m.message?.[m.type]?.contextInfo;
        if (contextInfo && contextInfo.quotedMessage) {
            const quotedMsg = contextInfo.quotedMessage;
            const quotedType = getContentType(quotedMsg);

            m.quoted = {
                key: {
                    remoteJid: m.from,
                    fromMe: contextInfo.participant === jidNormalizedUser(sock.user?.id || ""),
                    id: contextInfo.stanzaId,
                    participant: contextInfo.participant
                },
                sender: jidNormalizedUser(contextInfo.participant || ""),
                message: quotedMsg,
                type: quotedType,
                body: 
                    quotedMsg?.conversation ||
                    quotedMsg?.[quotedType]?.text ||
                    quotedMsg?.[quotedType]?.caption ||
                    quotedMsg?.extendedTextMessage?.text ||
                    "",
                download: async () => {
                    return await downloadMediaMessage(
                        { key: { remoteJid: m.from, id: contextInfo.stanzaId, participant: contextInfo.participant }, message: quotedMsg },
                        "buffer",
                        {},
                        { reuploadRequest: sock.updateMediaMessage }
                    );
                }
            };
        } else {
            m.quoted = null;
        }

        // Helper download media pesan ini sendiri
        m.download = async () => {
            return await downloadMediaMessage(
                msg,
                "buffer",
                {},
                { reuploadRequest: sock.updateMediaMessage }
            );
        };
    }

    // Helper untuk membalas pesan dengan mudah: m.reply("teks")
    m.reply = async (text, options = {}) => {
        return await sock.sendMessage(
            m.from,
            { text: String(text), ...options },
            { quoted: msg }
        );
    };

    return m;
}

module.exports = { serialize };
