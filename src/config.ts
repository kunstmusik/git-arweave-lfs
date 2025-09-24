import { readFileSync } from 'fs';
import simpleGit from 'simple-git';

export interface TurboConfig {
  walletPath?: string;
  gatewayUrl: string;
}

const DEFAULT_GATEWAY = 'https://arweave.net';

export class GitArweaveConfig {
  private git: any;

  constructor(gitDir: string) {
    this.git = simpleGit({ baseDir: gitDir.replace('/.git', '') });
  }

  public async getTurboConfig(): Promise<TurboConfig> {
    return {
      walletPath: await this.getWalletPath(),
      gatewayUrl: await this.getGatewayUrl() ?? DEFAULT_GATEWAY
    };
  }

  private async getWalletPath(): Promise<string | undefined> {
    // Priority order:
    // 1. Git config (local or global)
    // 2. Environment variable

    try {
      // Check git config first
      const gitConfig = await this.git.getConfig('arweave-lfs.wallet');
      if (gitConfig && gitConfig.value) {
        return gitConfig.value;
      }
    } catch (error) {
      // Git config not found, continue to next option
    }

    // Check environment variable
    const envWalletPath = process.env.ARWEAVE_LFS_WALLET;
    if (envWalletPath) {
      return envWalletPath;
    }

    return undefined;
  }

  private async getGatewayUrl(): Promise<string | undefined> {
    try {
      const gitConfig = await this.git.getConfig('arweave-lfs.gateway');
      if (gitConfig && gitConfig.value) {
        return gitConfig.value;
      }
    } catch (error) {
      // Ignore missing config
    }

    const envGateway = process.env.ARWEAVE_LFS_GATEWAY;
    if (envGateway) {
      return envGateway;
    }

    return undefined;
  }

  public async setWalletPath(walletPath: string): Promise<void> {
    try {
      // Store in git config
      await this.git.addConfig('arweave-lfs.wallet', walletPath);
      console.log(`✅ Wallet path set to: ${walletPath}`);
    } catch (error) {
      console.error('Failed to set wallet path in git config:', error);
      throw error;
    }
  }

  public async setGatewayUrl(gatewayUrl: string): Promise<void> {
    try {
      await this.git.addConfig('arweave-lfs.gateway', gatewayUrl);
      console.log(`✅ Download gateway set to: ${gatewayUrl}`);
    } catch (error) {
      console.error('Failed to set gateway in git config:', error);
      throw error;
    }
  }

  public async loadWallet(): Promise<string | null> {
    const walletPath = await this.getWalletPath();
    if (!walletPath) {
      return null;
    }

    try {
      return readFileSync(walletPath, 'utf8');
    } catch (error) {
      console.warn(`Failed to load wallet from ${walletPath}:`, error);
      return null;
    }
  }

  public async showConfig(): Promise<void> {
    console.log('🔧 Git Arweave LFS Configuration');
    console.log('=' .repeat(40));

    try {
      const gitConfig = await this.git.listConfig();
      const walletConfig = gitConfig.all['arweave-lfs.wallet'];
      if (walletConfig) {
        console.log(`📁 Wallet Path: ${walletConfig}`);
      } else {
        console.log('📁 Wallet Path: Not set');
        console.log('💡 Use "git arweave-lfs config set-wallet <path>" to set it');
      }

      const gatewayConfig = gitConfig.all['arweave-lfs.gateway'];
      if (gatewayConfig) {
        console.log(`🌐 Download Gateway: ${gatewayConfig}`);
      } else {
        console.log(`🌐 Download Gateway: ${DEFAULT_GATEWAY} (default)`);
        console.log('💡 Use "git arweave-lfs config set-gateway <url>" to change it');
      }
    } catch (error) {
      console.log('📁 Wallet Path: Not accessible');
      console.log(`🌐 Download Gateway: ${DEFAULT_GATEWAY} (default)`);
    }
  }
}
