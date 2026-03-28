/**
 * BookLens — Cloudflare Worker (DEBUG VERSION)
 * Paste this into the Cloudflare dashboard editor and deploy.
 * Once the bug is found, we'll switch back to the clean version.
 */

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors });

    const debug = {};

    try {
      // Step 1: Parse body
      debug.step = '1_parse_body';
      const body = await request.json();
      debug.hasImageBase64 = !!body.imageBase64;
      debug.imageBase64Length = body.imageBase64?.length;

      if (!body.imageBase64) {
        return new Response(JSON.stringify({ error: 'Missing imageBase64', debug }), { status: 400, headers: cors });
      }

      // Step 2: Call Workers AI
      debug.step = '2_workers_ai';
      debug.model = '@cf/meta/llama-3.2-11b-vision-instruct';

      let aiResponse;
      try {
        aiResponse = await env.AI.run(
          '@cf/meta/llama-3.2-11b-vision-instruct',
          {
            messages: [
              { role: 'user', content: 'agree' },
              { role: 'assistant', content: 'agree' },
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
        debug.aiRawResponse = aiResponse?.response;
        debug.aiResponseKeys = Object.keys(aiResponse || {});
      } catch (aiErr) {
        debug.aiError = aiErr.message;
        debug.aiErrorCode = aiErr.code;
        return new Response(JSON.stringify({ error: 'AI step failed', debug }), { status: 500, headers: cors });
      }

      // Step 3: Parse AI response
      debug.step = '3_parse_ai';
      let title = 'Unknown', author = 'Unknown';
      try {
        const clean = aiResponse.response.trim().replace(/```json\n?|```/g, '').trim();
        const parsed = JSON.parse(clean);
        title = parsed.title || title;
        author = parsed.author || author;
      } catch (parseErr) {
        debug.parseError = parseErr.message;
        const tMatch = aiResponse.response?.match(/"title"\s*:\s*"([^"]+)"/);
        const aMatch = aiResponse.response?.match(/"author"\s*:\s*"([^"]+)"/);
        if (tMatch) title = tMatch[1];
        if (aMatch) author = aMatch[1];
      }
      debug.extractedTitle = title;
      debug.extractedAuthor = author;

      // Step 4: Google Books
      debug.step = '4_google_books';
      const query = encodeURIComponent(`${title} ${author}`);
      const apiKey = env.GOOGLE_BOOKS_API_KEY ? `&key=${env.GOOGLE_BOOKS_API_KEY}` : '';
      const booksRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1${apiKey}`);
      const booksData = await booksRes.json();
      debug.booksFound = booksData.items?.length || 0;
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
        debug, // remove this once working
      }), { headers: cors });

    } catch (err) {
      return new Response(JSON.stringify({
        error: err.message,
        debug,
      }), { status: 500, headers: cors });
    }
  },
};