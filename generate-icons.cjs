const sharp = require('sharp');
const fs = require('fs');

const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#198754" />
  <circle cx="256" cy="256" r="200" fill="#ffffff" />
  <text x="256" y="320" font-family="Arial" font-size="180" font-weight="bold" fill="#198754" text-anchor="middle">GC</text>
</svg>
`;

if (!fs.existsSync('./public')) fs.mkdirSync('./public');
fs.writeFileSync('./public/icon.svg', svgIcon);

sharp(Buffer.from(svgIcon))
  .resize(192, 192)
  .png()
  .toFile('./public/pwa-192x192.png');

sharp(Buffer.from(svgIcon))
  .resize(512, 512)
  .png()
  .toFile('./public/pwa-512x512.png');

sharp(Buffer.from(svgIcon))
  .resize(512, 512)
  .png()
  .toFile('./public/pwa-maskable-512x512.png');

sharp(Buffer.from(svgIcon))
  .resize(180, 180)
  .png()
  .toFile('./public/apple-touch-icon.png');

console.log('Icons generated!');
