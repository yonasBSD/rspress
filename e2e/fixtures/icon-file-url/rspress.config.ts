import * as path from 'node:path';
import { defineConfig } from 'rspress/config';

export default defineConfig({
  title: 'Rspress',
  root: path.join(__dirname, 'docs'),
  icon: new URL('../public-dir/doc/public/rspress-icon.png', import.meta.url),
});
