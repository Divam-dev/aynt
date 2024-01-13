const axios = require("axios");
const cheerio = require('cheerio');
require('querystring');
const instagramGetUrl = async (url) => {
    try {
        const response = await axios.post(
            "https://saveig.app/api/ajaxSearch",
            require('querystring').stringify({ q: url, t: "media", lang: "en" }), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Origin': 'https://saveig.app/en',
                    'Referer': 'https://saveig.app/en',
                    'Referrer-Policy': 'strict-origin-when-cross-origin',
                    'User-Agent': 'PostmanRuntime/7.31.1'
                }
            }
        );
        const $ = cheerio.load(response.data.data);
        const data = [];
        $('div[class="download-items__btn"]').each((i, e) => {
            data.push({
                type: $(e).find('a').attr('href').match('.jpg') ? 'image' : 'video',
                url: $(e).find('a').attr('href')
            });
        });
        return {
            status: data.length > 0,
            data
        };
    } catch (error) {
        console.error('Error in instagramGetUrl:', error);
        return {
            status: false,
            msg: error.message
        };
    }
};
const downloadInstagram = async (ctx, link) => {
    try {
        const result = await instagramGetUrl(link);
        if (!result.status) throw new Error('Failed to get media links');

        for (const item of result.data) {
            if (item.type === 'video') {
                await ctx.telegram.sendVideo(ctx.chat.id, item.url);
            } else if (item.type === 'image') {
                await ctx.telegram.sendPhoto(ctx.chat.id, item.url);
            }
        }
    } catch (error) {
        console.error('Error in downloadInstagram:', error);
        await ctx.reply('Error downloading the file: ' + error.message);
    }
};

module.exports = downloadInstagram;