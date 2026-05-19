// api/fortune.js
// Vercel Functions - Gemini API プロキシ（最大文字数拡張版）

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  // ※環境変数を新しく用意した GEMINI_API_KEY に変更してください
  const apiKey = process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY; 
  if (!apiKey) {
    return res.status(500).json({ error: 'API_KEY is not set' });
  }

  try {
    // 2026年現在の高速・高精度な推奨モデル
    const model = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // ▼ ここで出力の上限を大きく拡張して、途切れを絶対に防ぎます
        generationConfig: {
          maxOutputTokens: 2000, 
          temperature: 0.7
        },
        // 占いの表現が誤判定でブロックされるのを防ぐセーフティ設定
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
