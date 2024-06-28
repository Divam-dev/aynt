const {Telegraf} = require('telegraf');
require('dotenv').config();
const statusCommand = require('./commands/botStatus');
const { MongoClient } = require('mongodb');
const config = require('../config.json');

const bot = config.general.localServer
    ? new Telegraf(process.env.BOT_TOKEN, { telegram: { apiRoot: config.general.localServer } })
    : new Telegraf(process.env.BOT_TOKEN);

const downloadYoutubeVideo = require('./downloaders/youtube_dl');
const downloadTikTokVideo = require('./downloaders/tiktok_dl')(bot);
const downloadInstagram = require('./downloaders/instagram_dl');
const downloadTwitterVideo = require('./downloaders/twitter_dl');
const downloadYoutubeMusic = require('./downloaders/youtube_music_dl');
const downloadRedditPost = require('./downloaders/reddit_dl');
const downloadPinterestPost = require('./downloaders/pinterest_dl');
const downloadSoundCloudMusic = require('./downloaders/soundcloud_dl');
const downloadFacebookVideo = require('./downloaders/facebook_dl');
const downloadSpotifyMusic = require('./downloaders/spotify_dl');

const helpMessage = require('./commands/helpMessage.json');
let isBotRunning = false;
const userLastLinkTime = {};

bot.start(async (ctx) => {
    isBotRunning = true;
    await ctx.reply(`Hi ${ctx.from.first_name ? ctx.from.first_name : 'user'}! Send me a link:`);
});

bot.help(async (ctx) => {
    try {
        const formattedHelpMessage = helpMessage.helpMessage.join('\n');
        await ctx.reply(formattedHelpMessage, {disable_web_page_preview: true});
    } catch (e) {
        console.error(e);
    }
});

bot.command('status', statusCommand);

bot.on('text', async (ctx) => {
    const {id: userId} = ctx.from;
    const {text, date: messageTime} = ctx.message;
    const currentTime = Math.floor(Date.now() / 1000);

    if (currentTime - messageTime > 60) {
        return;
    }

    let delayTime = config.general.delayTimeLimit;

    if (delayTime !== 0 && userLastLinkTime[userId] && Date.now() - userLastLinkTime[userId] < delayTime) {
        await ctx.reply(`You can send a link once in ${delayTime/1000} seconds`);
        return;
    }

    const youtubeUrls = text.match (/(https?:\/\/(?:www\.)?youtube\.com\/watch\?v=|https?:\/\/youtu\.be\/|https?:\/\/(?:www\.)?youtube\.com\/shorts\/)([\w-]{11})/gi);
    const tiktokUrls = text.match (/(https?:\/\/(?:www\.)?tiktok\.com\/(?:@[\w.-]+\/video\/[\w-]+|@[\w.-]+)|vm\.tiktok\.com\/[\w.-]+|vt\.tiktok\.com\/[\w.-]+)/gi);
    const instagramUrls = text.match (/https?:\/\/(?:www\.)?instagram\.com\/(?:([^\/]+)\/)?(?:p|tv|reel|reels|stories)\/([\w.-]+)/gi);
    const twitterUrls = text.match (/(https?:\/\/(?:www\.)?(?:twitter|x)\.com\/(?:[\w.-]+)\/status\/.+|https?:\/\/t\.co\/.+)/gi);
    const youtubeMusicUrls = text.match (/https?:\/\/music\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)(?:&(?:list|si)=([a-zA-Z0-9_-]+))?/gi);
    const redditUrls = text.match(/(https?:\/\/(?:www\.)?reddit\.com\/(?:r\/[^/]+\/comments\/|[^/]+\/comments\/)[\w-]+)/gi);
    const pinterestUrls= text.match (/(https?:\/\/(?:www\.)?(?:ru\.)?pinterest\.(com|co.uk)\/pin\/[\w.-]+)/gi);
    const soundcloudUrls = text.match(/https?:\/\/soundcloud\.com\/[\w.-]+\/[\w.-]+/gi);
    const facebookUrls = text.match(/https?:\/\/(?:www\.|)facebook\.com\/(?:watch\?v=\d+|[^\/]+\/videos\/\d+\/?|permalink\.php\?story_fbid=\d+&id=\d+|fb\.watch\/[a-zA-Z0-9_-]+\/?)\b/gi);
    const spotifyUrls = text.match(/https?:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]{22}/gi);

    if (redditUrls && redditUrls.length > 0) {
        await handleDownload(ctx, redditUrls, downloadRedditPost);
    } else if (youtubeMusicUrls && youtubeMusicUrls.length > 0) {
        await handleDownload(ctx, youtubeMusicUrls, downloadYoutubeMusic);
    } else if (youtubeUrls && youtubeUrls.length > 0) {
        await handleDownload(ctx, youtubeUrls, downloadYoutubeVideo);
    } else if (tiktokUrls && tiktokUrls.length > 0) {
        await handleDownload(ctx, tiktokUrls, downloadTikTokVideo);
    } else if (instagramUrls && instagramUrls.length > 0) {
        await handleDownload(ctx, instagramUrls, downloadInstagram);
    } else if (twitterUrls && twitterUrls.length > 0) {
        await handleDownload(ctx, twitterUrls, downloadTwitterVideo);
    } else if (pinterestUrls && pinterestUrls.length > 0) {
        await handleDownload(ctx, pinterestUrls, downloadPinterestPost);
    } else if (soundcloudUrls && soundcloudUrls.length > 0) {
        await handleDownload(ctx, soundcloudUrls, downloadSoundCloudMusic);
    } else if (facebookUrls && facebookUrls.length > 0) {
        await handleDownload(ctx, facebookUrls, downloadFacebookVideo);
    } else if (spotifyUrls && spotifyUrls.length > 0) {
        await handleDownload(ctx, spotifyUrls, downloadSpotifyMusic);
    } else {
        await ctx.reply('Unknown command');
    }
});

async function handleDownload(ctx, urls, downloaderFn) {
    for (const url of urls) {
        await downloaderFn(ctx, url);
    }
    userLastLinkTime[ctx.from.id] = Date.now();
}
bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));