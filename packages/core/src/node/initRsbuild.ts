import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  RsbuildConfig,
  RsbuildInstance,
  RsbuildPlugin,
} from '@rsbuild/core';
import { PLUGIN_REACT_NAME, pluginReact } from '@rsbuild/plugin-react';
import {
  MDX_OR_MD_REGEXP,
  RSPRESS_TEMP_DIR,
  type UserConfig,
  removeLeadingSlash,
  removeTrailingSlash,
} from '@rspress/shared';
import { pluginVirtualModule } from 'rsbuild-plugin-virtual-module';
import type { PluginDriver } from './PluginDriver';
import {
  CSR_CLIENT_ENTRY,
  DEFAULT_TITLE,
  OUTPUT_DIR,
  PACKAGE_ROOT,
  PUBLIC_DIR,
  SSR_CLIENT_ENTRY,
  SSR_SERVER_ENTRY,
  TEMPLATE_PATH,
  inlineThemeScript,
  isProduction,
} from './constants';
import { hintThemeBreakingChange } from './logger/hint';
import type { RouteService } from './route/RouteService';
import { initRouteService } from './route/init';
import { rsbuildPluginDocVM } from './runtimeModule';
import { globalStylesVMPlugin } from './runtimeModule/globalStyles';
import { globalUIComponentsVMPlugin } from './runtimeModule/globalUIComponents';
import { i18nVMPlugin } from './runtimeModule/i18n';
import { searchHookVMPlugin } from './runtimeModule/searchHooks';
import type { FactoryContext } from './runtimeModule/types';
import { serveSearchIndexMiddleware } from './searchIndex';
import { NODE_SSR_BUNDLE_NAME, rsbuildPluginSSG } from './ssg/rsbuildPluginSSG';
import { detectReactVersion, resolveReactAlias } from './utils';
import { detectCustomIcon } from './utils/detectCustomIcon';
import { getSocialIcons } from './utils/getSocialIcons';

export interface MdxRsLoaderCallbackContext {
  resourcePath: string;
  links: string[];
  root: string;
  base: string;
}

function isPluginIncluded(config: UserConfig, pluginName: string): boolean {
  return Boolean(
    config.builderPlugins?.some(plugin => plugin.name === pluginName) ||
      config.builderConfig?.plugins?.some(
        plugin => plugin && (plugin as RsbuildPlugin).name === pluginName,
      ),
  );
}

