const fs = require('fs');
const path = require('path');

const binDir = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'bin');
const realNext = path.join(binDir, 'next-real');
const wrapper = path.join(binDir, 'next');

// If the wrapper is already in place, exit
if (fs.existsSync(realNext)) {
  console.log('[patch-bundler] already wrapped');
  process.exit(0);
}

// Check if the original next binary exists
if (!fs.existsSync(wrapper)) {
  console.log('[patch-bundler] next binary not found, skipping');
  process.exit(0);
}

// Move the original to next-real
fs.renameSync(wrapper, realNext);

// Create a wrapper that forces --webpack for dev/build commands
const wrapperContent = `#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const realNext = path.join(__dirname, 'next-real');
const args = process.argv.slice(2);

// Force --webpack flag for dev and build commands if not already specified
if (args[0] === 'dev' || args[0] === 'build' || args.length === 0) {
  const hasBundlerFlag = args.some(a => a === '--webpack' || a === '--turbo' || a === '--turbopack' || a === '--rspack');
  if (!hasBundlerFlag) {
    args.push('--webpack');
  }
}

const child = spawn(process.execPath, [realNext, ...args], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
`;

fs.writeFileSync(wrapper, wrapperContent);
fs.chmodSync(wrapper, 0o755);
console.log('[patch-bundler] wrapped next binary to force --webpack');
