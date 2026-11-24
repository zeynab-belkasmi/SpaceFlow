// Starts the API and the web client together: `npm run dev` from the repository root.
// Each line of output is prefixed with its source; Ctrl+C (or one process crashing) stops both.
import { spawn } from 'node:child_process';

const processes = [
  { name: 'api', color: 36, workspace: 'backend' }, // cyan
  { name: 'web', color: 35, workspace: 'frontend' }, // magenta
];

const children = processes.map(({ name, color, workspace }) => {
  // `shell: true` lets Windows find npm.cmd as well as npm on macOS/Linux.
  const child = spawn(`npm run dev -w ${workspace}`, { shell: true, env: process.env });
  const prefix = `\x1b[${color}m[${name}]\x1b[0m `;
  const forward = (stream, out) =>
    stream.on('data', (chunk) => {
      for (const line of chunk.toString().split(/\r?\n/)) {
        if (line.trim()) out.write(prefix + line + '\n');
      }
    });
  forward(child.stdout, process.stdout);
  forward(child.stderr, process.stderr);
  child.on('exit', (code) => {
    console.log(`${prefix}exited with code ${code ?? 0}`);
    stopAll(code ?? 0);
  });
  return child;
});

let stopping = false;
function stopAll(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null) {
      // On Windows, kill the whole process tree (npm → node → vite), not just the shell.
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(child.pid), '/t', '/f']);
      } else {
        child.kill('SIGTERM');
      }
    }
  }
  setTimeout(() => process.exit(code), 500);
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
