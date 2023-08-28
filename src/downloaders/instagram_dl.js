const ig = require('instagram-url-dl');

async function downloadInstagram(ctx, link) {
    try {
        const res = await ig(link);
        const data = res.data;

        for (const item of data) {
            if (item.type === 'video') {
                await ctx.telegram.sendVideo(ctx.chat.id, item.url);
            } else if (item.type === 'image') {
                await ctx.telegram.sendPhoto(ctx.chat.id, item.url);
            }
        }
    } catch (err) {
        console.error(err);
        await ctx.reply('Error downloading the file.');
    }
}

module.exports = downloadInstagram;
