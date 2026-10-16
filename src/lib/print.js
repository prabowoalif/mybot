// Helper untuk pewarnaan terminal tanpa perlu library eksternal
const colors = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    gray: "\x1b[90m",
    bgBlue: "\x1b[44m",
    bgGreen: "\x1b[42m"
};

const log = {
    info: (msg) => console.log(`${colors.cyan}[INFO]${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
    plugin: (name, status) => {
        const tag = status === 'loaded' ? `${colors.green}+${colors.reset}` : `${colors.yellow}~${colors.reset}`;
        console.log(`  ${tag} ${colors.gray}Plugin:${colors.reset} ${colors.bold}${name}${colors.reset}`);
    },
    message: ({ from, sender, command, isGroup }) => {
        const time = new Date().toLocaleTimeString("id-ID", { hour12: false });
        const scope = isGroup ? `${colors.yellow}[GROUP]${colors.reset}` : `${colors.blue}[PRIVATE]${colors.reset}`;
        console.log(`[${colors.gray}${time}${colors.reset}] ${scope} ${colors.cyan}${command}${colors.reset} dari ${colors.magenta}${sender}${colors.reset}`);
    }
};

module.exports = { colors, log };
