#!/usr/bin/env node
/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
'use strict';

const path = require('path');
const fs = require('fs');
const { intro, outro, text, spinner, note, cancel, isCancel } = require('@clack/prompts');
const colors = require('picocolors');

const { readState, writeState, STATE_DIR } = require('../lib/state');
const { downloadAndExtract } = require('../lib/download');
const { runSetup } = require('../lib/setup');

const VERSION = require('../package.json').version;

async function main() {
  // eslint-disable-next-line no-console
  console.clear();

  const state = readState();
  const alreadyInstalled = state?.version === VERSION && fs.existsSync(state.installPath);

  intro(
    `${
      colors.blueBright(
        `
████████╗██╗  ██╗██╗   ██╗███╗   ██╗██████╗ ███████╗██████╗
╚══██╔══╝██║  ██║██║   ██║████╗  ██║██╔══██╗██╔════╝██╔══██╗
   ██║   ███████║██║   ██║██╔██╗ ██║██║  ██║█████╗  ██████╔╝`,
      ) +
      colors.cyanBright(
        `
   ██║   ██╔══██║██║   ██║██║╚██╗██║██║  ██║██╔══╝  ██╔══██╗
   ██║   ██║  ██║╚██████╔╝██║ ╚████║██████╔╝███████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═════╝ ╚══════╝╚═╝  ╚═╝
`,
      )
    }\n` +
      `          ${colors.yellow('⚡')} ${colors.bold(colors.white(`Thunder v${VERSION}`))}${colors.dim(
        colors.gray(' · Lightweight Identity Server'),
      )}\n`,
  );

  let installPath;

  if (alreadyInstalled) {
    installPath = state.installPath;
    note(`Using Thunder v${VERSION}\n${installPath}`, 'Already installed');
  } else {
    const defaultPath = path.join(STATE_DIR, VERSION);

    const rawInstallPath = await text({
      message: 'Install directory',
      placeholder: defaultPath,
      defaultValue: defaultPath,
    });

    if (isCancel(rawInstallPath)) {
      cancel('Installation cancelled.');
      process.exit(0);
    }

    installPath = rawInstallPath || defaultPath;

    const s = spinner();
    s.start(`Downloading Thunder v${VERSION}...`);

    try {
      await downloadAndExtract(VERSION, installPath, (msg) => s.message(msg));
    } catch (err) {
      s.stop('Download failed.');
      process.stderr.write(`\nError: ${err.message}\n`);
      process.exit(1);
    }

    s.stop(`Thunder v${VERSION} installed to ${installPath}`);
    writeState(VERSION, installPath);

    outro('Starting Thunder setup...');
  }

  try {
    runSetup(installPath, process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`\nSetup failed: ${err.message}\n`);
    process.exit(1);
  }
}

main();
