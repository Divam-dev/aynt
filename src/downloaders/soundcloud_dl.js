const SoundCloud = require("soundcloud-scraper");
const fs = require("fs");
const { promisify } = require('util');
const { maxVideoSize } = require('../handlers/links_handler');
const unlinkAsync = promisify(fs.unlink);

async function downloadSoundCloudMusic(ctx, url) {
    try {
        const client = new SoundCloud.Client();
        const song = await client.getSongInfo(url);

        const stream = await song.downloadProgressive();
        const fileName = `./${song.title.replace(/[^\w\s]/g, '')}.mp3`;

        const writeStream = fs.createWriteStream(fileName);

        stream.pipe(writeStream);

        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        const fileSize = fs.statSync(fileName).size;

        if (fileSize > maxVideoSize) {
            await ctx.reply('Error: The audio file is too large to send.');
            await unlinkAsync(fileName);
            return;
        }

        await ctx.replyWithAudio({ source: fileName });

        // Remove the downloaded file
        await unlinkAsync(fileName);
    } catch (error) {
        console.error('Error downloading SoundCloud music:', error);
        await ctx.reply('Error downloading SoundCloud music. Please try again later.');
    }
}

module.exports = downloadSoundCloudMusic;
