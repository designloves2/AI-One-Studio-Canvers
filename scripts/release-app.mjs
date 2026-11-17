// Publishes the desktop app of the current version to its GitHub release:
//   - Canvers_<version>_windows-x64.zip   the files needed to run (unzip, run canvers.exe)  <- the download
//   - Canvers_<version>_x64-setup.exe + latest.json   what the app's auto-update reads
//   1. npm run app:build   (with TAURI_SIGNING_PRIVATE_KEY / _PASSWORD set; see docs/DESKTOP_APP.md)
//   2. the release vX.Y.Z must exist (gh release create ...)
//   3. node scripts/release-app.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
const rel = path.resolve('src-tauri/target/release');
const dir = path.join(rel, 'bundle/nsis');
const setup = fs.readdirSync(dir).find((f) => f.endsWith(`${version}_x64-setup.exe`));
if (!setup) throw new Error(`no ${version} installer in ${dir}: run npm run app:build`);
const sig = fs.readFileSync(path.join(dir, `${setup}.sig`), 'utf8').trim();
const out = path.join(rel, 'upload'); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });

// the zip: canvers.exe + what it carries (Node, the server, the built page)
const stage = path.join(out, 'Canvers'); fs.mkdirSync(stage);
fs.copyFileSync(path.join(rel, 'canvers.exe'), path.join(stage, 'canvers.exe'));
fs.cpSync(path.resolve('src-tauri/bundle'), stage, { recursive: true });
fs.writeFileSync(path.join(stage, 'README.txt'), `AI ONE Studio Canvers ${version}\r\n\r\nRun canvers.exe (no install needed). Keep the files in this folder together.\r\nYour work is saved in %APPDATA%\\cloud.tjtj.canvers\\.\r\nMenu: Connection > Connection settings (where ComfyUI is).\r\n`);
const zip = `Canvers_${version}_windows-x64.zip`;
execFileSync('tar', ['-a', '-c', '-f', path.join(out, zip), '-C', out, 'Canvers']);

// the auto-update files (a name without spaces: GitHub rewrites spaces in asset names)
const name = `Canvers_${version}_x64-setup.exe`;
fs.copyFileSync(path.join(dir, setup), path.join(out, name));
const repo = 'designloves2/AI-One-Studio-Canvers';
fs.writeFileSync(path.join(out, 'latest.json'), JSON.stringify({
  version, notes: `AI ONE Studio Canvers ${version}`, pub_date: new Date().toISOString(),
  platforms: { 'windows-x86_64': { signature: sig, url: `https://github.com/${repo}/releases/download/v${version}/${name}` } },
}, null, 2));
execFileSync('gh', ['release', 'upload', `v${version}`, path.join(out, zip), path.join(out, name), path.join(out, 'latest.json'), '--clobber', '--repo', repo], { stdio: 'inherit' });
console.log(`uploaded ${zip}, ${name}, latest.json to v${version}`);
