const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const venvDir = path.join(process.cwd(), '.venv');
const isWin = process.platform === 'win32';
const venvPython = isWin
  ? path.join(venvDir, 'Scripts', 'python.exe')
  : path.join(venvDir, 'bin', 'python');

console.log('--- Setting up Python virtual environment for yt-dlp ---');
console.log('Venv Directory:', venvDir);
console.log('Target Python Executable:', venvPython);

if (!fs.existsSync(venvPython)) {
  const pyCmd = isWin ? 'python' : 'python3';
  console.log(`Creating .venv using ${pyCmd}...`);
  execSync(`${pyCmd} -m venv "${venvDir}"`, { stdio: 'inherit' });
}

console.log('Installing/Upgrading pip and yt-dlp inside .venv...');
execSync(`"${venvPython}" -m pip install --upgrade pip yt-dlp`, { stdio: 'inherit' });

console.log('Verifying yt-dlp installation in .venv...');
const version = execSync(`"${venvPython}" -m yt_dlp --version`, { encoding: 'utf-8' }).trim();
console.log(`✅ Successfully verified yt-dlp in .venv: v${version}`);
