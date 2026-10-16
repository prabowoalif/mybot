const {
    generateWAMessageFromContent,
    isJidGroup
} = require("@whiskeysockets/baileys");

/**
 * Mengirim pesan dengan tombol interaktif resmi WhatsApp (Native Flow Buttons)
 * Termasuk tombol pop-up list ("single_select" / "LIHAT MENU") dan quick reply.
 * Menyertakan binary node injection (biz & bot biz_bot: "1") agar tidak di-drop oleh WhatsApp server.
 */
async function sendInteractive(sock, jid, { title, text, footer, buttons = [] }, quoted = null) {
    try {
        const interactiveMessage = {
            header: title ? {
                title,
                hasMediaAttachment: false
            } : undefined,
            body: { text: text || "" },
            footer: footer ? { text: footer } : undefined,
            nativeFlowMessage: {
                buttons
            }
        };

        const validQuoted = (quoted && quoted.key && typeof quoted.key.fromMe !== 'undefined') ? quoted : undefined;

        const msg = generateWAMessageFromContent(jid, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage
                }
            }
        }, {
            quoted: validQuoted,
            userJid: sock.user?.id
        });

        const firstButton = buttons[0]?.name || "quick_reply";
        const isPrivate = !isJidGroup(jid);

        const additionalNodes = [
            {
                tag: "biz",
                attrs: {},
                content: [{
                    tag: "interactive",
                    attrs: {
                        type: "native_flow",
                        v: "1"
                    },
                    content: [{
                        tag: "native_flow",
                        attrs: {
                            v: "2",
                            name: firstButton
                        }
                    }]
                }]
            },
            ...(isPrivate ? [{ tag: "bot", attrs: { biz_bot: "1" } }] : [])
        ];

        await sock.relayMessage(jid, msg.message, {
            messageId: msg.key.id,
            additionalNodes
        });

        return msg;
    } catch (err) {
        const validQuoted = (quoted && quoted.key && typeof quoted.key.fromMe !== 'undefined') ? quoted : undefined;
        return await sock.sendMessage(jid, { text }, { quoted: validQuoted });
    }
}

module.exports = { sendInteractive };
