import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const isWindows = process.platform === 'win32';

export function findSetupScript(installPath: string): string | null {
  const scriptName = isWindows ? 'setup.ps1' : 'setup.sh';

  const rootScript = path.join(installPath, scriptName);
  if (fs.existsSync(rootScript)) return rootScript;

  for (const entry of fs.readdirSync(installPath)) {
    const nested = path.join(installPath, entry, scriptName);
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
  const thunderRoot = findThunderRoot(installPath);
  if (!thunderRoot) {
    throw new Error(`setup script not found in ${installPath}`);
  }

  if (isWindows) {
    execFileSync('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', 'setup.ps1', ...args], {
      cwd: thunderRoot,
      stdio: 'inherit',
    });
  } else {
    execFileSync('bash', ['setup.sh', ...args], { cwd: thunderRoot, stdio: 'inherit' });
  }
}

export function runStart(installPath: string, args: string[] = []): void {
  const thunderRoot = findThunderRoot(installPath);
  if (!thunderRoot) {
    throw new Error(`Thunder installation not found in ${installPath}`);
  }

  if (isWindows) {
    const startPs1 = path.join(thunderRoot, 'start.ps1');
    if (fs.existsSync(startPs1)) {
      execFileSync('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', 'start.ps1', ...args], {
        cwd: thunderRoot,
        stdio: 'inherit',
      });
      return;
    }
    const binary = path.join(thunderRoot, 'thunderid.exe');
    if (fs.existsSync(binary)) {
      execFileSync(binary, args, { cwd: thunderRoot, stdio: 'inherit' });
      return;
    }
    throw new Error(`No start.ps1 or thunderid.exe found in ${thunderRoot}`);
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
