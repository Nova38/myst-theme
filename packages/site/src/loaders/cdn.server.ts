import type { GenericNode } from 'mystjs';
import { selectAll } from 'unist-util-select';
import NodeCache from 'node-cache';
import { walkPaths } from '@curvenote/nbtx/dist/minify/utils';
import { PageLoader as Data, SiteManifest as Config } from '@curvenote/site-common';
import { responseNoArticle, responseNoSite } from './errors.server';

interface CdnRouter {
  cdn?: string;
}

declare global {
  // Disable multiple caches when this file is rebuilt
  // eslint-disable-next-line
  var cdnRouterCache: NodeCache | undefined, configCache: NodeCache | undefined;
}

function getCdnRouterCache() {
  if (global.cdnRouterCache) return global.cdnRouterCache;
  console.log('Creating cdnRouterCache');
  // The router should update every minute
  global.cdnRouterCache = new NodeCache({ stdTTL: 30 });
  return global.cdnRouterCache;
}

function getConfigCache() {
  if (global.configCache) return global.configCache;
  console.log('Creating configCache');
  // The config can be long lived as it is static (0 == ∞)
  global.configCache = new NodeCache({ stdTTL: 0 });
  return global.configCache;
}

async function getCdnPath(hostname: string): Promise<string | undefined> {
  const cached = getCdnRouterCache().get<CdnRouter>(hostname);
  if (cached) return cached.cdn;
  const response = await fetch(`https://api.curvenote.com/sites/router/${hostname}`);
  if (response.status === 404) {
    // Always hit the API again if it is not found!
    return;
  }
  const data = (await response.json()) as CdnRouter;
  getCdnRouterCache().set<CdnRouter>(hostname, data);
  return data.cdn;
}

function withCDN<T extends string | undefined>(id: string, url: T): T {
  if (!url) return url;
  return `https://cdn.curvenote.com/${id}/public${url}` as T;
}

export async function getConfig(
  request: Request | string,
): Promise<Config | undefined> {
  const hostname =
    typeof request === 'string' ? request : new URL(request.url).hostname;
  const id = await getCdnPath(hostname);
  if (!id) throw responseNoSite(hostname);
  const cached = getConfigCache().get<Config>(id);
  // Load the data from an in memory cache.
  if (cached) return cached;
  const response = await fetch(`https://cdn.curvenote.com/${id}/config.json`);
  if (response.status === 404) throw responseNoSite(hostname);
  const data = (await response.json()) as Config;
  data.id = id;
  data.actions.forEach((action) => {
    if (!action.static) return;
    action.url = withCDN(id, action.url);
  });
  data.logo = withCDN(id, data.logo);
  getConfigCache().set<Config>(id, data);
  return data;
}

export async function getData(
  config?: Config,
  project?: string,
  slug?: string,
): Promise<Data | null> {
  if (!project || !slug || !config) throw responseNoArticle();
  const { id } = config;
  if (!id) throw responseNoSite('');
  const response = await fetch(
    `https://cdn.curvenote.com/${id}/content/${project}/${slug}.json`,
  );
  if (response.status === 404) throw responseNoArticle();
  const data = (await response.json()) as Data;
  // Fix all of the images to point to the CDN
  const images = selectAll('image', data.mdast) as GenericNode[];
  images.forEach((node) => {
    node.url = withCDN(id, node.url);
  });
  const links = selectAll('link,linkBlock', data.mdast) as GenericNode[];
  links
    .filter((node) => node.static)
    .forEach((node) => {
      node.url = withCDN(id, node.url);
    });
  const outputs = selectAll('output', data.mdast) as GenericNode[];
  outputs.forEach((node) => {
    if (!node.data) return;
    walkPaths(node.data, (path, obj) => {
      obj.path = withCDN(id, path);
      obj.content = withCDN(id, obj.content as string);
    });
  });
  return data;
}
