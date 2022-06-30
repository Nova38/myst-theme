import { ManifestProjectPage, SiteManifest } from '@curvenote/site-common';

export function sitemapStylesheetIndex() {
  return `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9" version="1.0" exclude-result-prefixes="sitemap">
<xsl:output method="html" encoding="UTF-8" indent="yes"/>
<xsl:variable name="has-lastmod" select="count( /sitemap:sitemapindex/sitemap:sitemap/sitemap:lastmod )"/>
<xsl:template match="/">
<html lang="en-US" prefix="og: http://ogp.me/ns# fb: http://ogp.me/ns/fb#">
<head>
<title>XML Sitemap</title>
<style> body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif; color: #444; } #sitemap { max-width: 980px; margin: 0 auto; } #sitemap__table { width: 100%; border: solid 1px #ccc; border-collapse: collapse; } #sitemap__table tr td.loc { /* * URLs should always be LTR. * See https://core.trac.wordpress.org/ticket/16834 * and https://core.trac.wordpress.org/ticket/49949 */ direction: ltr; } #sitemap__table tr th { text-align: left; } #sitemap__table tr td, #sitemap__table tr th { padding: 10px; } #sitemap__table tr:nth-child(odd) td { background-color: #eee; } a:hover { text-decoration: none; } </style>
</head>
<body>
<div id="sitemap">
<div id="sitemap__header">
<h1>XML Sitemap</h1>
<p>This XML Sitemap is generated by Curvenote to make your content more visible for search engines.</p>
<p>
<a href="https://www.sitemaps.org/">Learn more about XML sitemaps.</a>
</p>
</div>
<div id="sitemap__content">
<p class="text">
Number of URLs in this XML Sitemap:
<xsl:value-of select="count( sitemap:sitemapindex/sitemap:sitemap )"/>
.
</p>
<table id="sitemap__table">
<thead>
<tr>
<th class="loc">URL</th>
<xsl:if test="$has-lastmod">
<th class="lastmod">Last Modified</th>
</xsl:if>
</tr>
</thead>
<tbody>
<xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
<tr>
<td class="loc">
<a href="{sitemap:loc}">
<xsl:value-of select="sitemap:loc"/>
</a>
</td>
<xsl:if test="$has-lastmod">
<td class="lastmod">
<xsl:value-of select="sitemap:lastmod"/>
</td>
</xsl:if>
</tr>
</xsl:for-each>
</tbody>
</table>
</div>
</div>
</body>
</html>
</xsl:template>
</xsl:stylesheet>`;
}
export function sitemapStylesheet() {
  return `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9" version="1.0" exclude-result-prefixes="sitemap">
<xsl:output method="html" encoding="UTF-8" indent="yes"/>
<xsl:variable name="has-lastmod" select="count( /sitemap:urlset/sitemap:url/sitemap:lastmod )"/>
<xsl:variable name="has-changefreq" select="count( /sitemap:urlset/sitemap:url/sitemap:changefreq )"/>
<xsl:variable name="has-priority" select="count( /sitemap:urlset/sitemap:url/sitemap:priority )"/>
<xsl:template match="/">
<html lang="en-US" prefix="og: http://ogp.me/ns# fb: http://ogp.me/ns/fb#">
<head>
<title>XML Sitemap</title>
<style> body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif; color: #444; } #sitemap { max-width: 980px; margin: 0 auto; } #sitemap__table { width: 100%; border: solid 1px #ccc; border-collapse: collapse; } #sitemap__table tr td.loc { /* * URLs should always be LTR. * See https://core.trac.wordpress.org/ticket/16834 * and https://core.trac.wordpress.org/ticket/49949 */ direction: ltr; } #sitemap__table tr th { text-align: left; } #sitemap__table tr td, #sitemap__table tr th { padding: 10px; } #sitemap__table tr:nth-child(odd) td { background-color: #eee; } a:hover { text-decoration: none; } </style>
</head>
<body>
<div id="sitemap">
<div id="sitemap__header">
<h1>XML Sitemap</h1>
<p>This XML Sitemap is generated by Curvenote to make your content more visible for search engines.</p>
<p>
<a href="https://www.sitemaps.org/">Learn more about XML sitemaps.</a>
</p>
</div>
<div id="sitemap__content">
<p class="text">
Number of URLs in this XML Sitemap:
<xsl:value-of select="count( sitemap:urlset/sitemap:url )"/>
</p>
<table id="sitemap__table">
<thead>
<tr>
<th class="loc">URL</th>
<xsl:if test="$has-lastmod">
<th class="lastmod">Last Modified</th>
</xsl:if>
<xsl:if test="$has-changefreq">
<th class="changefreq">Change Frequency</th>
</xsl:if>
<xsl:if test="$has-priority">
<th class="priority">Priority</th>
</xsl:if>
</tr>
</thead>
<tbody>
<xsl:for-each select="sitemap:urlset/sitemap:url">
<tr>
<td class="loc">
<a href="{sitemap:loc}">
<xsl:value-of select="sitemap:loc"/>
</a>
</td>
<xsl:if test="$has-lastmod">
<td class="lastmod">
<xsl:value-of select="sitemap:lastmod"/>
</td>
</xsl:if>
<xsl:if test="$has-changefreq">
<td class="changefreq">
<xsl:value-of select="sitemap:changefreq"/>
</td>
</xsl:if>
<xsl:if test="$has-priority">
<td class="priority">
<xsl:value-of select="sitemap:priority"/>
</td>
</xsl:if>
</tr>
</xsl:for-each>
</tbody>
</table>
</div>
</div>
</body>
</html>
</xsl:template>
</xsl:stylesheet>`;
}

export function getSiteSlugs(site: SiteManifest, baseurl = ''): string[] {
  const slugs = site.projects
    .map((project) => {
      const pages = project.pages
        .filter((page): page is ManifestProjectPage => 'slug' in page)
        .map((page) => `${baseurl}/${project.slug}/${page.slug}`);
      return [`${baseurl}/${project.slug}`, ...pages];
    })
    .flat();
  return slugs;
}

export function createSitemapIndex(
  domain: string,
  sitemaps: string[],
  style = '/sitemap_index.xsl',
) {
  const sitemapsXml = sitemaps
    .map((sitemap) => `  <sitemap>\n    <loc>${domain}${sitemap}</loc>\n  </sitemap>`)
    .join('\n');
  return `
<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="${domain}${style}" ?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapsXml}
</sitemapindex>`;
}

export function createSitemap(
  domain: string,
  pages: string[],
  style = '/sitemap_style.xsl',
) {
  const urlsXml = pages
    .map((url) => `  <url>\n    <loc>${domain}${url}</loc>\n  </url>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="${domain}${style}" ?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>
`;
}

export function sitemapStylesheetIndexResponse() {
  return new Response(sitemapStylesheetIndex(), {
    status: 200,
    headers: { 'Content-Type': 'application/xml' },
  });
}

export function sitemapStylesheetResponse() {
  return new Response(sitemapStylesheet(), {
    status: 200,
    headers: { 'Content-Type': 'application/xml' },
  });
}

export function createSitemapResponse(domain: string, pages: string[]) {
  return new Response(createSitemap(domain, pages), {
    status: 200,
    headers: { 'Content-Type': 'application/xml' },
  });
}
