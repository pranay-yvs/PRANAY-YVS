import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, model = "gemini-3-flash-preview", config = {} } = req.body;
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GEMINI_KEY;

  if (!apiKey) {
    return res.status(500).json({ 
      error: 'Gemini API Key is missing on the server. Please add GEMINI_API_KEY (or GEMINI_KEY) to the "Secrets" panel in AI Studio Settings and REFRESH the preview.' 
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
