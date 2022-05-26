import fs from 'fs';
import { extname, parse, join } from 'path';
import { ISession } from './session';
import { selectors } from './store';
import { projects } from './store/local';
import {
  Frontmatter,
  SiteManifest,
  pageLevels,
  LocalProjectFolder,
  LocalProjectPage,
  LocalProject,
  ManifestProject,
} from './types';
import { resolveFrontmatter } from './web/frontmatter';
import { publicPath } from './web/utils';
import { JupyterBookChapter, readTOC } from './export/jupyter-book/toc';

const DEFAULT_INDEX_FILES = ['index.md', 'readme.md'];
const VALID_FILE_EXTENSIONS = ['.md', '.ipynb'];

const tocFile = (path: string): string => join(path, '_toc.yml');

type PageSlugs = Record<string, number>;

function isValidFile(file: string): boolean {
  return VALID_FILE_EXTENSIONS.includes(parse(file).ext);
}

function resolveExtension(file: string): string | undefined {
  if (fs.existsSync(file)) return file;
  return VALID_FILE_EXTENSIONS.map((ext) => `${file}${ext}`).find((fileExt) =>
    fs.existsSync(fileExt),
  );
}

export function isDirectory(file: string): boolean {
  return fs.lstatSync(file).isDirectory();
}

function fileInfo(file: string, pageSlugs: PageSlugs): { slug: string; title: string } {
  let slug = parse(file).name.toLowerCase();
  const title = slug;
  if (pageSlugs[slug]) {
    pageSlugs[slug] += 1;
    slug = `${slug}-${pageSlugs[slug] - 1}`;
  } else {
    pageSlugs[slug] = 1;
  }
  return { slug, title };
}

function getCitationPaths(session: ISession, path: string): string[] {
  // TODO: traverse to find all bibs, and or read from toc/config
  const ref = join(path, 'references.bib');
  if (!fs.existsSync(ref)) {
    session.log.debug(`Expected citations at "${ref}"`);
    return [];
  }
  return [ref];
}

function chaptersToPages(
  path: string,
  chapters: JupyterBookChapter[],
  pages: (LocalProjectFolder | LocalProjectPage)[] = [],
  level: pageLevels = 1,
  pageSlugs: PageSlugs,
): (LocalProjectFolder | LocalProjectPage)[] {
  chapters.forEach((chapter) => {
    // Note: the title will get updated when the file is processed
    const file = resolveExtension(join(path, chapter.file));
    if (!file) {
      throw Error(`File from ${tocFile(path)} not found: ${chapter.file}`);
    }
    pages.push({ file, level, ...fileInfo(file, pageSlugs) });
    const newLevel = level < 5 ? level + 1 : 6;
    if (chapter.sections) {
      chaptersToPages(path, chapter.sections, pages, newLevel as pageLevels, pageSlugs);
    }
  });
  return pages;
}

/**
 * Build project structure from jupyterbook '_toc.yml' file
 */
export function projectFromToc(session: ISession, path: string): LocalProject {
  const filename = tocFile(path);
  if (!fs.existsSync(filename)) {
    throw new Error(`Could not find TOC "${filename}". Please create a '_toc.yml'.`);
  }
  const toc = readTOC({ filename });
  const pageSlugs: PageSlugs = {};
  const indexFile = resolveExtension(join(path, toc.root));
  if (!indexFile) {
    throw Error(`Root from ${tocFile(path)} not found: ${indexFile}`);
  }
  const { slug, title } = fileInfo(indexFile, pageSlugs);
  const pages: (LocalProjectFolder | LocalProjectPage)[] = [];
  if (toc.chapters) {
    chaptersToPages(path, toc.chapters, pages, 1, pageSlugs);
  } else if (toc.parts) {
    toc.parts.forEach((part, index) => {
      if (part.caption) {
        pages.push({ title: part.caption || `Part ${index + 1}`, level: 1 });
      }
      if (part.chapters) {
        chaptersToPages(path, part.chapters, pages, 2, pageSlugs);
      }
    });
  }
  const citations = getCitationPaths(session, path);
  return { path, file: indexFile, index: slug, title, pages, citations };
}

function projectPagesFromPath(
  path: string,
  level: pageLevels,
  pageSlugs: PageSlugs,
  ignore?: string[],
): (LocalProjectFolder | LocalProjectPage)[] {
  return fs
    .readdirSync(path)
    .map((file) => join(path, file))
    .filter((file) => !ignore || !ignore.includes(file))
    .filter((file) => isValidFile(file) || isDirectory(file))
    .sort()
    .map((file) => {
      if (isValidFile(file)) {
        return {
          file,
          level,
          ...fileInfo(file, pageSlugs),
        } as LocalProjectPage;
      }
      const projectFolder = { title: fileInfo(file, pageSlugs).title, level };
      const newLevel = level < 5 ? level + 1 : 6;
      const pages = projectPagesFromPath(file, newLevel as pageLevels, pageSlugs, ignore);
      return pages.length ? [projectFolder].concat(pages) : [];
    })
    .flat();
}

