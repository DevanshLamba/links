// Latest uploads from the channel's public RSS feed (no API key needed), cached at Vercel's edge.
const FEED = 'https://www.youtube.com/feeds/videos.xml?channel_id=UC_9FuEqcaIIyMHYzNvo7Mpw';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
    if (e[0] !== '#') return ENTITIES[e] ?? m;
    return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
  });
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    const r = await fetch(FEED, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error('feed ' + r.status);
    const xml = await r.text();
    const videos = xml.split('<entry>').slice(1).map((entry) => {
      const pick = (re) => (entry.match(re) || [])[1] || '';
      return {
        id: pick(/<yt:videoId>([^<]+)/),
        title: decode(pick(/<title>([^<]*)/)),
        published: pick(/<published>([^<]+)/),
        views: Number(pick(/views="(\d+)"/)) || 0,
        short: pick(/<link rel="alternate" href="([^"]+)"/).includes('/shorts/'),
      };
    }).filter((v) => v.id);
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');
    res.statusCode = 200;
    res.end(JSON.stringify({ videos }));
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store');
    res.statusCode = 502;
    res.end(JSON.stringify({ error: 'feed unavailable' }));
  }
};
