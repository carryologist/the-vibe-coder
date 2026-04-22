export async function GET() {
  const xsl = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <xsl:output method="html" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title><xsl:value-of select="/rss/channel/title" /> — RSS Feed</title>
        <style>
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
              Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
            background: #1a1a2e;
            color: #e0e0e0;
            line-height: 1.6;
            padding: 2rem 1rem;
          }

          .container {
            max-width: 720px;
            margin: 0 auto;
          }

          /* ---- Banner ---- */
          .banner {
            background: #16213e;
            border: 1px solid #0f3460;
            border-radius: 8px;
            padding: 1.5rem 2rem;
            margin-bottom: 2.5rem;
          }

          .banner h1 {
            font-size: 1.5rem;
            color: #e94560;
            margin-bottom: 0.5rem;
          }

          .banner p {
            color: #b0b0c0;
            font-size: 0.95rem;
            margin-bottom: 0.5rem;
          }

          .banner code {
            background: #0f3460;
            padding: 0.15rem 0.4rem;
            border-radius: 4px;
            font-size: 0.85rem;
            color: #e94560;
            word-break: break-all;
          }

          .banner a {
            color: #e94560;
            text-decoration: none;
          }

          .banner a:hover {
            text-decoration: underline;
          }

          /* ---- Feed meta ---- */
          .feed-meta {
            margin-bottom: 2rem;
          }

          .feed-meta h2 {
            font-size: 1.25rem;
            color: #ffffff;
            margin-bottom: 0.25rem;
          }

          .feed-meta p {
            color: #8888a0;
            font-size: 0.9rem;
          }

          .home-link {
            display: inline-block;
            margin-top: 0.5rem;
            color: #e94560;
            text-decoration: none;
            font-size: 0.9rem;
          }

          .home-link:hover {
            text-decoration: underline;
          }

          /* ---- Posts ---- */
          .post {
            background: #16213e;
            border: 1px solid #0f3460;
            border-radius: 8px;
            padding: 1.25rem 1.5rem;
            margin-bottom: 1rem;
            transition: border-color 0.2s;
          }

          .post:hover {
            border-color: #e94560;
          }

          .post-title {
            font-size: 1.1rem;
            margin-bottom: 0.25rem;
          }

          .post-title a {
            color: #ffffff;
            text-decoration: none;
          }

          .post-title a:hover {
            color: #e94560;
          }

          .post-date {
            font-size: 0.8rem;
            color: #6a6a80;
            margin-bottom: 0.5rem;
          }

          .post-description {
            font-size: 0.9rem;
            color: #b0b0c0;
            margin-bottom: 0.75rem;
          }

          .post-categories {
            display: flex;
            flex-wrap: wrap;
            gap: 0.4rem;
          }

          .tag {
            background: #0f3460;
            color: #e94560;
            font-size: 0.75rem;
            padding: 0.15rem 0.5rem;
            border-radius: 4px;
          }

          /* ---- Footer ---- */
          .footer {
            margin-top: 2.5rem;
            text-align: center;
            color: #6a6a80;
            font-size: 0.8rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Banner -->
          <div class="banner">
            <h1>This is an RSS Feed</h1>
            <p>
              You can <strong>subscribe</strong> to this feed by copying the URL into your
              favourite RSS reader (like <a href="https://feedly.com">Feedly</a>,
              <a href="https://netnewswire.com">NetNewsWire</a>, or
              <a href="https://newsblur.com">NewsBlur</a>).
            </p>
            <p>Feed URL: <code><xsl:value-of select="/rss/channel/atom:link/@href" /></code></p>
          </div>

          <!-- Feed meta -->
          <div class="feed-meta">
            <h2><xsl:value-of select="/rss/channel/title" /></h2>
            <p><xsl:value-of select="/rss/channel/description" /></p>
            <a class="home-link" href="{/rss/channel/link}">&#8592; Visit the site</a>
          </div>

          <!-- Posts -->
          <xsl:for-each select="/rss/channel/item">
            <div class="post">
              <div class="post-title">
                <a href="{link}"><xsl:value-of select="title" /></a>
              </div>
              <div class="post-date">
                <xsl:value-of select="pubDate" />
              </div>
              <div class="post-description">
                <xsl:value-of select="description" />
              </div>
              <xsl:if test="category">
                <div class="post-categories">
                  <xsl:for-each select="category">
                    <span class="tag"><xsl:value-of select="." /></span>
                  </xsl:for-each>
                </div>
              </xsl:if>
            </div>
          </xsl:for-each>

          <div class="footer">
            Powered by RSS &#183; <a class="home-link" href="{/rss/channel/link}">
              <xsl:value-of select="/rss/channel/title" />
            </a>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>`;

  return new Response(xsl, {
    headers: {
      "Content-Type": "text/xsl; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
