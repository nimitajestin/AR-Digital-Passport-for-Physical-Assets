'use strict';
// Prints the URLs where this machine's backend+frontend are reachable
// (hotspot IP for the phone demo). Usage: npm run phone (laptop on phone hotspot).
const os = require('os');

let port = 3000;
try {
  // eslint-disable-next-line global-require
  const config = require('../src/config');
  port = config.port;
} catch (e) { /* default port */ }

const nets = os.networkInterfaces();
const SKIP = /(warp|cloudflare|virtualbox|vmware|vethernet|wsl|bluetooth|tailscale|hamachi)/i;
const ips = [];
for (const [name, list] of Object.entries(nets)) {
  if (SKIP.test(name)) continue;
  for (const n of list || []) {
    if (n.family === 'IPv4' && !n.internal && !n.address.startsWith('192.168.56.')) {
      ips.push({ name, address: n.address });
    }
  }
}
if (!ips.length) {
  console.log('No hotspot IPv4 found — is the laptop connected to the phone hotspot?');
  process.exit(1);
}
console.log('AR Digital Passport — open one of these on your phone (same network):');
for (const { address } of ips) {
  console.log(`  http://${address}:${port}/            (landing)`);
  console.log(`  http://${address}:${port}/ar/          (AR scanner)`);
  console.log(`  http://${address}:${port}/dashboard/   (admin dashboard)`);
}
console.log('Camera needs HTTPS or chrome://flags "Insecure origins treated as secure" for the http URL.');
