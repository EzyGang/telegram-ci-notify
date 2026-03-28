#!/usr/bin/env node
import { execSync } from 'child_process';
import { rmSync, renameSync } from 'fs';

console.log('Bundling GitHub Action...\n');

// Clean dist directory
rmSync('dist', { recursive: true, force: true });

// Bundle each entry point
const entries = [
  { input: 'src/pre.ts', output: 'dist/pre.js' },
  { input: 'src/main.ts', output: 'dist/main.js' },
  { input: 'src/post.ts', output: 'dist/post.js' }
];

for (const { input, output } of entries) {
  console.log(`Bundling ${input}...`);
  execSync(`npx ncc build ${input} -o dist/tmp --minify`, { stdio: 'inherit' });
  renameSync('dist/tmp/index.js', output);
  rmSync('dist/tmp', { recursive: true, force: true });
  console.log(`✓ Created ${output}\n`);
}

console.log('Bundle complete!');