async function createInternalBuildConfig(
  userDocRoot: string,
  config: UserConfig,
  enableSSG: boolean,
  routeService: RouteService,
  pluginDriver: PluginDriver,
  runtimeTempDir: string,
): Promise<RsbuildConfig> {
  const cwd = process.cwd();
  const CUSTOM_THEME_DIR =
    config?.themeDir ?? path.join(process.cwd(), 'theme');
  const outDir = config?.outDir ?? OUTPUT_DIR;

  const DEFAULT_THEME = require.resolve('@rspress/theme-default');
  const base = config?.base ?? '';

  // In production, we need to add assetPrefix in asset path
  const assetPrefix = isProduction()
    ? removeTrailingSlash(config?.builderConfig?.output?.assetPrefix ?? base)
    : '';
  const reactVersion = await detectReactVersion();

  const normalizeIcon = (icon: string | undefined) => {
    if (!icon) {
      return undefined;
    }

    if (path.isAbsolute(icon)) {
      return path.join(userDocRoot, PUBLIC_DIR, icon);
    }

    return icon;
  };

  await hintThemeBreakingChange(CUSTOM_THEME_DIR);

  const [detectCustomIconAlias, reactCSRAlias, reactSSRAlias] =
    await Promise.all([
      detectCustomIcon(CUSTOM_THEME_DIR),
      resolveReactAlias(reactVersion, false),
      enableSSG ? resolveReactAlias(reactVersion, true) : Promise.resolve({}),
    ]);

  const context: Omit<FactoryContext, 'isSSR' | 'alias'> = {
    userDocRoot,
    config,
    runtimeTempDir,
    routeService,
    pluginDriver,
  };
  return {
    plugins: [
      ...(isPluginIncluded(config, PLUGIN_REACT_NAME) ? [] : [pluginReact()]),
      rsbuildPluginDocVM(context),
      pluginVirtualModule({
        virtualModules: {
          ...i18nVMPlugin(context),
          /**
           * Generate global components from config and plugins
           */
          ...globalUIComponentsVMPlugin(context),
          /**
           * Generate global styles from config and plugins
           */
          ...globalStylesVMPlugin(context),
          /**
           * Generate search hook module
           */
          ...searchHookVMPlugin(context),
        },
      }),
      ...(enableSSG
        ? [
            rsbuildPluginSSG({
              routeService,
              config,
              pluginDriver,
            }),
          ]
        : []),
    ],
    server: {
      port:
        !isProduction() && process.env.PORT
          ? Number(process.env.PORT)
          : undefined,
      printUrls: ({ urls }) => {
        return urls.map(url => `${url}/${removeLeadingSlash(base)}`);
      },
      publicDir: {
        name: path.join(userDocRoot, PUBLIC_DIR),
      },
    },
    dev: {
      progressBar: false,
      // Serve static files
      setupMiddlewares: [
        middlewares => {
          middlewares.unshift(serveSearchIndexMiddleware(config));
        },
      ],
      cliShortcuts: {
        // does not support restart server yet
        custom: shortcuts => shortcuts.filter(({ key }) => key !== 'r'),
      },
    },
    html: {
      title: config?.title ?? DEFAULT_TITLE,
      favicon: normalizeIcon(config?.icon),
      template: TEMPLATE_PATH,
      tags: [
        config.themeConfig?.darkMode !== false
          ? {
              tag: 'script',
              children: inlineThemeScript,
              append: false,
            }
          : null!,
      ].filter(Boolean),
    },
    output: {
      assetPrefix,
      distPath: {
        // just for rsbuild preview
        root: outDir,
      },
    },
    resolve: {
      alias: {
        ...detectCustomIconAlias,
        '@mdx-js/react': require.resolve('@mdx-js/react'),
        '@theme': [CUSTOM_THEME_DIR, DEFAULT_THEME],
        '@theme-assets': path.join(DEFAULT_THEME, '../assets'),
        '@rspress/core': PACKAGE_ROOT,
        'react-lazy-with-preload': require.resolve('react-lazy-with-preload'),
        'react-syntax-highlighter': path.dirname(
          require.resolve('react-syntax-highlighter/package.json'),
        ),
      },
    },
    source: {
      include: [PACKAGE_ROOT, path.join(cwd, 'node_modules', RSPRESS_TEMP_DIR)],
      define: {
        'process.env.__REACT_GTE_18__': JSON.stringify(reactVersion >= 18),
        'process.env.TEST': JSON.stringify(process.env.TEST),
        'process.env.RSPRESS_SOCIAL_ICONS': JSON.stringify(
          getSocialIcons(config.themeConfig?.socialLinks),
        ),
      },
    },
    performance: {
      chunkSplit: {
        override: {
          cacheGroups: {
            // extract all CSS into a single file
            // ensure CSS in async chunks can be loaded for SSG
            styles: {
              name: 'styles',
              minSize: 0,
              chunks: 'all',
              test: /\.(?:css|less|sass|scss)$/,
              priority: 99,
            },
          },
        },
      },
    },
    tools: {
      bundlerChain(chain, { CHAIN_ID, target }) {
        const isServer = target === 'node';
        const jsModuleRule = chain.module.rule(CHAIN_ID.RULE.JS);

        const swcLoaderOptions = jsModuleRule
          .use(CHAIN_ID.USE.SWC)
          .get('options');

        const checkDeadLinks =
          (config?.markdown?.checkDeadLinks && !isServer) ?? false;

        chain.module
          .rule('MDX')
          .type('javascript/auto')
          .test(MDX_OR_MD_REGEXP)
          .resolve.merge({
            conditionNames: jsModuleRule.resolve.conditionNames.values(),
            mainFields: jsModuleRule.resolve.mainFields.values(),
          })
          .end()
          .oneOf('MDXCompile')
          .use('builtin:swc-loader')
          .loader('builtin:swc-loader')
          .options(swcLoaderOptions)
          .end()
          .use('mdx-loader')
          .loader(require.resolve('./loader.js'))
          .options({
            config,
            docDirectory: userDocRoot,
            checkDeadLinks,
            routeService,
            pluginDriver,
          })
          .end();

        if (chain.plugins.has(CHAIN_ID.PLUGIN.REACT_FAST_REFRESH)) {
          chain.plugin(CHAIN_ID.PLUGIN.REACT_FAST_REFRESH).tap(options => {
            options[0] ??= {};
            options[0].include = [
              /\.([cm]js|[jt]sx?|flow)$/i,
              MDX_OR_MD_REGEXP,
            ];
            return options;
          });
        }

        chain.resolve.extensions.prepend('.md').prepend('.mdx').prepend('.mjs');

        chain.module
          .rule('css-virtual-module')
          .test(/\.rspress[\\/]runtime[\\/]virtual-global-styles/)
          .merge({ sideEffects: true });

        if (isServer) {
          chain.output.filename(NODE_SSR_BUNDLE_NAME);
        }

        const enableIncremental =
          !isProduction() && !process.env.DISABLE_RSPACK_INCREMENTAL;
        if (enableIncremental) {
          chain.merge({ experiments: { incremental: true } });
        }
      },
    },
    environments: {
      web: {
        resolve: {
          alias: { ...reactCSRAlias, __VIRTUAL_ROUTES__: 'virtual-routes' },
        },
        source: {
          entry: {
            index:
              enableSSG && isProduction() ? SSR_CLIENT_ENTRY : CSR_CLIENT_ENTRY,
          },
          define: {
            'process.env.__SSR__': JSON.stringify(false),
          },
        },
        output: {
          target: 'web',
          distPath: {
            root: outDir,
          },
        },
      },
      ...(enableSSG
        ? {
            node: {
              resolve: {
                alias: {
                  ...reactSSRAlias,
                  __VIRTUAL_ROUTES__: 'virtual-routes-ssr',
                },
              },
              tools: {
                rspack: {
                  output: {
                    asyncChunks: false, // Ensure that only one cjs bundle is generated.
                  },
                },
              },
              source: {
                entry: {
                  index: SSR_SERVER_ENTRY,
                },
                define: {
                  'process.env.__SSR__': JSON.stringify(true),
                },
              },
              performance: {
                printFileSize: {
                  compressed: true,
                },
              },
              output: {
                emitAssets: false,
                target: 'node',
                minify: false,
              },
            },
          }
        : {}),
    },
  };
}

