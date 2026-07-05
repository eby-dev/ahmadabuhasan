import { getCollection } from 'astro:content';
import { SITE } from '@/config/site';

/**
 * Minimal RSS 2.0 feed. Ships empty until the first non-draft blog post lands
 * — the feed still returns valid XML so aggregators can subscribe pre-launch.
 */
export async function GET() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  posts.sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());

  const items = posts
    .map((post) => {
      const url = new URL(`/blog/${post.id}`, SITE.url).toString();
      return `
    <item>
      <title><![CDATA[${post.data.title}]]></title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${post.data.publishedAt.toUTCString()}</pubDate>
      <description><![CDATA[${post.data.description}]]></description>
    </item>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE.name} — Blog</title>
    <link>${SITE.url}/blog</link>
    <atom:link href="${SITE.url}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Notes on Android, Flutter, and mobile engineering by ${SITE.name}.</description>
    <language>${SITE.locale}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
