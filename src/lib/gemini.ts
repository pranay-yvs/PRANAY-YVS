import { GoogleGenAI } from "@google/genai";

/**
 * Initializes the Gemini AI SDK with the API key from the environment.
 * Throws a helpful error if the key is missing.
 */
export function getGeminiAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY" || apiKey === "undefined") {
    throw new Error(
      "Gemini API Key is missing. Please set GEMINI_API_KEY in the Secrets panel in the AI Studio Settings menu."
    );
  }
  
  return new GoogleGenAI({ apiKey });
}
