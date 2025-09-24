#!/usr/bin/env node

import { Command } from 'commander';
import { installCommand, uninstallCommand } from './commands/install';
import { trackCommand } from './commands/track';
import { cleanFilter } from './filters/clean';
import { smudgeFilter } from './filters/smudge';
import { diffDriver } from './drivers/diff';
import { configCommand } from './commands/config';
import { checkBalance, topupWallet } from './commands/wallet';

const program = new Command();

program
  .name('git-arweave-lfs')
  .description('Git Arweave LFS - Version large files with Arweave storage')
  .version('0.1.0');

// Subcommands
program
  .command('install')
  .description('Install Git Arweave LFS filters globally (like git lfs install)')
  .action(installCommand);

program
  .command('uninstall')
  .description('Uninstall Git Arweave LFS filters globally (like git lfs uninstall)')
  .action(uninstallCommand);

program
  .command('track')
  .description('Track files matching the given patterns with Git Arweave LFS')
  .argument('<patterns...>', 'file patterns to track')
  .action(trackCommand);

program
  .command('config')
  .description('Manage Git Arweave LFS configuration')
  .addCommand(
    new Command('set-wallet')
      .description('Set the path to your Arweave wallet JSON file')
      .argument('<path>', 'path to Arweave wallet JSON file')
      .action(async (path) => {
        await configCommand('set-wallet', path);
      })
  )
  .addCommand(
    new Command('set-gateway')
      .description('Set the Arweave gateway URL used for downloads')
      .argument('<url>', 'gateway URL, e.g. https://arweave.net')
      .action(async (url) => {
        await configCommand('set-gateway', url);
      })
  )
  .addCommand(
    new Command('show')
      .description('Show current configuration')
      .action(async () => {
        await configCommand('show');
      })
  );

// Wallet commands
program
  .command('balance')
  .description('Check your Turbo balance')
  .action(async () => {
    await checkBalance(process.cwd());
  });

program
  .command('topup')
  .description('Add funds to your Turbo account')
  .action(async () => {
    await topupWallet(process.cwd());
  });

// Git filters and drivers
program
  .command('clean')
  .description('Git clean filter: converts file content to pointer file')
  .argument('<file>', 'file path')
  .action(async (file) => {
    await cleanFilter(file);
  });

program
  .command('smudge')
  .description('Git smudge filter: converts pointer file to actual content')
  .argument('<file>', 'file path')
  .action(async (file) => {
    await smudgeFilter(file);
  });

program
  .command('diff')
  .description('Git diff driver for binary files')
  .action(diffDriver);

program.parse();
