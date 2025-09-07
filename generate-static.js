#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the routes that need static HTML files
const routes = [
  { path: '/', title: 'TravelConnect - Local Travel Experiences', description: 'Connect with local hosts and discover authentic travel experiences around the world' },
  { path: '/map', title: 'Map - TravelConnect', description: 'Explore travel experiences on an interactive map and discover local adventures' },
  { path: '/feed', title: 'Feed - TravelConnect', description: 'See the latest travel experiences, tips, and stories from the community' },
  { path: '/timeline', title: 'Timeline - TravelConnect', description: 'Browse travel timelines and discover organized travel experiences' },
  { path: '/profile', title: 'Profile - TravelConnect', description: 'Manage your travel profile and connect with local hosts' },
  { path: '/chat', title: 'Chat - TravelConnect', description: 'Connect with travelers and local hosts through real-time messaging' },
  { path: '/config', title: 'Settings - TravelConnect', description: 'Configure your travel preferences and account settings' }
];

const distDir = path.join(__dirname, 'dist', 'public');
const templatePath = path.join(distDir, 'index.html');

// Read the base template
if (!fs.existsSync(templatePath)) {
  console.error('Build files not found. Run npm run build first.');
  process.exit(1);
}

const template = fs.readFileSync(templatePath, 'utf8');

// Generate static HTML for each route
routes.forEach(route => {
  if (route.path === '/') {
    // Root path uses the existing index.html
    return;
  }

  // Create directory for the route
  const routeDir = path.join(distDir, route.path);
  if (!fs.existsSync(routeDir)) {
    fs.mkdirSync(routeDir, { recursive: true });
  }

  // Customize the HTML for this route
  let customHtml = template
    .replace(/<title>.*?<\/title>/, `<title>${route.title}</title>`)
    .replace(/<meta name="description" content=".*?"/, `<meta name="description" content="${route.description}"`)
    .replace(/<meta property="og:title" content=".*?"/, `<meta property="og:title" content="${route.title}"`)
    .replace(/<meta property="og:description" content=".*?"/, `<meta property="og:description" content="${route.description}"`);

  // Write the customized HTML file
  const routeHtmlPath = path.join(routeDir, 'index.html');
  fs.writeFileSync(routeHtmlPath, customHtml);
  
  console.log(`Generated static page: ${route.path}`);
});

console.log('Static site generation complete!');
console.log('Generated pages:');
routes.forEach(route => {
  console.log(`  ${route.path} - ${route.title}`);
});