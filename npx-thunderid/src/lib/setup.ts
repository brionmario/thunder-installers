import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { note } from '@clack/prompts';

export function findSetupScript(installPath: string): string | null {
  const rootScript = path.join(installPath, 'setup.sh');
  if (fs.existsSync(rootScript)) return rootScript;

  for (const entry of fs.readdirSync(installPath)) {
    const nested = path.join(installPath, entry, 'setup.sh');
    if (fs.existsSync(nested)) return nested;
  }

  return null;
}

export function findThunderRoot(installPath: string): string | null {
  const setupScript = findSetupScript(installPath);
  if (!setupScript) return null;
  return path.dirname(setupScript);
}

export function runSetup(installPath: string, args: string[] = []): void {
  if (process.platform === 'win32') {
    note(
      'setup.sh requires a Unix shell.\n' +
        'Open WSL or Git Bash, navigate to:\n' +
        `  ${installPath}\n` +
        'and run:  bash setup.sh',
      'Windows users',
    );
    process.exit(0);
  }

  const thunderRoot = findThunderRoot(installPath);
  if (!thunderRoot) {
    throw new Error(`setup.sh not found in ${installPath}`);
  }

  execFileSync('bash', ['setup.sh', ...args], { cwd: thunderRoot, stdio: 'inherit' });
}

export function runStart(installPath: string, args: string[] = []): void {
  if (process.platform === 'win32') {
    note(
      'Thunder requires a Unix shell to start.\n' +
        'Open WSL or Git Bash, navigate to:\n' +
        `  ${installPath}\n` +
        'and run the Thunder binary directly.',
      'Windows users',
    );
    process.exit(0);
  }

  const thunderRoot = findThunderRoot(installPath);
  if (!thunderRoot) {
    throw new Error(`Thunder installation not found in ${installPath}`);
  }

  const startScript = path.join(thunderRoot, 'start.sh');
  if (fs.existsSync(startScript)) {
    execFileSync('bash', ['start.sh', ...args], { cwd: thunderRoot, stdio: 'inherit' });
    return;
  }

  const binary = path.join(thunderRoot, 'thunder');
  if (fs.existsSync(binary)) {
    execFileSync(binary, args, { cwd: thunderRoot, stdio: 'inherit' });
    return;
  }

  throw new Error(`No start.sh or thunder binary found in ${thunderRoot}`);
}
