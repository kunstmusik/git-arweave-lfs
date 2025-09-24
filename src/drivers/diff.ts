import { readFileSync, existsSync, statSync } from 'fs';
import { createHash } from 'crypto';

export const diffDriver = (): void => {
  try {
    // Git passes arguments: path old-file old-hex old-mode new-file new-hex new-mode
    // But CLI framework adds 'diff' as first arg, so we skip it
    const args = process.argv.slice(3); // Skip 'node', script name, and 'diff' command
    
    if (args.length < 7) {
      // Not enough arguments, fall back to basic diff
      console.log('Binary files differ');
      return;
    }

    const [path, oldFile, oldHex, oldMode, newFile, newHex, newMode] = args;

    // Check if both files exist
    if (!existsSync(oldFile) || !existsSync(newFile)) {
      console.log('Binary files differ');
      return;
    }

    // Quick size check first (fastest comparison)
    const oldStats = statSync(oldFile);
    const newStats = statSync(newFile);
    
    if (oldStats.size !== newStats.size) {
      console.log(`Binary files ${path} differ`);
      return;
    }

    // If sizes are the same, do hash comparison for accuracy
    const oldBuffer = readFileSync(oldFile);
    const newBuffer = readFileSync(newFile);
    
    const oldHash = createHash('sha256').update(oldBuffer).digest('hex');
    const newHash = createHash('sha256').update(newBuffer).digest('hex');
    
    if (oldHash === newHash) {
      // Files are identical - no output means "no difference"
      // This will prevent Git from calling the clean filter unnecessarily
      return;
    } else {
      console.log(`Binary files ${path} differ`);
    }

  } catch (error) {
    // On any error, fall back to indicating files differ
    console.error(`Error in diff driver: ${error}`);
    console.log('Binary files differ');
  }
};
