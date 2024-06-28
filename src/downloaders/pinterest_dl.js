const axios = require('axios');
const fs = require('fs');
const util = require('util');
util.promisify(require('child_process').exec);
const { promisify } = require('util');
const { maxVideoSize } = require('../handlers/links_handler');

const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

async function downloadPinterestPost(ctx, url) {
    try {
        // Transform Pinterest link
        url = url.replace('https://www.pinterest.co.uk' || `https://www.ru.pinterest.com`, 'https://www.pinterest.com');

        // Fetch Pinterest post details from the downloader API
        const response = await axios.get(`https://pinterestdownloader.io/frontendService/DownloaderService?url=${encodeURIComponent(url)}`);
        const postData = response.data;

        if (!postData || !postData.source || postData.source !== 'pinterest') {
            throw new Error('Invalid Pinterest post data');
        }

        if (postData.medias && postData.medias.length > 0) {
            // Check if it's a video post
            const videoMedia = postData.medias.find(media => media.videoAvailable && media.extension === 'mp4');

            if (videoMedia) {
                const videoUrl = videoMedia.url;
                const videoFileName = `pinterest_video_${Date.now()}.mp4`;

                // Download the video
                const videoResponse = await axios.get(videoUrl, { responseType: 'arraybuffer' });
                await writeFileAsync(videoFileName, videoResponse.data);

                // Check video file size
                const videoFileSize = fs.statSync(videoFileName).size;
                if (videoFileSize > maxVideoSize) {
                    await ctx.reply('Error: The video file is too large to send.');
                    await unlinkAsync(videoFileName);
                    return;
                }

                // Send the video to the user
                await ctx.replyWithVideo({ source: videoFileName });

                // Remove the downloaded file
                await unlinkAsync(videoFileName);
            } else {
                // Check if it's a GIF post
                const gifMedia = postData.medias.find(media => media.videoAvailable && media.extension === 'gif');

                if (gifMedia) {
                    const gifUrl = gifMedia.url;
                    const gifFileName = `pinterest_gif_${Date.now()}.gif`;

                    // Download the GIF
                    const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer' });
                    await writeFileAsync(gifFileName, gifResponse.data);

                    // Check GIF file size
                    const gifFileSize = fs.statSync(gifFileName).size;
                    if (gifFileSize > maxVideoSize) {
                        await ctx.reply('Error: The GIF file is too large to send.');
                        await unlinkAsync(gifFileName);
                        return;
                    }

                    // Send the GIF to the user
                    await ctx.replyWithDocument({ source: gifFileName });

                    // Remove the downloaded file
                    await unlinkAsync(gifFileName);
                } else if (postData.medias[0].url) {
                    // Photo post
                    const photoUrl = postData.medias[0].url; // Assuming the first media is the photo
                    const photoFileName = `pinterest_photo_${Date.now()}.jpg`;

                    // Download the photo
                    const photoResponse = await axios.get(photoUrl, { responseType: 'arraybuffer' });
                    await writeFileAsync(photoFileName, photoResponse.data);

                    // Check photo file size
                    const photoFileSize = fs.statSync(photoFileName).size;
                    if (photoFileSize > maxVideoSize) {
                        await ctx.reply('Error: The photo file is too large to send.');
                        await unlinkAsync(photoFileName);
                        return;
                    }

                    // Send the photo to the user
                    await ctx.replyWithPhoto({ source: photoFileName });

                    // Remove the downloaded file
                    await unlinkAsync(photoFileName);
                } else {
                    throw new Error('Invalid media format in Pinterest post');
                }
            }
        } else {
            throw new Error('No media available in the Pinterest post');
        }
    } catch (error) {
        console.error('Error downloading Pinterest post:', error);
        await ctx.reply('Error downloading Pinterest post');
    }
}

// Export the function for use in other modules
module.exports = downloadPinterestPost;