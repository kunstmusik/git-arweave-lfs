import Arweave from 'arweave';
import { ArweaveSigner, TurboFactory } from '@ardrive/turbo-sdk';
import { readFileSync, writeFileSync, mkdirSync, statSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { createHash } from 'crypto';
import { lookup as lookupMimeType } from 'mime-types';
import { GitArweaveConfig } from './config';

export interface FileReference {
  filePath: string;
  txId: string;
  size: number;
  hash: string;
  uploadedAt: Date;
}

export class ArweaveManager {
  private config: GitArweaveConfig;
  private arweave: any;
  private turboClient: any;
  private referencesFile: string;
  private fileReferences: Map<string, FileReference>;

  private constructor(config: GitArweaveConfig, gitDir: string) {
    this.config = config;
    this.referencesFile = join(gitDir, 'arweave-lfs', 'references.json');
    this.fileReferences = this.loadReferences();

    // Initialize Arweave instance (for downloads and compatibility)
    this.arweave = Arweave.init({
      host: 'arweave.net',
      port: 443,
      protocol: 'https'
    });
  }

  public static async create(config: GitArweaveConfig, gitDir: string): Promise<ArweaveManager> {
    const manager = new ArweaveManager(config, gitDir);
    return manager;
  }

  private async ensureTurboClient(): Promise<void> {
    if (this.turboClient) {
      return; // Already initialized
    }

    // Initialize Turbo client for uploads
    const walletJson = await this.config.loadWallet();
    if (!walletJson) {
      throw new Error('Arweave wallet not configured. Use: git arweave-lfs config set-wallet <path>');
    }
    const wallet = JSON.parse(walletJson);
    const signer = new ArweaveSigner(wallet);
    this.turboClient = TurboFactory.authenticated({ signer });
  }

  private loadReferences(): Map<string, FileReference> {
    const references = new Map<string, FileReference>();

    try {
      if (existsSync(this.referencesFile)) {
        const data = JSON.parse(readFileSync(this.referencesFile, 'utf8'));
        Object.entries(data).forEach(([hash, ref]: [string, any]) => {
          references.set(hash, {
            ...ref,
            uploadedAt: new Date(ref.uploadedAt)
          });
        });
      }
    } catch (error) {
      console.warn('Failed to load file references, starting fresh:', error);
    }

    return references;
  }

  private saveReferences(): void {
    const dir = dirname(this.referencesFile);
    mkdirSync(dir, { recursive: true });

    const data: Record<string, FileReference> = {};
    this.fileReferences.forEach((ref, hash) => {
      data[hash] = ref;
    });

    writeFileSync(this.referencesFile, JSON.stringify(data, null, 2));
  }

  private computeFileHash(filePath: string): string {
    const fileBuffer = readFileSync(filePath);
    return createHash('sha256').update(fileBuffer).digest('hex');
  }

  async uploadFile(filePath: string): Promise<string> {
    try {
      // Ensure Turbo client is initialized (will throw if no wallet)
      await this.ensureTurboClient();

      const fileHash = this.computeFileHash(filePath);
      const fileSize = statSync(filePath).size;

      // Check if file already uploaded
      const existingRef = this.fileReferences.get(fileHash);
      if (existingRef) {
        console.log(`✅ File already uploaded with transaction ${existingRef.txId}`);
        return existingRef.txId;
      }

      console.error(`📤 Uploading ${filePath} to Arweave via Turbo...`);

      // Upload the file using Turbo
      const result = await this.turboClient.uploadFile({
        file: filePath,
        fileSizeFactory: () => fileSize,
        dataItemOpts: {
          tags: [
            { name: 'Content-Type', value: this.guessContentType(filePath) },
            { name: 'App-Name', value: 'git-arweave-lfs' },
            { name: 'file-hash', value: fileHash },
          ]
        }
      });

      console.error(`✅ Upload complete via Turbo: ${result.id}`);

      // Store file reference
      const fileRef: FileReference = {
        filePath,
        txId: result.id,
        size: fileSize,
        hash: fileHash,
        uploadedAt: new Date()
      };

      this.fileReferences.set(fileHash, fileRef);
      this.saveReferences();

      return result.id;

    } catch (error: any) {
      // Provide better error messages for Turbo SDK errors
      if (error.message?.includes('insufficient funds') || error.message?.includes('balance')) {
        throw new Error(`Upload failed due to insufficient funds. Please check your wallet balance at arweave.app and add more AR tokens. Error: ${error.message}`);
      } else if (error.message?.includes('authentication') || error.message?.includes('unauthorized')) {
        throw new Error(`Upload failed due to authentication issues. Please check your Turbo API credentials and wallet. Error: ${error.message}`);
      } else {
        throw new Error(`Failed to upload file to Arweave via Turbo: ${error.message}`);
      }
    }
  }

  async downloadFile(txId: string, outputPath: string): Promise<void> {
    try {
      console.error(`📥 Downloading ${txId} to ${outputPath}...`);

      // Download from Arweave gateway
      const response = await fetch(`https://arweave.net/${txId}`);
      if (!response.ok) {
        throw new Error(`Failed to download from Arweave: ${response.status} ${response.statusText}`);
      }

      const fileData = Buffer.from(await response.arrayBuffer());
      const dir = dirname(outputPath);
      mkdirSync(dir, { recursive: true });
      writeFileSync(outputPath, fileData);

      console.log(`✅ Download complete: ${outputPath} (${fileData.length} bytes)`);

    } catch (error) {
      throw new Error(`Failed to download file from Arweave: ${error}`);
    }
  }

  async downloadFileToMemory(txId: string): Promise<Buffer> {
    try {
      console.error(`📥 Downloading ${txId}...`);

      // Download from Arweave gateway
      const response = await fetch(`https://arweave.net/${txId}`);
      if (!response.ok) {
        throw new Error(`Failed to download from Arweave: ${response.status} ${response.statusText}`);
      }

      const fileData = Buffer.from(await response.arrayBuffer());
      console.error(`✅ Download complete: ${fileData.length} bytes`);
      
      return fileData;

    } catch (error) {
      throw new Error(`Failed to download file from Arweave: ${error}`);
    }
  }

  private guessContentType(filePath: string): string {
    // Use mime-types package for accurate MIME type detection
    const mimeType = lookupMimeType(filePath);

    // If mime-types doesn't recognize the extension, fall back to common types
    if (!mimeType) {
      const ext = filePath.toLowerCase().split('.').pop();

      const fallbackMimeTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'pdf': 'application/pdf',
        'txt': 'text/plain',
        'html': 'text/html',
        'css': 'text/css',
        'js': 'application/javascript',
        'json': 'application/json',
        'zip': 'application/zip',
        'tar': 'application/x-tar',
        'gz': 'application/gzip',
        'mp4': 'video/mp4',
        'avi': 'video/x-msvideo',
        'mov': 'video/quicktime',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav'
      };

      return fallbackMimeTypes[ext || ''] || 'application/octet-stream';
    }

    return mimeType;
  }

  async findFileByTxId(txId: string): Promise<FileReference | null> {
    for (const ref of this.fileReferences.values()) {
      if (ref.txId === txId) {
        return ref;
      }
    }
    return null;
  }

  getFileReference(filePath: string): FileReference | null {
    const fileHash = this.computeFileHash(filePath);
    return this.fileReferences.get(fileHash) || null;
  }

  getAllReferences(): FileReference[] {
    return Array.from(this.fileReferences.values());
  }

  getStorageStats(): { totalFiles: number; totalSize: number } {
    let totalSize = 0;
    this.fileReferences.forEach(ref => {
      totalSize += ref.size;
    });

    return {
      totalFiles: this.fileReferences.size,
      totalSize
    };
  }
}
