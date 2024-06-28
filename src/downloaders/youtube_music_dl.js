const ytdl = require('ytdl-core');
const fs = require('fs');
const { promisify } = require('util');
const { maxVideoSize } = require('../handlers/links_handler');
promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

async function downloadYoutubeMusic(ctx, url) {
    try {
        const videoIdMatch = url.match(/(?:watch\?v=|\/)([\w-]{11})/);
        if (!videoIdMatch) {
            throw new Error('Invalid YouTube Music link');
        }

        const videoId = videoIdMatch[1];

        const info = await ytdl.getInfo(videoId);
        const audioFormat = ytdl.chooseFormat(info.formats, { filter: 'audioonly' });

        if (!audioFormat) {
            await ctx.reply('Error: No audio format found for the given YouTube Music video.');
            return;
        }

        const audioStream = ytdl(videoId, { format: audioFormat });

        const fileName = `${info.videoDetails.title.replace(/[^\w\s]/g, '')}.mp3`;

        const writeStream = fs.createWriteStream(fileName);

        audioStream.pipe(writeStream);

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

        //remove the downloaded file
        await unlinkAsync(fileName);
    } catch (error) {
        console.error('Error downloading YouTube Music:', error);
        await ctx.reply('Error downloading YouTube Music. Please try again later.');
    }
}

module.exports = downloadYoutubeMusic;
