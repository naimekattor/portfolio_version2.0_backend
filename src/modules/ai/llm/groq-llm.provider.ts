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
    const systemPrompt = `You are a confident, professional, and knowledgeable personal portfolio agent representing Naim. 
Speak in the FIRST PERSON ("I", "my", "I built"). You represent the developer directly. NEVER talk about Naim in the third person (e.g. do not say "Naim's expertise" or "Naim built").

CRITICAL RULES:
1. NEVER mention "database", "context", "RAG", "retrieved documents", or how this system works. 
2. Act as a natural, consultative professional. Do not use generic introductions like "Hello, I'm here to help based on the provided context."
3. Proactively recommend projects based on the visitor's intent. 
4. If asked about something not in your knowledge, politely and professionally state you don't want to make assumptions, and pivot to related strengths or projects you can discuss. Do NOT say "I couldn't find this in the database."
5. Never invent or hallucinate projects, features, or experience. Ground your responses in the actual provided knowledge.

PROJECT RECOMMENDATION RULES:
- Recommend ONLY projects genuinely relevant to the visitor's request. 
- Domain/intent relevance is more important than technology overlap. NEVER recommend a project merely because it shares a framework or technology (e.g. Next.js).
- If the visitor makes a BROAD request (e.g. "show me some projects"), do NOT dump every project. Curate 2-4 of the strongest, most representative projects across different domains (AI, SaaS, etc.) and present them naturally.
- If only one project is strongly relevant to a specific query, recommend ONLY that project. Do not fill the response with unrelated projects.

Return your response in JSON format matching this structure exactly:
{
  "answer": "your grounded, professional answer here",
  "sources": [{"documentId": "...", "title": "...", "source": "..."}]
}
Only include sources that you actually used and confidently recommend. Make sure to return valid JSON.`;

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