export async function initRsbuild(
  rootDir: string,
  config: UserConfig,
  pluginDriver: PluginDriver,
  enableSSG: boolean,
  extraRsbuildConfig?: RsbuildConfig,
): Promise<RsbuildInstance> {
  const cwd = process.cwd();
  const userDocRoot = path.resolve(rootDir || config?.root || cwd);
  const builderPlugins = config?.builderPlugins ?? [];
  // We use a temp dir to store runtime files, so we can separate client and server build
  // and we should empty temp dir before build
  const runtimeTempDir = path.join(RSPRESS_TEMP_DIR, 'runtime');
  const runtimeAbsTempDir = path.join(cwd, 'node_modules', runtimeTempDir);
  await fs.mkdir(runtimeAbsTempDir, { recursive: true });

  const routeService = await initRouteService({
    config,
    runtimeTempDir: runtimeAbsTempDir,
    scanDir: userDocRoot,
    pluginDriver,
  });
  const { createRsbuild, mergeRsbuildConfig } = await import('@rsbuild/core');

  const internalRsbuildConfig = await createInternalBuildConfig(
    userDocRoot,
    config,
    enableSSG,
    routeService,
    pluginDriver,
    runtimeTempDir,
  );

  const rsbuild = await createRsbuild({
    rsbuildConfig: mergeRsbuildConfig(
      internalRsbuildConfig,
      ...(pluginDriver
        .getPlugins()
        ?.map(plugin => plugin.builderConfig ?? {}) || []),
      config?.builderConfig || {},
      extraRsbuildConfig || {},
    ),
  });

  rsbuild.addPlugins(builderPlugins);

  return rsbuild;
}
