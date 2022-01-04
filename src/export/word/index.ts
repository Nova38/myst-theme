import fs from 'fs';
import { VersionId, KINDS } from '@curvenote/blocks';
import { Block, User, Version } from '../../models';
import { Session } from '../../session';
import { getChildren } from '../../actions/getChildren';
import { loadImagesToBuffers, walkArticle } from '../utils';
import { exportFromOxaLink } from '../utils/exportWrapper';
import { WordOptions, defaultTemplate } from './template';
import { writeDocx } from 'prosemirror-docx';

export * from './schema';
export type { WordOptions, LoadedArticle } from './template';

function assertEndsInDocx(filename: string) {
  if (!filename.endsWith('.docx'))
    throw new Error(`The filename must end with '.docx': "${filename}"`);
}

export async function articleToWord(
  session: Session,
  versionId: VersionId,
  opts: WordOptions,
  documentCreator = defaultTemplate,
) {
  assertEndsInDocx(opts.filename);
  const [block, version] = await Promise.all([
    new Block(session, versionId).get(),
    new Version(session, versionId).get(),
    getChildren(session, versionId), // This loads all the children quickly
  ]);
  if (version.data.kind !== KINDS.Article)
    throw new Error(`The export source must be of kind "Article" not ${version.data.kind}`);

  const user = await new User(session, version.data.created_by).get();
  const article = await walkArticle(session, version.data);
  const buffers = await loadImagesToBuffers(article.images);

  const doc = await documentCreator({
    session,
    user,
    buffers,
    block,
    version,
    article,
    opts,
  });

  await writeDocx(doc, (buffer) => {
    fs.writeFileSync(opts.filename, buffer);
  });
}

export const oxaLinkToWord = exportFromOxaLink(articleToWord);
