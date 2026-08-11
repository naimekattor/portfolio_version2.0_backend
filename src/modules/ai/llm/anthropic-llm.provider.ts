import Anthropic from '@anthropic-ai/sdk';
import { ILLMProvider, RagResponse } from '../interfaces/llm.interface.js';
import { env } from '../../../config/env.js';

export class AnthropicLlmProvider implements ILLMProvider {
  private anthropic: Anthropic;
  private modelName = 'claude-3-5-sonnet-20240620';

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
    });
  }

  async generateRagResponse(query: string, context: string): Promise<RagResponse> {
    const systemPrompt = `You are a helpful portfolio AI assistant. 
You must answer the user's question based strictly on the provided portfolio context. 
If the answer cannot be found in the context, clearly state that the information is not available in the portfolio. 
Do not invent or hallucinate any details.
Return your response in JSON format matching this structure:
{
  "answer": "your grounded answer here",
  "sources": [{"documentId": "...", "title": "...", "source": "..."}]
}
Only include sources that were actually used to construct the answer.`;

    const userPrompt = `Context:\n${context}\n\nQuestion: ${query}`;

    const response = await this.anthropic.messages.create({
      model: this.modelName,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      try {
        // Find JSON block in the response text if the model wraps it
        const text = content.text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as RagResponse;
        }
        return JSON.parse(text) as RagResponse;
      } catch (e) {
        return { answer: content.text, sources: [] };
      }
    }
    
    return { answer: "Unable to generate response.", sources: [] };
  }

  getModelName(): string {
    return this.modelName;
  }
}
