const axios = require('axios');
const fs = require('fs');

async function downloadTwitterVideo(ctx, url) {
    try {
        const response = await axios.get(`https://aemt.me/download/twtdl?url=${encodeURIComponent(url)}`);

        if (response.data.status && response.data.result.length > 0) {
            const videoUrl = response.data.result[0].url;

            // Download the video
            const videoResponse = await axios({
                method: 'get',
                url: videoUrl,
                responseType: 'stream',
            });

            // Save the video to a local file
            const videoFilePath = 'downloaded_video.mp4';
            const videoStream = fs.createWriteStream(videoFilePath);
            videoResponse.data.pipe(videoStream);

            videoStream.on('finish', async () => {
                // Sending the downloaded video to the user
                await ctx.replyWithVideo({ source: videoFilePath });

                // Clean up: remove the downloaded file
                fs.unlink(videoFilePath, (err) => {
                    if (err) {
                        console.error('Error deleting video file:', err);
                    }
                });
            });
        } else {
            await ctx.reply('Error: Unable to download the Twitter video.');
        }
    } catch (error) {
        console.error('Error downloading Twitter video:', error);
        await ctx.reply('Error: Unable to download the Twitter video.');
    }
}

module.exports = downloadTwitterVideo;
