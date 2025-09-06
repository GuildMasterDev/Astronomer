#!/usr/bin/env node

import https from 'https';

// Test NASA APOD API
const apiKey = 'DEMO_KEY';
const apodUrl = `https://api.nasa.gov/planetary/apod?api_key=${apiKey}`;

console.log('🧪 Testing NASA APOD API...');

https.get(apodUrl, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('✅ APOD API Test Successful!');
      console.log('Title:', parsed.title);
      console.log('Date:', parsed.date);
      console.log('Media Type:', parsed.media_type);
      if (parsed.url) {
        console.log('URL:', parsed.url);
      }
    } catch (e) {
      console.error('❌ Failed to parse response:', e);
    }
  });
}).on('error', (e) => {
  console.error('❌ Request failed:', e);
});