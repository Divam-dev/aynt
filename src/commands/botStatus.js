const os = require('os');

module.exports = async function statusCommand(ctx) {
    const statusMessage = generateStatusMessage();

    await ctx.replyWithMarkdown(statusMessage);
};

function fetchDataFromDatabase() {
    const users = 1000; // Example: number of users
    const messages = 5000; // Example: number of messages
    const downloadedGB = 10; // Example: GB downloaded
    const downloadedFiles = 20; // Example: number of files downloaded
    return { users, messages, downloadedGB, downloadedFiles };
}

function generateStatusMessage() {
    const { users, messages, downloadedGB, downloadedFiles } = fetchDataFromDatabase();

    // Remaining code stays the same
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
    const nodeVersion = process.version;

    const osName = () => {
        switch (os.platform()) {
            case 'aix': return 'AIX';
            case 'darwin': return 'macOS';
            case 'freebsd': return 'FreeBSD';
            case 'linux': return 'Linux';
            case 'openbsd': return 'OpenBSD';
            case 'sunos': return 'SunOS';
            case 'win32': return 'Windows';
            case 'android': return 'Android';
            default: return os.platform();
        }
    };

    const osVersion = os.release();

    const statusMessage = `
🤖 Bot Status:

🕒 Uptime: ${formatTime(uptime)}
👥 Users: ${users}
💬 Messages: ${messages}
📁 Downloaded Files: ${downloadedFiles}
💾 Downloaded GB: ${downloadedGB}
💻 OS: ${osName()} ${osVersion}
🚀 Node.js Version: ${nodeVersion}
`;
    return statusMessage;
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
}
