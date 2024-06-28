const axios = require('axios');
const fs = require('fs');
const { maxVideoSize } = require('../handlers/links_handler');
// Function to get the media information from a Twitter URL.
async function getTwitterMedia(url, options = {}) {
    let input = {};

    if (typeof url === 'object' && url.url) {
        input = url;
    } else if (typeof url === 'string') {
        input.url = url;
    } else {
        return { found: false, error: 'Invalid first argument' };
    }

    Object.keys(options).forEach((key) => {
        input[key] = options[key];
    });

    if (/\/\/twitter.com/.test(input.url)) {
        let apiURL = input.url.replace('//twitter.com', '//api.vxtwitter.com');

        let result;
        try {
            result = await axios.get(apiURL).then((res) => res.data);
        } catch (err) {
            return { found: false, error: 'An issue occurred. Make sure the Twitter link is valid.' };
        }

        if (!result.media_extended) {
            return { found: false, error: 'No media found' };
        }

        let output = {
            found: true,
            type: result.media_extended[0].type,
            url: result.media_extended[0].url
        };

        if (input.text) {
            output.text = result.text;
        }

        if (input.buffer) {
            try {
                const bufferResponse = await axios.get(output.url, { responseType: 'arraybuffer' });
                output.buffer = Buffer.from(bufferResponse.data, 'binary');
            } catch (err) {
                console.log('Error getting buffer: ', err);
                output.buffer = undefined;
            }
        }

        return output;
    } else {
        return { found: false, error: `Invalid URL: ${input.url}` };
    }
}

// This function converts a URL from x.com to twitter.com if necessary.
async function convertXToTwitterURL(url) {
    if (url.includes('x.com')) {
        url = url.replace('x.com', 'twitter.com');
    }
    return url;
}

// Function to download Twitter media and send it through Telegram.
async function downloadTwitterMedia(ctx, url) {
    try {
        url = await convertXToTwitterURL(url);

        let media = await getTwitterMedia(url, { buffer: true });

        if (media.found) {
            if (media.type === 'video' && media.url) {
                const videoResponse = await axios({
                    method: 'get',
                    url: media.url,
                    responseType: 'stream',
                });

                const videoFilePath = 'downloaded_video.mp4';
                const videoStream = fs.createWriteStream(videoFilePath);
                let downloadedSize = 0;
                let videoSizeExceeded = false;
                let videoSent = false;

                videoResponse.data.on('data', (chunk) => {
                    downloadedSize += chunk.length;

                    // Check if the downloaded size exceeds the maximum allowed size
                    if (downloadedSize > maxVideoSize) {
                        videoSizeExceeded = true;
                        videoStream.end();
                        videoResponse.data.destroy();
                        if (!videoSent) {
                            ctx.reply('Video size exceeds the maximum allowed size.');
                        }
                        // Delete the video file as it won't be sent
                        fs.unlink(videoFilePath, (err) => {
                            if (err) {
                                console.error('Error deleting video file:', err);
                            }
                        });
                    } else {
                        videoStream.write(chunk);
                    }
                });

                videoResponse.data.on('end', async () => {
                    if (!videoSizeExceeded) {
                        videoStream.end(async () => {
                            videoSent = true;
                            await ctx.replyWithVideo({ source: videoFilePath });
                            // Delete the video file after sending the video
                            fs.unlink(videoFilePath, (err) => {
                                if (err) {
                                    console.error('Error deleting video file:', err);
                                }
                            });
                        });
                    } else {
                        // Delete the video file as it won't be sent
                    }
                });
            } else if (media.type === 'image' && media.url) {
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
        console.error('Error downloading Twitter media:', error.message);
        await ctx.reply('Unable to download Twitter media.');
    }
}

module.exports = downloadTwitterMedia;