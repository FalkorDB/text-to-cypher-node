#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const packageJson = require('../package.json');

const platforms = [
  {
    name: 'darwin-x64',
    dir: 'darwin-x64',
    os: ['darwin'],
    cpu: ['x64'],
    node: 'text-to-cypher.darwin-x64.node',
    triple: 'x86_64-apple-darwin'
  },
  {
    name: 'darwin-arm64',
    dir: 'darwin-arm64',
    os: ['darwin'],
    cpu: ['arm64'],
    node: 'text-to-cypher.darwin-arm64.node',
    triple: 'aarch64-apple-darwin'
  },
  {
    name: 'win32-x64-msvc',
    dir: 'win32-x64-msvc',
    os: ['win32'],
    cpu: ['x64'],
    node: 'text-to-cypher.win32-x64-msvc.node',
    triple: 'x86_64-pc-windows-msvc'
  },
  {
    name: 'linux-x64-gnu',
    dir: 'linux-x64-gnu',
    os: ['linux'],
    cpu: ['x64'],
    libc: ['glibc'],
    node: 'text-to-cypher.linux-x64-gnu.node',
    triple: 'x86_64-unknown-linux-gnu'
  },
  {
    name: 'linux-arm64-gnu',
    dir: 'linux-arm64-gnu',
    os: ['linux'],
    cpu: ['arm64'],
    libc: ['glibc'],
    node: 'text-to-cypher.linux-arm64-gnu.node',
    triple: 'aarch64-unknown-linux-gnu'
  },
  {
    name: 'linux-x64-musl',
    dir: 'linux-x64-musl',
    os: ['linux'],
    cpu: ['x64'],
    libc: ['musl'],
    node: 'text-to-cypher.linux-x64-musl.node',
    triple: 'x86_64-unknown-linux-musl'
  },
  {
    name: 'linux-arm64-musl',
    dir: 'linux-arm64-musl',
    os: ['linux'],
    cpu: ['arm64'],
    libc: ['musl'],
    node: 'text-to-cypher.linux-arm64-musl.node',
    triple: 'aarch64-unknown-linux-musl'
  }
];

console.log('Creating npm platform packages...\n');

let createdPackages = 0;
let skippedPackages = 0;
let errors = [];

for (const platform of platforms) {
  const platformDir = path.join(__dirname, '..', 'npm', platform.dir);
  const packageJsonPath = path.join(platformDir, 'package.json');
  const nodeFilePath = path.join(platformDir, platform.node);

  // Check if the .node file exists
  if (!fs.existsSync(nodeFilePath)) {
    console.log(`⚠️  Skipping ${platform.name}: ${platform.node} not found`);
    skippedPackages++;
    continue;
  }

  const platformPackageJson = {
    name: `@falkordb/text-to-cypher-${platform.name}`,
    version: packageJson.version,
    os: platform.os,
    cpu: platform.cpu,
    main: platform.node,
    description: packageJson.description,
    repository: packageJson.repository,
    license: packageJson.license,
    engines: packageJson.engines,
    publishConfig: {
      access: 'public'
    }
  };

  // Add libc constraint if specified
  if (platform.libc) {
    platformPackageJson.libc = platform.libc;
  }

  try {
    fs.writeFileSync(packageJsonPath, JSON.stringify(platformPackageJson, null, 2) + '\n');
    console.log(`✅ Created package.json for ${platform.name}`);
    console.log(`   File: ${platform.node}`);
    console.log(`   Size: ${fs.statSync(nodeFilePath).size} bytes\n`);
    createdPackages++;
  } catch (error) {
    console.error(`❌ Error creating package.json for ${platform.name}:`, error.message);
    errors.push({ platform: platform.name, error: error.message });
  }
}

console.log('\n' + '='.repeat(60));
console.log(`Summary:`);
console.log(`  ✅ Created: ${createdPackages} packages`);
console.log(`  ⚠️  Skipped: ${skippedPackages} packages (missing .node file)`);
console.log(`  ❌ Errors: ${errors.length} packages`);
console.log('='.repeat(60));

if (errors.length > 0) {
  console.log('\nErrors:');
  errors.forEach(({ platform, error }) => {
    console.log(`  - ${platform}: ${error}`);
  });
  process.exit(1);
}

if (createdPackages === 0) {
  console.error('\n❌ No packages were created! This likely means no .node files were found.');
  console.error('   Check that artifacts were downloaded correctly.');
  process.exit(1);
}

console.log('\n✅ All platform packages created successfully!');
