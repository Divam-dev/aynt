const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const ffmpegPath = require('ffmpeg-static');
const { spawn } = require('child_process');
const { maxVideoSize } = require('../handlers/links_handler');

// Spotify API credentials
const clientId = 'acc6302297e040aeb6e4ac1fbdfd62c3';
const clientSecret = '0e8439a1280a43aba9a5bc0a16f3f009';
const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
const tokenUrl = 'https://accounts.spotify.com/api/token';

const findYouTubeVideo = async (songName, artistName) => {
    const searchTerms = `${songName} ${artistName}`;
    const searchResults = await ytSearch(searchTerms);

    if (searchResults && searchResults.videos && searchResults.videos.length > 0) {
        return searchResults.videos[0].url;
    } else {
        return null;
    }
};

const downloadYouTubeVideo = async (videoUrl, outputFileName, artworkFileName) => {
    try {
        const videoInfo = await ytdl.getBasicInfo(videoUrl);

        if (!videoInfo.formats || videoInfo.formats.length === 0) {
            console.error('No video formats found.');
            return null;
        }

        const ffmpegCommand = ffmpeg({ timeout: 10 * 60 })
            .input(ytdl(videoUrl, { quality: 'highestaudio' }))
            .audioBitrate(256)
            .audioFilter('volume=0.3');

        if (artworkFileName) {
            ffmpegCommand.input(artworkFileName);
        }

        ffmpegCommand
            .save(outputFileName)
            .format('mp3');

        await new Promise((resolve, reject) => {
            ffmpegCommand
                .on('end', resolve)
                .on('error', reject);
        });

        const stats = fs.statSync(outputFileName);
        const fileSizeInBytes = stats.size;

        if (fileSizeInBytes > maxVideoSize) {
            console.error('Downloaded file size exceeds the maximum limit.');

            // Delete the downloaded file
            await fs.promises.unlink(outputFileName);

            // Delete the album artwork file if it exists
            if (artworkFileName && fs.existsSync(artworkFileName)) {
                try {
                    await fs.promises.unlink(artworkFileName);
                    console.log('Deleted album artwork file.');
                } catch (unlinkError) {
                    console.error('Error deleting album artwork file:', unlinkError);
                }
            }

            return null;
        }

        return outputFileName;
    } catch (error) {
        console.error('Error in downloadYouTubeVideo:', error);
        return null;
    }
};


// Spotify API function to get data
const getSpotifyTrackInfo = async (spotifyTrackUrl) => {
    const trackId = extractTrackIdFromUrl(spotifyTrackUrl);
    const accessToken = await getToken();

    const trackUrl = `https://api.spotify.com/v1/tracks/${trackId}`;
    const trackResponse = await axios.get(trackUrl, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    const albumId = trackResponse.data.album.id;
    const albumInfo = await getSpotifyAlbumInfo(albumId, accessToken);

    return {
        songName: trackResponse.data.name,
        artistName: trackResponse.data.artists[0].name,
        albumName: albumInfo.name,
        albumArtworkUrl: albumInfo.images.length > 0 ? albumInfo.images[0].url : null,
    };
};

const getSpotifyAlbumInfo = async (albumId, accessToken) => {
    const albumUrl = `https://api.spotify.com/v1/albums/${albumId}`;
    const albumResponse = await axios.get(albumUrl, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    return albumResponse.data;
};

const extractTrackIdFromUrl = (spotifyTrackUrl) => {
    const match = spotifyTrackUrl.match(/\/track\/(\w+)/);
    return match ? match[1] : null;
};

const getToken = async () => {
    const response = await axios.post(
        tokenUrl,
        'grant_type=client_credentials',
        {
            headers: {
                Authorization: `Basic ${authString}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        }
    );

    return response.data.access_token;
};

const downloadSpotifyMusic = async (ctx, url) => {
    try {

        const { songName, artistName, albumArtworkUrl } = await getSpotifyTrackInfo(url);

        const videoUrl = await findYouTubeVideo(songName, artistName);

        if (videoUrl) {

            const downloadedFileName = 'song.mp3';

            const artworkFileName = 'album_artwork.jpg';
            if (albumArtworkUrl) {
                const artworkResponse = await axios.get(albumArtworkUrl, { responseType: 'arraybuffer' });
                fs.writeFileSync(artworkFileName, Buffer.from(artworkResponse.data));
            }

            const downloadedFilePath = await downloadYouTubeVideo(videoUrl, downloadedFileName, artworkFileName);

            if (!downloadedFilePath) {
                await ctx.reply('Error: Video size exceeds the maximum limit.');
                return;
            }

            console.log('Download completed.');

            const outputFileName = `${songName} (${artistName}).mp3`;

            const mp3FilePath = downloadedFilePath;
            const imageFilePath = 'album_artwork.jpg';
            const outputFilePath = outputFileName;

            const ffmpegCommand = [
                '-i', mp3FilePath,
                '-i', imageFilePath,
                '-map', '0:0',
                '-map', '1:0',
                '-c', 'copy',
                '-id3v2_version', '3',
                '-metadata:s:v', 'title=Album cover',
                outputFilePath
            ];

            await new Promise((resolve, reject) => {
                console.log('Starting FFmpeg process...');
                const ffmpegProcess = spawn(ffmpegPath, ffmpegCommand, { stdio: 'ignore' });

                ffmpegProcess.on('close', (code) => {
                    if (code === 0) {
                        console.log('FFmpeg process completed.');
                        resolve();
                    } else {
                        console.error(`FFmpeg process exited with code ${code}`);
                        reject(`FFmpeg process exited with code ${code}`);
                    }
                });

                ffmpegProcess.on('error', (err) => {
                    console.error('FFmpeg process error:', err);
                    reject(err);
                });
            });

            console.log(`MP3 file merged with image. Output file: ${outputFilePath}`);

            await ctx.replyWithAudio({ source: outputFilePath });

            console.log('Sent the merged file to the user.');

            try {
                await fs.promises.unlink(mp3FilePath);
                await fs.promises.unlink(imageFilePath);
                await fs.promises.unlink(outputFilePath);
                console.log('Removed the downloaded files.');
            } catch (unlinkError) {
                console.error('Error removing downloaded files:', unlinkError);
            }

        } else {
            console.log('No video found.');
            await ctx.reply('No video found.');
        }
    } catch (error) {
        console.error('Error:', error.message);
        await ctx.reply(`Error: ${error.message}`);
    }
};

module.exports = downloadSpotifyMusic;