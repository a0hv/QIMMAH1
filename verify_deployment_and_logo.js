const http = require('http');
const fs = require('fs');
const path = require('path');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: Buffer.concat(data)
        });
      });
    }).on('error', reject);
  });
}

async function verifyDeployment() {
  console.log('--- VERIFYING LOGO & DEPLOYMENT CONFIGURATIONS ---\n');

  // 1. Verify Logo file delivery over HTTP
  const logoRes = await get('http://localhost:3000/assets/images/logo.png');
  console.log('Logo HTTP Status:', logoRes.status, 'Size:', logoRes.data.length, 'Content-Type:', logoRes.headers['content-type']);
  if (logoRes.status !== 200 || logoRes.data.length < 1000) {
    throw new Error('Logo is not served properly!');
  }
  console.log('✅ Logo image serves successfully over HTTP.');

  // 2. Verify Favicon HTTP
  const favRes = await get('http://localhost:3000/favicon.ico');
  console.log('Favicon HTTP Status:', favRes.status, 'Size:', favRes.data.length);
  if (favRes.status !== 200) {
    throw new Error('Favicon is not served properly!');
  }
  console.log('✅ Favicon serves successfully over HTTP.');

  // 3. Verify Vercel configuration
  const vercelJson = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  if (!vercelJson.version || !vercelJson.routes) {
    throw new Error('Invalid vercel.json!');
  }
  const apiEntry = require('./api/index');
  if (typeof apiEntry !== 'function') {
    throw new Error('api/index.js must export the Express app!');
  }
  console.log('✅ Vercel config & api/index.js entry point verified successfully.');

  // 4. Verify Netlify configuration
  const netlifyToml = fs.readFileSync('netlify.toml', 'utf8');
  if (!netlifyToml.includes('netlify/functions') || !netlifyToml.includes('/api/*')) {
    throw new Error('Invalid netlify.toml!');
  }
  const netlifyHandler = require('./netlify/functions/api');
  if (typeof netlifyHandler.handler !== 'function') {
    throw new Error('netlify/functions/api.js must export handler!');
  }
  console.log('✅ Netlify config & functions/api.js entry point verified successfully.');

  // 5. Verify .gitignore
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  if (!gitignore.includes('node_modules')) {
    throw new Error('.gitignore must include node_modules!');
  }
  console.log('✅ .gitignore verified successfully.');

  console.log('\n🎉 ALL LOGO & HOSTING CONFIGURATIONS ARE 100% READY FOR VERCEL & NETLIFY DEPLOYMENT!');
}

verifyDeployment().catch(err => {
  console.error(err);
  process.exit(1);
});
