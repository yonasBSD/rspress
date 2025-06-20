import path from 'node:path';
import { DEFAULT_PAGE_EXTENSIONS } from '@rspress/shared/constants';
import { describe, expect, it } from 'vitest';
import { walk } from './walk';

describe('walk', () => {
  it('basic', async () => {
    const docsDir = path.join(__dirname, './fixtures/docs');
    const sidebar = await walk(docsDir, '/', docsDir, DEFAULT_PAGE_EXTENSIONS);
    expect(sidebar).toMatchInlineSnapshot(`
      {
        "nav": [
          {
            "activeMatch": "^/guide/",
            "link": "/guide/",
            "text": "Guide",
          },
        ],
        "sidebar": {
          "/guide": [
            {
              "_fileKey": "guide/test-dir/index",
              "collapsed": undefined,
              "collapsible": undefined,
              "context": undefined,
              "items": [
                {
                  "_fileKey": "guide/test-dir/getting-started",
                  "context": undefined,
                  "link": "/guide/test-dir/getting-started",
                  "overviewHeaders": undefined,
                  "tag": undefined,
                  "text": "Getting started",
                },
              ],
              "link": "/guide/test-dir/index",
              "overviewHeaders": undefined,
              "tag": undefined,
              "text": "Test dir",
            },
            {
              "_fileKey": "guide/test-same-name-dir",
              "collapsed": undefined,
              "collapsible": undefined,
              "context": undefined,
              "items": [
                {
                  "_fileKey": "guide/test-same-name-dir/index",
                  "context": undefined,
                  "link": "/guide/test-same-name-dir/index",
                  "overviewHeaders": undefined,
                  "tag": undefined,
                  "text": "Test same name dir",
                },
              ],
              "link": "/guide/test-same-name-dir",
              "overviewHeaders": undefined,
              "tag": undefined,
              "text": "Test same name dir in file",
            },
            {
              "_fileKey": "guide/a",
              "context": undefined,
              "link": "/guide/a",
              "overviewHeaders": undefined,
              "tag": undefined,
              "text": "Page a",
            },
            {
              "_fileKey": "guide/b",
              "context": undefined,
              "link": "/guide/b",
              "overviewHeaders": undefined,
              "tag": undefined,
              "text": "Page b",
            },
            {
              "_fileKey": "guide/c",
              "context": undefined,
              "link": "/guide/c",
              "overviewHeaders": undefined,
              "tag": undefined,
              "text": "c",
            },
          ],
        },
      }
    `);
  });
  it('no meta', async () => {
    const docsDir = path.join(__dirname, './fixtures/docs-no-meta');
    const sidebar = await walk(docsDir, '/', docsDir, DEFAULT_PAGE_EXTENSIONS);
    expect(sidebar).toMatchInlineSnapshot(`
      {
        "nav": [],
        "sidebar": {
          "/api": [
            {
              "_fileKey": "api/api",
              "context": undefined,
              "link": "/api/api",
              "overviewHeaders": undefined,
              "tag": undefined,
              "text": "Api",
            },
            {
              "_fileKey": "api/guide/index",
              "collapsed": undefined,
              "collapsible": undefined,
              "context": undefined,
              "items": [
                {
                  "_fileKey": "api/guide/getting-started",
                  "context": undefined,
                  "link": "/api/guide/getting-started",
                  "overviewHeaders": undefined,
                  "tag": undefined,
                  "text": "Getting started",
                },
              ],
              "link": "/api/guide/index",
              "overviewHeaders": undefined,
              "tag": undefined,
              "text": "Guide",
            },
            {
              "_fileKey": "api/index",
              "context": undefined,
              "link": "/api/index",
              "overviewHeaders": undefined,
              "tag": undefined,
              "text": "No meta",
            },
          ],
        },
      }
    `);
  });
});
