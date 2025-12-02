import { GoogleGenAI } from "@google/genai";
import { StrategyConfig } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is not set in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeStrategy = async (code: string, config: StrategyConfig): Promise<string> => {
  const ai = getAiClient();
  if (!ai) {
    return "Error: API Key is missing. Please configure the environment variable API_KEY.";
  }

  const prompt = `
    You are an expert Quantitative Trading Strategy Consultant.
    
    Please analyze the following Python Backtrader strategy code and configuration.
    
    Configuration:
    - Fast MA Period: ${config.shortPeriod}
    - Slow MA Period: ${config.longPeriod}
    - Stop Loss: ${config.stopLoss}%
    - Take Profit: ${config.takeProfit}%

    Code:
    \`\`\`python
    ${code}
    \`\`\`

    Please provide:
    1. A brief explanation of the strategy logic.
    2. Potential risks with the current parameters.
    3. One specific suggestion to improve the code or logic.
    
    Keep the response concise (under 200 words) and format it as Markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No response generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to analyze strategy. Please try again later.";
  }
};