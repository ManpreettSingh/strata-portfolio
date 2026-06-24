export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    '*'
  );

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url query parameter' });
  }

  try {
    const targetUrl = decodeURIComponent(url);
    console.log(`[Vercel Proxy] Fetching from: ${targetUrl}`);

    // Forward relevant headers
    const fetchHeaders = new Headers();
    if (req.headers['user-agent']) fetchHeaders.set('User-Agent', req.headers['user-agent']);
    if (req.headers['accept']) fetchHeaders.set('Accept', req.headers['accept']);
    if (req.headers['cookie']) fetchHeaders.set('Cookie', req.headers['cookie']);
    if (req.headers['content-type']) fetchHeaders.set('Content-Type', req.headers['content-type']);

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: fetchHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
    });

    // Forward Set-Cookie and other important response headers back to the client
    const setCookies = response.headers.getSetCookie ? response.headers.getSetCookie() : [response.headers.get('set-cookie')].filter(Boolean);
    if (setCookies && setCookies.length > 0) {
      res.setHeader('Set-Cookie', setCookies);
    }
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    // Return raw buffer to handle both JSON and Text (like CSV or Cookie endpoints)
    const buffer = await response.arrayBuffer();
    res.status(response.status).send(Buffer.from(buffer));
  } catch (error) {
    console.error('[Vercel Proxy] Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
