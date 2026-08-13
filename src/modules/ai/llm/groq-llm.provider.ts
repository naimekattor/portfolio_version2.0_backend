import Groq from 'groq-sdk';
import { ILLMProvider, RagResponse } from '../interfaces/llm.interface.js';
import { env } from '../../../config/env.js';

export class GroqLlmProvider implements ILLMProvider {
  private groq: Groq;
  private modelName = 'llama-3.3-70b-versatile'; // Or 'mixtral-8x7b-32768'

  constructor() {
    this.groq = new Groq({
      apiKey: env.GROQ_API_KEY || process.env.GROQ_API_KEY,
    });
  }

  async generateRagResponse(query: string, context: string): Promise<RagResponse> {
    const systemPrompt = `You are a helpful portfolio AI assistant. 
You must answer the user's question based strictly on the provided portfolio context. 
If the answer cannot be found in the context, clearly state that the information is not available in the portfolio. 
Do not invent or hallucinate any details.
Return your response in JSON format matching this structure exactly:
{
  "answer": "your grounded answer here",
  "sources": [{"documentId": "...", "title": "...", "source": "..."}]
}
Only include sources that were actually used to construct the answer. Make sure to return valid JSON.`;

    const userPrompt = `Context:\n${context}\n\nQuestion: ${query}`;

    try {
      const response = await this.groq.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content || '{}';
      
      try {
        const parsed = JSON.parse(content) as RagResponse;
        if (!parsed.answer || !parsed.sources) {
            return { answer: content, sources: [] };
        }
        return parsed;
      } catch (e) {
        return { answer: content, sources: [] };
      }
    } catch (error) {
      console.error("Groq API error", error);
      return { answer: "Unable to generate response from Groq.", sources: [] };
    }
  }

  getModelName(): string {
    return this.modelName;
  }
}
