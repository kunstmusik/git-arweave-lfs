import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({
    './src/assets/': '/assets/',
    './src/styles.css': '/styles.css'
  });

  eleventyConfig.addGlobalData('siteVersion', pkg.version);

  return {
    dir: {
      input: 'content',
      includes: '../src/includes',
      layouts: '../src/layouts',
      data: '../src/data',
      output: '_site'
    }
  };
}