/**
 * Build project structure from local file/folder structure.
 */
export function projectFromPath(session: ISession, path: string, indexFile?: string): LocalProject {
  if (!indexFile) {
    fs.readdirSync(path).forEach((file) => {
      if (DEFAULT_INDEX_FILES.includes(file.toLowerCase())) {
        indexFile = join(path, file);
      }
    });
  }
  if (!indexFile || !fs.existsSync(indexFile)) {
    throw Error(`index file ${indexFile || DEFAULT_INDEX_FILES.join(',')} not found`);
  }
  const pageSlugs: PageSlugs = {};
  const { slug, title } = fileInfo(indexFile, pageSlugs);
  const pages = projectPagesFromPath(path, 1, pageSlugs, [indexFile, join(path, '_build')]);
  const citations = getCitationPaths(session, path);
  return { file: indexFile, index: slug, path, title, pages, citations };
}

/**
 * Load project structure from disk from
 *
 * @param session
 * @param path - root directory of project, relative to current directory; default is '.'
 * @param index - index file, including path relative to current directory; default is 'index.md'
 *     or 'readme.md' in 'path' directory
 *
 * If jupyterbook '_toc.yml' exists in path, project structure will be derived from that.
 * In this case, index will be ignored in favor of root from '_toc.yml'
 * If '_toc.yml' does not exist, project structure will be built from the local file/foler structure.
 */
export function loadProjectFromDisk(
  session: ISession,
  path?: string,
  index?: string,
): LocalProject {
  path = path || '.';
  let newProject;
  if (fs.existsSync(tocFile(path))) {
    newProject = projectFromToc(session, path);
  } else {
    const project = selectors.selectLocalProject(session.store.getState(), path);
    if (!index && project?.file) {
      index = project.file;
    }
    newProject = projectFromPath(session, path, index);
  }
  if (!newProject) {
    throw new Error(`Could load project from ${path}`);
  }
  session.store.dispatch(projects.actions.receive(newProject));
  return newProject;
}

/**
 * Convert local project representation to site manifest project
 *
 * This does a couple things:
 * - Adds projectSlug (which locally comes from site config)
 * - Removes any local file references
 */
export function localToManifestProject(
  proj: LocalProject,
  projectSlug: string,
  frontmatter: Frontmatter,
): ManifestProject {
  const { title: projectTitle, index, pages } = proj;
  const manifestPages = pages.map((page) => {
    if ('file' in page) {
      const { slug, title, level } = page;
      return { slug, title, level };
    }
    return page;
  });
  return { slug: projectSlug, index, title: projectTitle, pages: manifestPages, ...frontmatter };
}

function copyLogo(session: ISession, logoName?: string | null): string | undefined {
  if (!logoName) {
    session.log.debug('No logo specified, Curvespace renderer will use default logo');
    return undefined;
  }
  if (!fs.existsSync(logoName)) {
    // Look in the local public path
    logoName = join('public', logoName);
  }
  if (!fs.existsSync(logoName))
    throw new Error(`Could not find logo at "${logoName}". See 'config.site.logo'`);
  const logo = `logo${extname(logoName)}`;
  fs.copyFileSync(logoName, join(publicPath(session), logo));
  return `/${logo}`;
}

/**
 * Build site manifest from local curvenote state
 *
 * Site manifest acts as the configuration to build the curvespace site.
 * It combines local site config and project configs into a single structure.
 */
export function getSiteManifest(session: ISession): SiteManifest {
  const siteProjects: ManifestProject[] = [];
  const state = session.store.getState();
  const siteConfig = selectors.selectLocalSiteConfig(state);
  if (!siteConfig) throw Error('no site config defined');
  siteConfig.projects.forEach((siteProj) => {
    const projConfig = selectors.selectLocalProjectConfig(state, siteProj.path);
    const frontmatter = resolveFrontmatter(
      siteConfig.frontmatter || {},
      projConfig?.frontmatter || {},
      session.log,
      siteProj.path,
    );
    const proj = selectors.selectLocalProject(state, siteProj.path);
    if (!proj) return;
    siteProjects.push(localToManifestProject(proj, siteProj.slug, frontmatter));
  });
  const { title, twitter, logo, logoText, nav, actions } = siteConfig;
  const manifest: SiteManifest = {
    title: title || '',
    twitter,
    logo: copyLogo(session, logo),
    logoText,
    nav,
    actions,
    projects: siteProjects,
  };
  return manifest;
}
