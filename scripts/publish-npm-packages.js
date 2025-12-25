#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const npmDir = path.join(__dirname, '..', 'npm');

console.log('Publishing npm platform packages...\n');

const platforms = fs.readdirSync(npmDir).filter(dir => {
  const fullPath = path.join(npmDir, dir);
  return fs.statSync(fullPath).isDirectory();
});

if (platforms.length === 0) {
  console.error('❌ No platform directories found in npm/');
  process.exit(1);
}

console.log(`Found ${platforms.length} platform(s) to publish:\n`);

let published = 0;
let skipped = 0;
let errors = [];

for (const platform of platforms) {
  const platformDir = path.join(npmDir, platform);
  const packageJsonPath = path.join(platformDir, 'package.json');

  // Check if package.json exists
  if (!fs.existsSync(packageJsonPath)) {
    console.log(`⚠️  Skipping ${platform}: No package.json found`);
    skipped++;
    continue;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    console.log(`📦 Publishing ${packageJson.name}@${packageJson.version}...`);
    
    // Run npm publish with provenance
    execSync('npm publish --access public --provenance', {
      cwd: platformDir,
      stdio: 'inherit',
      env: process.env
    });
    
    console.log(`✅ Successfully published ${packageJson.name}\n`);
    published++;
  } catch (error) {
    console.error(`❌ Error publishing ${platform}:`, error.message);
    errors.push({ platform, error: error.message });
  }
}

console.log('\n' + '='.repeat(60));
console.log(`Summary:`);
console.log(`  ✅ Published: ${published} packages`);
console.log(`  ⚠️  Skipped: ${skipped} packages`);
console.log(`  ❌ Errors: ${errors.length} packages`);
console.log('='.repeat(60));

if (errors.length > 0) {
  console.log('\nErrors:');
  errors.forEach(({ platform, error }) => {
    console.log(`  - ${platform}: ${error}`);
  });
  process.exit(1);
}

if (published === 0) {
  console.error('\n❌ No packages were published!');
  process.exit(1);
}

console.log('\n✅ All platform packages published successfully!');
