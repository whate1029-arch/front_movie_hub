#!/usr/bin/env node

/**
 * Deployment Preparation Script
 * Helps prepare the MovieHub platform for deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 MovieHub Deployment Preparation\n');

// Check if required files exist
const requiredFiles = [
  'package.json',
  'backend/package.json',
  'backend/src/app.ts',
  'pages/index.tsx'
];

console.log('📋 Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing. Please ensure all files are present.');
  process.exit(1);
}

// Check package.json scripts
console.log('\n📦 Checking build scripts...');

const frontendPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const backendPackage = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));

// Frontend checks
if (frontendPackage.scripts.build) {
  console.log('✅ Frontend build script found');
} else {
  console.log('❌ Frontend build script missing');
}

if (frontendPackage.scripts.start) {
  console.log('✅ Frontend start script found');
} else {
  console.log('❌ Frontend start script missing');
}

// Backend checks
if (backendPackage.scripts.build) {
  console.log('✅ Backend build script found');
} else {
  console.log('❌ Backend build script missing');
}

if (backendPackage.scripts.start) {
  console.log('✅ Backend start script found');
} else {
  console.log('❌ Backend start script missing');
}

// Check environment files
console.log('\n🔧 Checking environment configuration...');

if (fs.existsSync('.env.production')) {
  console.log('✅ Frontend production env template found');
} else {
  console.log('⚠️  Frontend production env template not found');
}

if (fs.existsSync('backend/.env.production')) {
  console.log('✅ Backend production env template found');
} else {
  console.log('⚠️  Backend production env template not found');
}

// Generate deployment checklist
console.log('\n📝 Deployment Checklist:');
console.log('');
console.log('🔑 API Keys Required:');
console.log('  □ OMDB API Key (http://www.omdbapi.com/)');
console.log('  □ TMDB API Key (https://www.themoviedb.org/settings/api)');
console.log('');
console.log('🏗️  Platform Accounts:');
console.log('  □ GitHub account (for code repository)');
console.log('  □ Railway account (for backend + database)');
console.log('  □ Vercel account (for frontend)');
console.log('');
console.log('⚙️  Configuration:');
console.log('  □ Set environment variables in Railway');
console.log('  □ Set environment variables in Vercel');
console.log('  □ Update CORS settings with production URLs');
console.log('  □ Run database migrations');
console.log('');
console.log('🚀 Deployment Steps:');
console.log('  1. Push code to GitHub');
console.log('  2. Deploy backend to Railway');
console.log('  3. Deploy frontend to Vercel');
console.log('  4. Configure environment variables');
console.log('  5. Test the deployment');
console.log('');

// Check for potential issues
console.log('⚠️  Potential Issues to Watch:');
console.log('  • CORS errors (check FRONTEND_URL in backend)');
console.log('  • Database connection (verify DATABASE_URL)');
console.log('  • API rate limits (OMDB: 1000/day, TMDB: varies)');
console.log('  • Railway $5/month credit usage');
console.log('');

console.log('📖 For detailed instructions, see DEPLOYMENT.md');
console.log('');
console.log('✨ Ready for deployment! Good luck! 🎬');