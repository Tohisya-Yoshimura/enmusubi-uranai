// api/fortune.js
// Vercel Functions - Gemini API プロキシ（完全連携版）

export default async function handler(req, res) {
  // CORSヘッダーの設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // フロント側（index.html）から送られてくるデータを取得
  const { prompt, generationConfig } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  // GEMINI_API_KEY、または以前の ANTHROPIC_API_KEY のどちらからでも動くように互換性を持たせます
  const apiKey = process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY; 
  if (!apiKey) {
    return res.status(500).json({ error: 'API_KEY is not set' });
  }

  try {
    // 2026年現在の推奨高速モデル Gemini 2.5 Flash
    const model = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        // フロント側から送られてきた拡張設定（maxOutputTokens: 2000など）を適用。
        // 万が一送られてこなかった場合の安全な初期値も設定。
        generationConfig: generationConfig || {
          maxOutputTokens: 2000,
          temperature: 0.7
        },
        // 占いのマイルドな恋愛表現が誤判定でブロックされるのを完全に防ぐ設定
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', errText);
      return res.status(response.status).json({ error: 'Gemini API error', detail: errText });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
}
