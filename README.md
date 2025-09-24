# Git Arweave LFS

A Git extension for versioning large files with Arweave storage, similar to Git LFS but decentralized.

## Features

- 🌐 **Decentralized Storage**: Files stored permanently on Arweave blockchain
- 💰 **Cost Effective**: One-time upload fee, no ongoing hosting costs
- 🔄 **Git Integration**: Seamless integration with existing Git workflows
- 🚀 **Turbo Uploads**: Fast uploads via ArDrive's Turbo service
- 📦 **Deduplication**: Automatic file deduplication to save costs
- ⚙️ **Git Native Config**: Uses Git's built-in configuration system
- 🔓 **Wallet-Free Downloads**: Clone repositories without wallet setup
- 🛡️ **Secure Uploads**: Wallet required only for uploading new files

## Installation

### Prerequisites

- Node.js >= 20.0.0
- npm or yarn

### Install from source

```bash
# Clone the repository
git clone <your-repo-url>
cd git-arweave-lfs

# Install dependencies
npm install

# Build the project
npm run build

# Install globally for CLI access
npm install -g .
```

## Quick Start

1. **Install globally:**
   ```bash
   npm install -g .
   ```

2. **Install Git Arweave LFS filters globally (one-time setup):**
   ```bash
   git arweave-lfs install
   ```

3. **Set up your Arweave wallet:**
   ```bash
   git arweave-lfs config set-wallet /path/to/your/arweave-wallet.json
   ```

4. **(Optional) Configure a custom download gateway:**
   ```bash
   git arweave-lfs config set-gateway https://ar-io.net
   ```

5. **In any Git repository, track large files:**
   ```bash
   cd your-git-repo
   git arweave-lfs track "*.psd" "*.zip" "*.mp4"
   ```

6. **Add and commit (files are automatically uploaded to Arweave):**
   ```bash
   git add .
   git commit -m "Add large files"
   ```

7. **Clone and restore files (works without wallet setup):**
   ```bash
   git clone your-repo.git  # Files download automatically from Arweave
   cd your-repo
   # Wallet only needed if you want to upload new files
   git arweave-lfs config set-wallet /path/to/wallet.json
   ```

### Check Your Configuration

```bash
# View current configuration
git arweave-lfs config show

# Set wallet path
git arweave-lfs config set-wallet /path/to/wallet.json

# Set via environment variable (alternative)
export ARWEAVE_LFS_WALLET=/path/to/wallet.json
```

## Configuration

Git Arweave LFS uses **Git's native configuration system** - no custom config files needed!

### Arweave Wallet Setup

**Required**: Set up your Arweave wallet before using git-arweave-lfs:

#### Option 1: Git Config (Recommended)
```bash
# Set wallet path in Git config (local to repository)
git arweave-lfs config set-wallet /path/to/your/arweave-wallet.json

# Or set globally for all repositories
git config --global arweave-lfs.wallet /path/to/your/arweave-wallet.json

# Configure download gateway (defaults to https://arweave.net)
git arweave-lfs config set-gateway https://ar.io

# View current configuration
git arweave-lfs config show
```

#### Option 2: Environment Variable
```bash
# Set the path to your Arweave wallet JSON file
export ARWEAVE_LFS_WALLET=/path/to/your/arweave-wallet.json
```

#### Option 3: Direct Git Config Commands
```bash
# You can also use standard git config commands
git config arweave-lfs.wallet /path/to/wallet.json
git config --list | grep arweave  # View all arweave-lfs settings
```

**Priority Order**: Git config (local/global) → Environment variable

The wallet file should be a JSON Web Key (JWK) format that looks like:
```json
{
  "kty": "RSA",
  "e": "AQAB",
  "n": "your-key-here...",
  "d": "your-private-key-here...",
  "p": "your-prime-here...",
  "q": "your-prime-here...",
  "dp": "your-dp-here...",
  "dq": "your-dq-here...",
  "qi": "your-qi-here..."
}
```

## Architecture

