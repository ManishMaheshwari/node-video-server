import http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Store attempt counts for each endpoint
const attemptCounts = {};

const robotsTxt = `User-agent: *
Disallow: /
`;

const server = http.createServer((req, res) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }
  console.log('Request Headers:', req.headers);

  if (req.url === '/robots.txt') {
    console.log(`request for robots.txt at ${Date.now()}`);
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400', // cache for 1 day
    });
    res.end(robotsTxt);
    return;
  }

  if (req.url === '/cc.jpg') {
    // Sanitize and resolve the file path
    console.log(`request for cc.jpg at ${Date.now()}`);
    fs.readFile("cc.jpg", function(error, content) {
               res.writeHead(200, { 'Content-Type': 'image/jpeg'});
               res.end(content, 'utf-8');
       });

    
    // const filePath = path.join(process.cwd(), 'public', 'cc.jpg');
    // console.log(`filePath ${filePath}`);
    // fs.stat(filePath, (err, stats) => {
    //   if (err || !stats.isFile()) {
    //     res.writeHead(404, { 'Content-Type': 'text/plain' });
    //     res.end('404 Not Found');
    //     return;
    //   }
    //   res.writeHead(200, {
    //     'Content-Type': 'image/jpeg',
    //     'Content-Length': stats.size,
    //     'Cache-Control': 'public, max-age=86400', // cache for 1 day
    //   });
    //   console.log(`Starting`);
    //   const readStream = fs.createReadStream(filePath);
    //   readStream.pipe(res);
    //   console.log(`Starting a`);
    //   readStream.on('error', () => {
    //     res.writeHead(500, { 'Content-Type': 'text/plain' });
    //     res.end('500 Internal Server Error');
    //   });
    // });
     console.log(`Starting bb`);
    return;
  }

  // Set CORS headers for all responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.setHeader('Content-Type', 'application/json');

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const forceError = url.searchParams.get('forceError');
  const local = url.searchParams.get('local');

  // Only handle /video/1 through /video/100
  const videoMatch = path.match(/^\/video\/([1-9]|[1-9]\d{1,3}|1\d{4}|20000)$/);
  if (!videoMatch) {
    res.writeHead(404);
    res.end(JSON.stringify({
      error: 'Invalid endpoint',
      message: 'Only endpoints /video/1 through /video/100 are available'
    }));
    return;
  }
  const videosUrls = [
    "https://www.pexels.com/download/video/17169505/",
    "https://www.pexels.com/download/video/27831511/",
    "https://www.pexels.com/download/video/15283135/",
    "https://www.pexels.com/download/video/15283202/",
    "https://www.pexels.com/download/video/15283199/",
    "https://www.pexels.com/download/video/15283174/",
    "https://www.pexels.com/download/video/15612910/",
    "https://www.pexels.com/download/video/20422317/",
    "https://www.pexels.com/download/video/14993748/"
  ];


  const videoId = videoMatch[1];
  const endpointKey = `video-${videoId}`;
  const videoUrl = videosUrls[videoId%videosUrls.length];

  if(forceError && forceError === '429'){
    console.log(`request for ${url} with 429 at ${Date.now()}`);
    res.writeHead(429, {
      'Retry-After': '5'
    });
    res.end(JSON.stringify({
      status: 429,
      message: 'Too many requests. Try later',
    }));
    return;
  }
  if(forceError && forceError === '404'){
    console.log(`request for ${url} with 404 at ${Date.now()}`);
    res.writeHead(404);
    res.end(JSON.stringify({
      status: 404,
      message: 'Not found',
    }));
    return;
  }
  if(forceError && forceError === '400'){
    console.log(`request for ${url} with 400 at ${Date.now()}`);
    res.writeHead(400);
    res.end(JSON.stringify({
      status: 400,
      message: '400 Not found check header',
    }));
    return;
  }

  // Initialize or increment attempt count
  attemptCounts[endpointKey] = (attemptCounts[endpointKey] || 0) + 1;
  const currentAttempt = attemptCounts[endpointKey];



  // First two attempts return "retry later"
  if (currentAttempt <= 2) {
    console.log(`request attempt ${currentAttempt} for video#${videoId} with url - ${videosUrls[videoId%videosUrls.length]} at ${Date.now()}`);
    res.writeHead(202, {
      'Retry-After': '40',
      'delayed-fetch': 'no-check'
    });
    res.end(JSON.stringify({
      status: 202,
      message: 'Please retry later',
      attempt: currentAttempt,
      videoId
    }));
    return;
  }

  // Third attempt and beyond return success
  if(local && local === 'true'){
    console.log(`request attempt ${currentAttempt} for video#${videoId} with local file v1.mp4 at ${Date.now()} - Sucess`);
    fs.readFile("v1.mp4", function(error, content) {
               res.writeHead(200, { 'Content-Type': 'application/octet-stream',  'Content-disposition': 'attachment; filename=v1.mp4'});
               res.end(content, 'utf-8');
       });
  }else{
    console.log(`request attempt ${currentAttempt} for video#${videoId} with url - ${videosUrls[videoId%videosUrls.length]} at ${Date.now()} - Sucess`);
    res.writeHead(307, {
        'Location': videoUrl,
    });
    res.end();
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
