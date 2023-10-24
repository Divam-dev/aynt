const axios = require('axios');
const fs = require('fs');
const getTwitterMedia = require('get-twitter-media');

async function convertXToTwitterURL(url) {
    // Check if the URL is from x.com, and if so, convert it to twitter.com
    if (url.includes('x.com')) {
        url = url.replace('x.com', 'twitter.com');
    }
    return url;
}

async function downloadTwitterMedia(ctx, url) {
    try {
        // Convert x.com URL to twitter.com if needed
        url = await convertXToTwitterURL(url);

        let media = await getTwitterMedia(url, { buffer: true });

        if (media.found) {
            if (media.type === 'video' && media.url) {
                // Download and send the video
                const videoResponse = await axios({
                    method: 'get',
                    url: media.url,
                    responseType: 'stream',
                });

                const videoFilePath = 'downloaded_video.mp4';
                const videoStream = fs.createWriteStream(videoFilePath);
                videoResponse.data.pipe(videoStream);

                videoStream.on('finish', async () => {
                    // Sending video to the user
                    await ctx.replyWithVideo({ source: videoFilePath });

                    // Remove the downloaded file
                    fs.unlink(videoFilePath, (err) => {
                        if (err) {
                            console.error('Error deleting video file:', err);
                        }
                    });
                });
            } else if (media.type === 'image' && media.url) {
                // Send the image
                await ctx.replyWithPhoto({ url: media.url });
            } else {
                console.error('Error: Unsupported media type.');
                await ctx.reply('Unsupported media type.');
            }
        } else {
            console.error('Error: Twitter media not found.');
            await ctx.reply('Unable to download Twitter media.');
        }
    } catch (error) {
        console.error('Error downloading Twitter media:', error);
        await ctx.reply('Unable to download Twitter media.');
    }
}

module.exports = downloadTwitterMedia;