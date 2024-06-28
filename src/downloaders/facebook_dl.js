const axios = require('axios');
const fs = require('fs');
require('util');
const { promisify } = require('util');
const { maxVideoSize } = require('../handlers/links_handler');``

const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

const parseString = (string) => {
    try {
        return JSON.parse(`{"text": "${string}"}`).text;
    } catch (error) {
        throw new Error("Error parsing string");
    }
};

const getFBInfo = async (videoUrl, cookie, useragent) => {
    const headers = {
        "sec-fetch-mode": "navigate",
        "sec-fetch-user": "?1",
        "sec-ch-ua": '"Google Chrome";v="89", "Chromium";v="89", ";Not A Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-fetch-site": "none",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "accept-language": "en-GB,en;q=0.9,tr-TR;q=0.8,tr;q=0.7,en-US;q=0.6",
        authority: "www.facebook.com",
        "cache-control": "max-age=0",
        cookie: cookie || "sb=Rn8BYQvCEb2fpMQZjsd6L382; datr=Rn8BYbyhXgw9RlOvmsosmVNT; c_user=100003164630629; _fbp=fb.1.1629876126997.444699739; wd=1920x939; spin.r.1004812505_b.trunk_t.1638730393_s.1_v.2_; xs=28%3A8ROnP0aeVF8XcQ%3A2%3A1627488145%3A-1%3A4916%3A%3AAcWIuSjPy2mlTPuZAeA2wWzHzEDuumXI89jH8a_QIV8; fr=0jQw7hcrFdas2ZeyT.AWVpRNl_4noCEs_hb8kaZahs-jA.BhrQqa.3E.AAA.0.0.BhrQqa.AWUu879ZtCw",
        "upgrade-insecure-requests": "1",
        "user-agent": useragent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36"
    };

    if (!videoUrl || !videoUrl.trim() || !["facebook.com", "fb.watch"].some(domain => videoUrl.includes(domain))) {
        throw new Error("Please specify a valid Facebook URL");
    }

    try {
        const { data } = await axios.get(videoUrl, { headers });

        const sdMatch = data.match(/(?:"browser_native_sd_url"|"playable_url"|sd_src)\s*:\s*"([^"]*)"/);

        if (sdMatch && sdMatch[1]) {
            return {
                sd: parseString(sdMatch[1]),
            };
        } else {
            throw new Error("Unable to fetch video information at this time. Please try again");
        }
    } catch (error) {
        throw new Error("Unable to fetch video information at this time. Please try again");
    }
};

const downloadFacebookVideo = async (ctx, facebookVideoUrl, cookie, useragent) => {
    try {
        const videoInfo = await getFBInfo(facebookVideoUrl, cookie, useragent);

        const response = await axios({
            url: videoInfo.sd,
            method: 'GET',
            responseType: 'arraybuffer',
        });

        const videoFileName = `facebook_video_${Date.now()}.mp4`;
        await writeFileAsync(videoFileName, response.data);

        const videoFileSize = fs.statSync(videoFileName).size;
        if (videoFileSize > maxVideoSize) {
            await ctx.reply('Error: The video file is too large to send.');
            await unlinkAsync(videoFileName);
            return;
        }

        await ctx.replyWithVideo({ source: videoFileName });

        await unlinkAsync(videoFileName);
    } catch (error) {
        console.error('Error downloading Facebook video:', error);
        await ctx.reply('Error downloading Facebook video');
    }
};

// Export the functions for use in other modules
module.exports = downloadFacebookVideo;
