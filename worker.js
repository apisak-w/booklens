/**

- BookLens — Cloudflare Workerx
- 
- Receives a book cover image (base64), runs Llama 3.2-Vision via
- Cloudflare Workers AI to extract the title/author, then fetches
- metadata from the Google Books API.
- 
- Deploy: wrangler deploy
- Endpoint: POST /scan   { imageBase64: “…” }
  */

export default {
async fetch(request, env) {
const cors = {
‘Access-Control-Allow-Origin’: ‘*’,
‘Access-Control-Allow-Methods’: ‘POST, OPTIONS’,
‘Access-Control-Allow-Headers’: ‘Content-Type’,
‘Content-Type’: ‘application/json’,
};

// Handle CORS preflight
if (request.method === 'OPTIONS') {
  return new Response(null, { headers: cors });
}

if (request.method !== 'POST') {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405, headers: cors,
  });
}

try {
  // ── 1. Parse incoming image ──────────────────────────────────────
  const body = await request.json();
  const { imageBase64 } = body;

  if (!imageBase64) {
    return new Response(JSON.stringify({ error: 'Missing imageBase64' }), {
      status: 400, headers: cors,
    });
  }

  // ── 2. Run Llama 3.2-Vision (Workers AI) ────────────────────────
  const aiResponse = await env.AI.run(
    '@cf/meta/llama-3.2-11b-vision-instruct',
    {
      messages: [
        {
          // Required by Cloudflare to accept Llama 3.2 Community License
          role: 'user',
          content: 'agree',
        },
        {
          role: 'assistant',
          content: 'agree',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'This is a book cover image. Extract the exact book title and author name as shown on the cover. Reply ONLY with valid JSON in this format: {"title":"...","author":"..."}',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 150,
    }
  );

  // ── 3. Parse AI response ─────────────────────────────────────────
  let title = 'Unknown';
  let author = 'Unknown';

  try {
    const text = aiResponse.response.trim();
    // Strip markdown fences if present
    const clean = text.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(clean);
    title = parsed.title || title;
    author = parsed.author || author;
  } catch {
    // Fallback: regex extraction
    const tMatch = aiResponse.response.match(/"title"\s*:\s*"([^"]+)"/);
    const aMatch = aiResponse.response.match(/"author"\s*:\s*"([^"]+)"/);
    if (tMatch) title = tMatch[1];
    if (aMatch) author = aMatch[1];
  }

  // ── 4. Google Books API lookup (free) ────────────────────────────
  const query = encodeURIComponent(`${title} ${author}`);
  const apiKey = env.GOOGLE_BOOKS_API_KEY
    ? `&key=${env.GOOGLE_BOOKS_API_KEY}`
    : '';
  
  const booksRes = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1${apiKey}`
  );
  const booksData = await booksRes.json();
  const volumeInfo = booksData.items?.[0]?.volumeInfo || {};

  // ── 5. Return merged result ──────────────────────────────────────
  const result = {
    // Prefer Google Books data (more accurate), fall back to AI extraction
    title: volumeInfo.title || title,
    author: volumeInfo.authors?.join(', ') || author,
    publisher: volumeInfo.publisher || null,
    publishedDate: volumeInfo.publishedDate || null,
    pageCount: volumeInfo.pageCount || null,
    categories: volumeInfo.categories?.[0] || null,
    description: volumeInfo.description || null,
    infoLink: volumeInfo.infoLink || null,
    thumbnail: volumeInfo.imageLinks?.thumbnail || null,
    isbn13: volumeInfo.industryIdentifiers?.find(i => i.type === 'ISBN_13')?.identifier || null,
    // AI-extracted values for reference
    aiExtracted: { title, author },
  };

  return new Response(JSON.stringify(result), { headers: cors });

} catch (err) {
  console.error('BookLens error:', err);
  return new Response(
    JSON.stringify({ error: err.message || 'Internal server error' }),
    { status: 500, headers: cors }
  );
}

},
};