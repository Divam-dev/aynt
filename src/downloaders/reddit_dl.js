const axios = require('axios');
const fs = require('fs');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const { promisify } = require('util');
const { maxVideoSize } = require('../handlers/links_handler');

const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

// let maxVideoSize;
// if (process.env.LOCAL_SERVER) {
//     // 2GB in bytes (2 * 1024 * 1024 * 1024)
//     maxVideoSize = 2 * 1024 * 1024 * 1024;
// } else {
//     // 50MB in bytes (50 * 1024 * 1024)
//     maxVideoSize = 50 * 1024 * 1024;
// }

async function downloadRedditPost(ctx, url) {
    try {
        // Extract the Reddit post ID from the URL
        const match = url.match(/reddit\.com\/(?:r\/[^/]+\/comments\/|[^/]+\/comments\/)([\w-]+)/i);
        if (!match) {
            throw new Error('Invalid Reddit post URL');
        }

        const postId = match[1];

        // Fetch post details from Reddit API
        const response = await axios.get(`https://api.reddit.com/api/info.json?id=t3_${postId}`);
        const postData = response.data.data.children[0].data;

        // Check if it's a video post
        if (postData.media && postData.media.reddit_video && postData.media.reddit_video.hls_url) {
            // Video post
            const hlsPlaylistUrl = postData.media.reddit_video.hls_url;
            const cleanHlsPlaylistUrl = hlsPlaylistUrl.split('?')[0];

            const videoFileName = `reddit_video_${postId}.mp4`;

            // Use ffmpeg to download and convert the video
            await exec(`ffmpeg -i ${cleanHlsPlaylistUrl} -c copy ${videoFileName}`);

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
        } else if (postData.url_overridden_by_dest) {
            // Photo post
            const photoUrl = postData.url_overridden_by_dest;

            const photoFileName = `reddit_photo_${postId}.jpg`;

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
            throw new Error('Unsupported Reddit post type');
        }
    } catch (error) {
        console.error('Error downloading Reddit post:', error);
        await ctx.reply('Error downloading Reddit post');
    }
}

// Export the function for use in other modules
module.exports = downloadRedditPost;
