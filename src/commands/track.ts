import { existsSync, readFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import simpleGit from 'simple-git';

export const trackCommand = async (patterns: string[]): Promise<void> => {
  if (!patterns || patterns.length === 0) {
    console.error('Error: No patterns specified');
    process.exit(1);
  }

  try {
    const git = simpleGit();
    const root = await git.revparse(['--show-toplevel']);
    const gitattributes = join(root, '.gitattributes');

    // Read existing patterns
    let existing: Set<string> = new Set();
    if (existsSync(gitattributes)) {
      const content = readFileSync(gitattributes, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const parts = trimmed.split(/\s+/);
          if (parts.length > 0) {
            existing.add(parts[0]);
          }
        }
      }
    }

    // Ensure .gitattributes is never processed by LFS
    if (!existing.has('.gitattributes')) {
      const exclusionLine = '.gitattributes !filter !diff !merge\n';
      appendFileSync(gitattributes, exclusionLine);
      existing.add('.gitattributes');
    }

    // Add new patterns
    for (const pattern of patterns) {
      if (pattern === '.gitattributes') {
        console.warn('Skipping tracking of .gitattributes file.');
        continue;
      }
      if (!existing.has(pattern)) {
        const line = `${pattern} filter=arweave-lfs diff=arweave-lfs merge=arweave-lfs\n`;
        appendFileSync(gitattributes, line);
        console.log(`Tracking ${pattern}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};
