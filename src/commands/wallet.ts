import { GitArweaveConfig } from '../config';
import { readFileSync, existsSync } from 'fs';
import { TurboFactory, defaultTurboConfiguration, USD, type TurboBalanceResponse, WinstonToTokenAmount } from '@ardrive/turbo-sdk';
import BigNumber from 'bignumber.js';
import Arweave from 'arweave';
import { program } from 'commander';
import { input } from '@inquirer/prompts';
import open from 'open';


export const checkBalance = async (gitDir: string) => {
  try {
    const config = new GitArweaveConfig(gitDir);
    const turboConfig = await config.getTurboConfig();

    const walletPath = turboConfig.walletPath;
    if (!walletPath) {
      program.error('Error: No Arweave wallet configured. Please run `git arweave-lfs config set-wallet <path>` first.');
    }

    if (!existsSync(walletPath)) {
      program.error(`Error: Wallet file not found at ${walletPath}`);
    }

    const jwk = JSON.parse(readFileSync(walletPath, 'utf-8'));
    const turboAuthClient = TurboFactory.authenticated({
      privateKey: jwk,
      ...defaultTurboConfiguration,
    });

    const balance: TurboBalanceResponse = await turboAuthClient.getBalance();
    const winc = new BigNumber(balance.winc);
    const credits = winc.multipliedBy(1e-12);
    
    // Get current AR to USD conversion rate
    const turboClient = TurboFactory.authenticated({
      privateKey: jwk,
      ...defaultTurboConfiguration,
    });
    
    // Get the current AR to USD conversion rate
    const fiatToAR = await turboClient.getFiatToAR({ currency: 'usd' });
    const arToUSD = new BigNumber(fiatToAR.rate);
    
    // Calculate USD value of the balance
    const usdValue = credits.multipliedBy(arToUSD);
    
    console.log(`💰 Turbo Balance: ${credits.toFixed(6)} credits ($${usdValue.toFixed(6)} USD)`);
    return balance;
  } catch (error: any) {
    program.error(`Error checking balance: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const topupWallet = async (gitDir: string) => {
  try {
    const config = new GitArweaveConfig(gitDir);
    const turboConfig = await config.getTurboConfig();

    const walletPath = turboConfig.walletPath;
    if (!walletPath) {
      program.error('Error: No Arweave wallet configured. Please run `git arweave-lfs config set-wallet <path>` first.');
    }

    if (!existsSync(walletPath)) {
      program.error(`Error: Wallet file not found at ${walletPath}`);
    }

    const usdAmount = await input({
      message: 'Enter amount of Turbo credits in USD you would like to purchase:',
      default: '5',
      validate: (value) => {
        const amount = Number.parseFloat(value);
        if (isNaN(amount) || amount <= 0) {
          return 'Please enter a valid positive number';
        }
        return true;
      },
    });

    const arweave = new Arweave({});
    const jwk = JSON.parse(readFileSync(walletPath, 'utf-8'));
    const address = await arweave.wallets.jwkToAddress(jwk);

    const turboAuthClient = TurboFactory.authenticated({
      privateKey: jwk,
      ...defaultTurboConfiguration,
    });

    const result = await turboAuthClient.createCheckoutSession({
      amount: USD(Number.parseFloat(usdAmount)),
      owner: address,
      promoCodes: [], // Optional: Add promo codes if needed
    });

    if (!result.url) {
      throw new Error('Failed to create checkout session: No URL returned');
    }

    console.log('Opening Turbo checkout in your default browser...');
    await open(result.url);
    console.log('✅ Checkout opened. Complete the purchase in your browser.');
  } catch (error: any) {
    program.error(`Error topping up wallet: ${error instanceof Error ? error.message : String(error)}`);
  }
};
