import { GoogleGenAI } from "@google/genai";

/**
 * Proxy for the Gemini AI SDK that calls the server-side API.
 * This prevents the API key from being exposed in the browser.
 */
export function getGeminiAI() {
  return {
    models: {
      generateContent: async ({ model, contents, config }) => {
        const response = await fetch('/api/gemini', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            prompt: contents,
            config
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to generate content');
        }

        return await response.json();
      }
    }
  };
}