- **🎯 CLI Interface**: Command-line tool using Commander.js
- **🔗 Git Integration**: Uses Git's native filter system (clean/smudge) for seamless operation
- **🚀 Arweave Storage**: Turbo SDK for efficient file uploads and downloads
- **⚙️ Configuration**: Uses Git's native config system (stored in `.git/config`)
- **🛡️ Error Handling**: Robust protection against `.gitattributes` corruption
- **📝 Pointer Files**: LFS-style pointer files with Arweave transaction IDs

### How It Works

1. **Upload (Clean Filter)**: When you `git add` a tracked file:
   - File is uploaded to Arweave via Turbo
   - Original file is replaced with a pointer containing the Arweave transaction ID
   - Pointer is stored in Git repository

2. **Download (Smudge Filter)**: When you `git checkout` or clone:
   - Git reads the pointer file
   - File is downloaded from Arweave using the transaction ID
   - Original file content is restored to your working directory

3. **Configuration**: All settings stored in Git config:
   ```
   filter.arweave-lfs.clean=git-arweave-lfs clean %f
   filter.arweave-lfs.smudge=git-arweave-lfs smudge %f
   filter.arweave-lfs.required=true
   arweave-lfs.wallet=/path/to/wallet.json
   ```

## Commands Reference

### Core Commands

```bash
# Install filters globally (one-time setup)
git arweave-lfs install

# Uninstall filters globally
git arweave-lfs uninstall

# Track file patterns in any repository
git arweave-lfs track "*.zip" "*.psd" "*.mp4"
```

### Wallet Management

```bash
# Show current wallet configuration
git arweave-lfs config show

# Set wallet path
git arweave-lfs config set-wallet /path/to/wallet.json

# Set custom download gateway (defaults to https://arweave.net)
git arweave-lfs config set-gateway https://ar.io

# Check your Turbo balance (requires wallet)
git arweave-lfs balance
# Example output: 💰 Turbo Balance: 0.930123 credits ($5.562137 USD)

# Top up your Turbo balance (opens browser for payment)
git arweave-lfs topup
# Follow the prompts to enter the amount in USD
```

### Git Integration Commands (used internally)

```bash
# Clean filter (upload to Arweave)
git arweave-lfs clean <file>

# Smudge filter (download from Arweave)  
git arweave-lfs smudge <file>

# Diff filter (show pointer info)
git arweave-lfs diff <file>
```

## Troubleshooting

### Common Issues

**"ARWEAVE_LFS_WALLET environment variable must be set"**
- Solution: Set your wallet path using `git arweave-lfs config set-wallet /path/to/wallet.json`

**"File already exists" errors during checkout**
- This is normal - Git is trying to overwrite existing files
- The files are still downloaded correctly from Arweave

**".gitattributes corruption" (historical issue - now fixed)**
- Our latest version protects `.gitattributes` from being processed by LFS filters
- If you encounter this, update to the latest version

### Debugging

```bash
# Check Git config
git config --list | grep arweave

# Verify filters are set up
git config filter.arweave-lfs.clean
git config filter.arweave-lfs.smudge

# Check .gitattributes
cat .gitattributes
```

## Pointer File Format

Git Arweave LFS uses a custom pointer format:

```
version git-arweave-lfs:v1
oid sha256:f2ca1bb6c7e907d06dafe4687e579fce76b37e4e93b7605022da52e6ccc26fd2
size 1024
arweave-tx-id iHOT8IE1oIiYH1BbA8Gr8cbHSx5Ohwi7f_Vxn5WyrbE
```

- `version`: Pointer format version
- `oid`: SHA-256 hash of the original file
- `size`: Original file size in bytes  
- `arweave-tx-id`: Arweave transaction ID for downloading

## Development

```bash
# Install dependencies
npm install

# Build in watch mode
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Link for local development
npm link
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Comparison with Git LFS

| Feature | Git LFS | Git Arweave LFS |
|---------|---------|-----------------|
| **Setup** | `git lfs install` | `git arweave-lfs install` |
| **Storage** | Centralized servers | Decentralized Arweave |
| **Permanence** | Depends on server | Permanent blockchain storage |
| **Cost** | Server hosting costs | One-time Arweave upload fee |
| **Configuration** | Git native config | Git native config |
| **Availability** | Server uptime dependent | Global gateway network |
| **Deduplication** | Server-side | Repository-specific |
| **Clone Experience** | Automatic with filters | Automatic with filters |

## License

MIT
