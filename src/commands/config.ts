import { existsSync } from 'fs';
import { join } from 'path';
import simpleGit from 'simple-git';
import { GitArweaveConfig } from '../config';

export const configCommand = async (action: string, value?: string): Promise<void> => {
  try {
    const git = simpleGit();
    const root = await git.revparse(['--show-toplevel']);
    const gitDir = join(root, '.git');

    const config = new GitArweaveConfig(gitDir);

    switch (action) {
      case 'set-wallet':
        if (!value) {
          console.error('❌ Error: Wallet path is required');
          console.error('Usage: git arweave-lfs config set-wallet <path>');
          process.exit(1);
        }

        if (!existsSync(value)) {
          console.error(`❌ Error: Wallet file not found: ${value}`);
          process.exit(1);
        }

        await config.setWalletPath(value);
        break;

      case 'set-gateway':
        if (!value) {
          console.error('❌ Error: Gateway URL is required');
          console.error('Usage: git arweave-lfs config set-gateway <url>');
          process.exit(1);
        }

        try {
          const parsed = new URL(value);
          if (!parsed.protocol || !parsed.hostname) {
            throw new Error('Invalid URL');
          }
        } catch (error) {
          console.error(`❌ Error: Invalid gateway URL: ${value}`);
          process.exit(1);
        }

        await config.setGatewayUrl(value);
        break;

      case 'show':
        await config.showConfig();
        break;

      default:
        console.error(`❌ Unknown config action: ${action}`);
        console.error('Available actions: set-wallet, set-gateway, show');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Config command failed:', error);
    process.exit(1);
  }
};
