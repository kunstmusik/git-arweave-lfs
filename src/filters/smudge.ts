import { readFileSync } from 'fs';
import { join } from 'path';
import simpleGit from 'simple-git';
import { ArweaveManager } from '../arweave';
import { GitArweaveConfig } from '../config';

export const smudgeFilter = async (filePath: string): Promise<void> => {
  try {
    // Read the pointer file content
    const content = readFileSync(0, 'utf-8'); // Read from stdin
    const lines = content.trim().split('\n');

    // Parse the pointer file
    let txId: string | null = null;
    let size: number | null = null;

    for (const line of lines) {
      if (line.startsWith('arweave-tx-id ')) {
        txId = line.substring('arweave-tx-id '.length);
      } else if (line.startsWith('size ')) {
        size = parseInt(line.substring('size '.length), 10);
      }
    }

    if (!txId) {
      console.error(`[git-arweave-lfs] Transaction ID not available for ${filePath}`);
      // Just pass through the content for now
      console.log(content);
      return;
    }

    // Get git directory to find config
    const git = simpleGit();
    const root = await git.revparse(['--show-toplevel']);
    const gitDir = join(root, '.git');

    // Load configuration
    const config = new GitArweaveConfig(gitDir);
    const arweaveManager = await ArweaveManager.create(config, gitDir);

    // Download file from Arweave to memory
    console.error(`[git-arweave-lfs] Downloading ${filePath} (size: ${size})`);
    const fileData = await arweaveManager.downloadFileToMemory(txId);

    // Output the downloaded file content to stdout (Git will handle writing to disk)
    process.stdout.write(fileData);

  } catch (error) {
    console.error('Error in smudge filter:', error);
    process.exit(1);
  }
};
