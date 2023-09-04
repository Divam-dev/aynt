const axios = require('axios');
const { Markup } = require('telegraf');

// Adding useragent to avoid IP bans
const headers = {
    'User-Agent': 'TikTok 26.2.0 rv:262018 (iPhone; iOS 14.4.2; en_US) Cronet'
};

const getVideo = async (url) => {
    const API_URL = `https://aemt.me/download/tiktokslide?url=${encodeURIComponent(url)}`;
    const response = await axios.get(API_URL, { headers });
    const data = response.data;
    return data;
};

module.exports = function(bot) {
    bot.action(/^download_music_(.+)/, async (ctx) => {
        const videoId = ctx.match[1];
        try {
            const data = await getVideo(`https://www.tiktok.com/@user/video/${videoId}`);
            ctx.replyWithAudio(data.result.data.music);
        } catch (err) {
            console.error(err);
            ctx.reply('Error downloading music');
        }
    });

    return async function downloadTikTokVideo(ctx, videoUrl) {
        try {
            const fullVideoUrl = `https://${videoUrl}`;
            const data = await getVideo(fullVideoUrl);

            const mediaUrl = data.result.data.play;
            const isAudio = mediaUrl.endsWith('.mp3');

            if (isAudio) {
                // Construct message with multiple images
                const mediaArray = data.result.data.images.map(image => ({
                    type: 'photo',
                    media: { url: image }
                }));

                // Reply with the media group
                await ctx.replyWithMediaGroup(mediaArray);

                // Send the audio
                ctx.replyWithAudio(data.result.data.music);
            } else {
                // Reply with video
                const keyboard = {
                    inline_keyboard: [
                        [{ text: '🎵download music', callback_data: `download_music_${data.result.data.id}` }]
                    ]
                };

                await ctx.replyWithVideo(mediaUrl, { reply_markup: keyboard });
            }

        } catch (err) {
            console.error(err);
            ctx.reply('Error downloading media');
        }
    };
};