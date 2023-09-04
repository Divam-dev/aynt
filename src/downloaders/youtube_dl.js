const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

async function downloadYoutubeVideo(ctx, url) {
    const videoId = ytdl.getURLVideoID(url);
    const info = await ytdl.getInfo(videoId);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestvideo' });
    const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });

    // Check if the video is live
    if (info.videoDetails.isLiveContent) {
        await ctx.reply('⛔ This video is live, so it cannot be downloaded now. Please try again after the live stream is ended.');
        return;
    }

    // Calculate the size of the video in bytes
    let maxVideoSize;
    if (process.env.LOCAL_SERVER) {
        // 2GB in bytes (2 * 1024 * 1024 * 1024)
        maxVideoSize = 2 * 1024 * 1024 * 1024;
    } else {
        // 50MB in bytes (50 * 1024 * 1024)
        maxVideoSize = 50 * 1024 * 1024;
    }

    // Max video size
    const videoSize = parseInt(format.contentLength);
    if (videoSize > maxVideoSize) {
        await ctx.reply(`⛔ The video is too large to download (max ${maxVideoSize / (1024 * 1024)}MB).`);
        return;
    }

    // Get video information for preview message
    const videoName = info.videoDetails.title;
    const views = info.videoDetails.viewCount;
    const uploadDate = new Date(info.videoDetails.uploadDate).toLocaleDateString();
    const uploader = info.videoDetails.author.name;
    const duration = new Date(0);
    duration.setSeconds(info.videoDetails.lengthSeconds);
    const durationStr = duration.toISOString().substr(11, 8);

    // Video thumbnail URL
    const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg?sqp=-oaymwEcCNACELwBSFXyq4qpAw4IARUAAIhCGAFwAcABBg==&rs=AOn4CLAVrdfOFtJegCDgOPWIT2WTNA3XwQ`;

    // Send video preview message with photo
    await ctx.replyWithPhoto({ url: thumbnailUrl }, {
        caption: `<b>${videoName}</b>\n\n👁 ${views}\n📥 ${uploadDate}\n👤 ${uploader}\n🕒 ${durationStr}`,
        parse_mode: 'HTML'
    });

    await ctx.reply('✅ Start downloading...');

    if (format && audioFormat) {
        const videoPath = path.join(__dirname, `${videoId}.mp4`);
        const audioPath = path.join(__dirname, `${videoId}_audio.mp4`);

        const videoReadableStream = ytdl(url, { format: format });
        const audioReadableStream = ytdl(url, { format: audioFormat });

        const videoWriteStream = fs.createWriteStream(videoPath);
        const audioWriteStream = fs.createWriteStream(audioPath);

        // Use pipeline to merge the video and audio streams
        const { pipeline } = require('stream');
        await Promise.all([
            new Promise((resolve, reject) => {
                pipeline(videoReadableStream, videoWriteStream, err => {
                    if (err) reject(err);
                    else resolve();
                });
            }),
            new Promise((resolve, reject) => {
                pipeline(audioReadableStream, audioWriteStream, err => {
                    if (err) reject(err);
                    else resolve();
                });
            }),
        ]);

        // Merge video and audio streams using ffmpeg
        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(videoPath)
                .input(audioPath)
                .outputOptions('-c:v', 'copy')
                .outputOptions('-c:a', 'mp3')
                .on('error', reject)
                .on('end', resolve)
                .save(path.join(__dirname, `${videoId}_merged.mp4`));
        });

        await ctx.reply('✅ Uploading...');

        // Send the merged video to the user
        const mergedFilePath = path.join(__dirname, `${videoId}_merged.mp4`);
        await ctx.replyWithVideo({ source: fs.createReadStream(mergedFilePath) });

        // Clean up temporary files
        fs.unlinkSync(videoPath);
        fs.unlinkSync(audioPath);
        fs.unlinkSync(mergedFilePath);
    } else {
        await ctx.reply('No suitable format found');
    }
}

module.exports = downloadYoutubeVideo;