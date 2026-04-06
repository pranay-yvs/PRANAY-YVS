import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, model = "gemini-3-flash-preview", config = {} } = req.body;
  const keys = [
    process.env.FYP_KEY,
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_KEY,
    process.env.API_KEY
  ];

  let apiKey = '';
  for (const key of keys) {
    if (key && key.trim() && !key.includes('YOUR_') && !key.includes('MY_GEMINI')) {
      apiKey = key.trim();
      break;
    }
  }

  // Debug log for key presence (masked)
  if (apiKey) {
    const maskedKey = apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 4);
    console.log(`Gemini API Key found and validated: ${maskedKey}`);
  }

  // Check for missing or placeholder keys
  if (!apiKey || apiKey === 'undefined' || apiKey === 'null' || apiKey === 'YOUR_GEMINI_API_KEY') {
    return res.status(500).json({ 
      error: 'Gemini API Key is missing or invalid on the server. Please add GEMINI_KEY or FYP_KEY to the "Secrets" panel in AI Studio Settings and REFRESH the preview.' 
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config
    });

    return res.status(200).json({ text: response.text });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: error.message || 'Failed to generate content' });
  }
}
