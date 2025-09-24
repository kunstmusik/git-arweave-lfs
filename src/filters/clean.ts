import { readFileSync, statSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import simpleGit from "simple-git";
import { GitArweaveConfig } from "../config";
import { ArweaveManager } from "../arweave";

export const cleanFilter = async (filePath: string): Promise<void> => {
  try {
    // Check if this is .gitattributes and immediately return original content
    if (filePath.endsWith('.gitattributes')) {
      // Return the original file content unchanged
      const originalContent = readFileSync(filePath, 'utf8');
      console.log(originalContent);
      return;
    }

    // Get git directory to find config
    const git = simpleGit();
    const root = await git.revparse(["--show-toplevel"]);
    const gitDir = join(root, ".git");

    // Load configuration
    const config = new GitArweaveConfig(gitDir);
    const arweaveManager = await ArweaveManager.create(config, gitDir);

    // Check if file already has a reference (already uploaded)
    const existingRef = arweaveManager.getFileReference(filePath);
    const stats = statSync(filePath);
    
    let txId: string;
    let fileHash: string;
    
    if (existingRef) {
      // File already uploaded, use existing reference
      txId = existingRef.txId;
      fileHash = existingRef.hash;
    } else {
      // File not in local references - check if it exists in Git's index
      const fileBuffer = readFileSync(filePath);
      const computedHash = createHash('sha256').update(fileBuffer).digest('hex');
      
      try {
        // Try to find existing pointer in Git index by checking what Git has stored
        const gitResult = await git.raw(['ls-files', '-s', filePath]);
        if (gitResult.trim()) {
          const [, blobHash] = gitResult.trim().split(/\s+/);
          const storedPointer = await git.raw(['cat-file', '-p', blobHash]);
          
          // Parse the stored pointer to get the transaction ID
          const lines = storedPointer.trim().split('\n');
          let storedTxId = null;
          let storedHash = null;
          
          for (const line of lines) {
            if (line.startsWith('arweave-tx-id ')) {
              storedTxId = line.substring('arweave-tx-id '.length);
            } else if (line.startsWith('oid sha256:')) {
              storedHash = line.substring('oid sha256:'.length);
            }
          }
          
          // If the file content matches what's stored, reuse the existing transaction ID
          if (storedHash === computedHash && storedTxId) {
            txId = storedTxId;
            fileHash = computedHash;
          } else {
            // File has changed, need to upload
            txId = await arweaveManager.uploadFile(filePath);
            const updatedRef = arweaveManager.getFileReference(filePath);
            fileHash = updatedRef?.hash || computedHash;
          }
        } else {
          // New file, need to upload
          txId = await arweaveManager.uploadFile(filePath);
          const updatedRef = arweaveManager.getFileReference(filePath);
          fileHash = updatedRef?.hash || computedHash;
        }
      } catch (uploadError: any) {
        if (uploadError.message?.includes('Arweave wallet not configured')) {
          // No wallet for upload, but maybe we can still find existing reference
          const gitResult = await git.raw(['ls-files', '-s', filePath]);
          if (gitResult.trim()) {
            const [, blobHash] = gitResult.trim().split(/\s+/);
            const storedPointer = await git.raw(['cat-file', '-p', blobHash]);
            
            // Parse existing pointer
            const lines = storedPointer.trim().split('\n');
            let storedTxId = null;
            let storedHash = null;
            
            for (const line of lines) {
              if (line.startsWith('arweave-tx-id ')) {
                storedTxId = line.substring('arweave-tx-id '.length);
              } else if (line.startsWith('oid sha256:')) {
                storedHash = line.substring('oid sha256:'.length);
              }
            }
            
            if (storedHash === computedHash && storedTxId) {
              // File unchanged, can reuse existing pointer
              txId = storedTxId;
              fileHash = computedHash;
            } else {
              throw uploadError; // File changed but no wallet to upload
            }
          } else {
            throw uploadError; // New file but no wallet to upload
          }
        } else {
          throw uploadError;
        }
      }
    }

    // Generate pointer file content
    const pointerContent = `version git-arweave-lfs:v1
oid sha256:${fileHash}
size ${stats.size}
arweave-tx-id ${txId}
`;

    console.log(pointerContent);

  } catch (error: any) {
    console.error('Error in clean filter:', error);
    process.exit(1);
  }
};
