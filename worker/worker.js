/**
 * BookLens — Cloudflare Worker
 */

const ALLOWED_ORIGIN = 'https://booklens-mom.pages.dev';
const RATE_LIMIT = 10;
const RATE_WINDOW = 60_000; // 1 minute

const rateLimitMap = new Map(); // ip -> { count, resetAt }

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    // Block requests not originating from the frontend
    const origin = request.headers.get('Origin');
    if (origin !== ALLOWED_ORIGIN) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: cors });
    }

    if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors });

    // Rate limiting per IP
    const ip = request.headers.get('CF-Connecting-IP');
    if (!checkRateLimit(ip)) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers: cors });
    }

    try {
      // Step 1: Parse body
      const body = await request.json();

      if (!body.imageBase64) {
        return new Response(JSON.stringify({ error: 'Missing imageBase64' }), { status: 400, headers: cors });
      }

      // Step 2: Call Workers AI
      let aiResponse;
      try {
        aiResponse = await env.AI.run(
          '@cf/meta/llama-3.2-11b-vision-instruct',
          {
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: 'This is a book cover. Reply ONLY with JSON: {"title":"...","author":"..."}' },
                  { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${body.imageBase64}` } },
                ],
              },
            ],
            max_tokens: 150,
          }
        );
      } catch (aiErr) {
        return new Response(JSON.stringify({ error: 'AI step failed' }), { status: 500, headers: cors });
      }

      // Step 3: Parse AI response (may be an object or a string)
      let title = 'Unknown', author = 'Unknown';
      try {
        const raw = aiResponse.response;
        const parsed = typeof raw === 'string'
          ? JSON.parse(raw.trim().replace(/```json\n?|```/g, '').trim())
          : raw;
        title = parsed.title || title;
        author = parsed.author || author;
      } catch (parseErr) {
        const rawStr = typeof aiResponse.response === 'string' ? aiResponse.response : '';
        const tMatch = rawStr.match(/"title"\s*:\s*"([^"]+)"/);
        const aMatch = rawStr.match(/"author"\s*:\s*"([^"]+)"/);
        if (tMatch) title = tMatch[1];
        if (aMatch) author = aMatch[1];
      }

      // Step 4: Google Books
      const query = encodeURIComponent(`${title} ${author}`);
      const apiKey = env.GOOGLE_BOOKS_API_KEY ? `&key=${env.GOOGLE_BOOKS_API_KEY}` : '';
      const booksRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1${apiKey}`);
      const booksData = await booksRes.json();
      const volumeInfo = booksData.items?.[0]?.volumeInfo || {};

      return new Response(JSON.stringify({
        title: volumeInfo.title || title,
        author: volumeInfo.authors?.join(', ') || author,
        publisher: volumeInfo.publisher || null,
        publishedDate: volumeInfo.publishedDate || null,
        pageCount: volumeInfo.pageCount || null,
        categories: volumeInfo.categories?.[0] || null,
        description: volumeInfo.description || null,
        infoLink: volumeInfo.infoLink || null,
        thumbnail: volumeInfo.imageLinks?.thumbnail?.replace('http://', 'https://') || null,
      }), { headers: cors });

    } catch (err) {
      return new Response(JSON.stringify({
        error: err.message,
      }), { status: 500, headers: cors });
    }
  },
};
