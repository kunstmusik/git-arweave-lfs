import simpleGit from 'simple-git';

export const installCommand = async (): Promise<void> => {
  try {
    const git = simpleGit();

    // Set up Git config globally (like git lfs install)
    await git.addConfig('filter.arweave-lfs.clean', 'git-arweave-lfs clean %f', false, 'global');
    await git.addConfig('filter.arweave-lfs.smudge', 'git-arweave-lfs smudge %f', false, 'global');
    await git.addConfig('filter.arweave-lfs.required', 'true', false, 'global');
    await git.addConfig('diff.arweave-lfs.command', 'git-arweave-lfs diff', false, 'global');

    console.log('✅ Git Arweave LFS filters installed globally');
    console.log('🌍 All repositories will now use Arweave LFS for tracked files');
    console.log('💡 Set your wallet with: git arweave-lfs config set-wallet <path>');
    console.log('📝 Track files with: git arweave-lfs track "*.zip"');

  } catch (error) {
    console.error('Error installing Git Arweave LFS:', error);
    process.exit(1);
  }
};

export const uninstallCommand = async (): Promise<void> => {
  try {
    const git = simpleGit();

    // Remove Git config globally (like git lfs uninstall)
    await git.raw(['config', '--global', '--unset', 'filter.arweave-lfs.clean']);
    await git.raw(['config', '--global', '--unset', 'filter.arweave-lfs.smudge']);
    await git.raw(['config', '--global', '--unset', 'filter.arweave-lfs.required']);
    await git.raw(['config', '--global', '--unset', 'diff.arweave-lfs.command']);

    console.log('✅ Git Arweave LFS filters uninstalled globally');
    console.log('🌍 Repositories will no longer use Arweave LFS filters');
    console.log('💡 Existing tracked files will remain as pointer files');

  } catch (error) {
    console.error('Error uninstalling Git Arweave LFS:', error);
    process.exit(1);
  }
};
