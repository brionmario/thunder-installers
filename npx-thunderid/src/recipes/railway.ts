import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { log, select, text, isCancel, cancel } from '@clack/prompts';
import colors from 'picocolors';
import type { Recipe, DeployOptions } from '../lib/types';

interface RailwayProject {
  id: string;
  name: string;
}

function getRailwayToml(): string {
  return [`[build]`, `  builder = "dockerfile"`, ``, `[deploy]`, `  healthcheckTimeout = 300`].join('\n') + '\n';
}

const railway: Recipe = {
  id: 'railway',
  displayName: 'Railway',
  description: 'Simple deploys, built-in managed Postgres option',
  cliName: 'railway',
  installCmd: 'npm install -g @railway/cli',
  needsAppName: false,

  async preflight() {
    const auth = spawnSync('railway', ['whoami'], { stdio: 'pipe' });
    if (auth.status !== 0) {
      log.info('Not logged in to Railway — opening browser to authenticate...');
      execSync('railway login', { stdio: 'inherit' });
    }
  },

  async deploy({ dbType, dbUrl }: DeployOptions) {
    let appName: string | undefined;
    const cwd = process.cwd();

    let existingProjects: RailwayProject[] = [];
    try {
      const result = spawnSync('railway', ['list', '--json'], { stdio: 'pipe', encoding: 'utf8' });
      if (result.status === 0) existingProjects = JSON.parse(result.stdout) as RailwayProject[];
    } catch { /* ignore */ }

    let linkToProject: string | null = null;
    if (existingProjects.length > 0) {
      const choice = await select({
        message: 'Railway project:',
        options: [
          ...existingProjects.map((p) => ({ value: p.id, label: p.name })),
          { value: '__new__', label: 'Create new project' },
        ],
      });
      if (isCancel(choice)) {
        cancel('Deploy cancelled.');
        process.exit(0);
      }
      if (choice !== '__new__') linkToProject = choice as string;
    }

    fs.writeFileSync(path.join(cwd, 'railway.toml'), getRailwayToml(), 'utf8');
    log.success('Generated railway.toml');

    if (linkToProject) {
      log.info('Linking to existing Railway project...');
      execSync(`railway link -p "${linkToProject}"`, { stdio: 'inherit' });
    } else {
      const defaultName = `thunder-${Math.random().toString(36).slice(2, 7)}`;
      const appNameInput = await text({
        message: 'App name:',
        placeholder: defaultName,
        defaultValue: defaultName,
      });
      if (isCancel(appNameInput)) {
        cancel('Deploy cancelled.');
        process.exit(0);
      }
      appName = (appNameInput as string) || defaultName;
      log.info(`Initializing Railway project: ${colors.cyan(appName)}`);
      execSync(`railway init --name "${appName}"`, { stdio: 'inherit' });
    }

    if (dbType === 'postgres' && dbUrl) {
      log.info('Setting DATABASE_URL...');
      execSync(`railway variables set "DATABASE_URL=${dbUrl}"`, { stdio: 'inherit' });
    }

    log.info('Deploying (this takes a few minutes)...');
    execSync('railway up --detach', { stdio: 'inherit' });

    const domainResult = spawnSync('railway', ['domain'], { stdio: 'pipe', encoding: 'utf8' });
    const domain = domainResult.stdout?.trim();
    if (domain) {
      log.success(`${colors.bold(colors.green('Deployed!'))} ${colors.cyan(`https://${domain}`)}`);
    } else {
      log.success(
        `${colors.bold(colors.green('Deployed!'))} Run ${colors.cyan('railway open')} to view your app.`,
      );
    }
  },
};

export default railway;
