const fs = require('fs');
const path = require('path');

const nextDir = path.join(__dirname, '..', 'node_modules', 'next', 'dist');

// 1. Wrap the next binary to force --webpack flag and increase memory
const binDir = path.join(nextDir, 'bin');
const realNext = path.join(binDir, 'next-real');
const wrapper = path.join(binDir, 'next');

if (!fs.existsSync(realNext) && fs.existsSync(wrapper)) {
  fs.renameSync(wrapper, realNext);
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

// Increase memory limit to avoid OOM during webpack compilation
const existingMaxOldSpace = (process.env.NODE_OPTIONS || '').includes('max-old-space-size');
const nodeOptions = existingMaxOldSpace
  ? process.env.NODE_OPTIONS
  : [process.env.NODE_OPTIONS || '', '--max-old-space-size=3072'].filter(Boolean).join(' ');

const child = spawn(process.execPath, [realNext, ...args], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: nodeOptions,
  },
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
  console.log('[patch-bundler] wrapped next binary to force --webpack and increase memory');
}

// 2. Patch bundler.js to default to webpack instead of turbopack
function patchBundler(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  const oldDefault = `// The default is turbopack when nothing is configured.
    if (bundlerFlags.size === 0) {
        process.env.TURBOPACK = 'auto';
        return 0;
    }`;
  const newDefault = `// The default is webpack when nothing is configured (Turbopack WASM not supported).
    if (bundlerFlags.size === 0) {
        return 1;
    }`;
  if (content.includes(oldDefault)) {
    content = content.replace(oldDefault, newDefault);
    fs.writeFileSync(filePath, content);
    console.log(`[patch-bundler] patched ${path.basename(path.dirname(filePath))}/bundler.js to default to webpack`);
  }
}

patchBundler(path.join(nextDir, 'lib', 'bundler.js'));
patchBundler(path.join(nextDir, 'esm', 'lib', 'bundler.js'));

// 3. Patch server/next.js to not auto-set TURBOPACK=auto
function patchServerNext(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  const oldCode = `if (selectTurbopack || !selectWebpack) {
            process.env.TURBOPACK ??= selectTurbopack ? '1' : 'auto';
        }`;
  const newCode = `if (selectTurbopack) {
            process.env.TURBOPACK ??= '1';
        }`;
  if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(filePath, content);
    console.log(`[patch-bundler] patched ${path.relative(nextDir, filePath)} to not auto-set TURBOPACK`);
  }
}

patchServerNext(path.join(nextDir, 'server', 'next.js'));
patchServerNext(path.join(nextDir, 'esm', 'server', 'next.js'));

// 4. Patch build/index.js to default to webpack
function patchBuildIndex(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  const oldDefault = 'bundler = _bundler.Bundler.Turbopack, experimentalBuildMode';
  const newDefault = 'bundler = _bundler.Bundler.Webpack, experimentalBuildMode';
  if (content.includes(oldDefault)) {
    content = content.replace(oldDefault, newDefault);
    fs.writeFileSync(filePath, content);
    console.log(`[patch-bundler] patched ${path.relative(nextDir, filePath)} to default to webpack`);
  }
}

patchBuildIndex(path.join(nextDir, 'build', 'index.js'));
patchBuildIndex(path.join(nextDir, 'esm', 'build', 'index.js'));

console.log('[patch-bundler] done');
