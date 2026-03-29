const https = require('https');
const fs = require('fs');

const API_KEY = process.env.YOUTUBE_API_KEY || ""; // Provide explicitly if needed, or read from .env.local
let apiKey = API_KEY;
if (!apiKey) {
    const env = fs.readFileSync('.env.local', 'utf8');
    const match = env.match(/YOUTUBE_API_KEY=(.+)/);
    if (match) apiKey = match[1].trim();
}

const url = `https://youtube.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=mG_R_Yy-fow&key=${apiKey}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const json = JSON.parse(data);
        console.log("Videos:", json.items.map(item => ({
            title: item.snippet.title,
            duration: item.contentDetails?.duration
        })));
    });
});
