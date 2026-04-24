'use strict';

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { log, select, text, isCancel, cancel } = require('@clack/prompts');
const colors = require('picocolors');

function getRailwayToml() {
  return [
    `[build]`,
    `  builder = "dockerfile"`,
    ``,
    `[deploy]`,
    `  healthcheckTimeout = 300`,
  ].join('\n') + '\n';
}

const railway = {
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

  async deploy({ appName: _appName, dbType, dbUrl }) {
    let appName = _appName;
    const cwd = process.cwd();

    let existingProjects = [];
    try {
      const result = spawnSync('railway', ['list', '--json'], { stdio: 'pipe', encoding: 'utf8' });
      if (result.status === 0) existingProjects = JSON.parse(result.stdout);
    } catch (_) {}

    let linkToProject = null;
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
      if (choice !== '__new__') linkToProject = choice;
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
      appName = appNameInput || defaultName;
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
        `${colors.bold(colors.green('Deployed!'))} Run ${colors.cyan('railway open')} to view your app.`
      );
    }
  },
};

module.exports = railway;
