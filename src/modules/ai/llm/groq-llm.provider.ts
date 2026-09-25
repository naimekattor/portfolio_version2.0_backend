import Groq from 'groq-sdk';
import { ILLMProvider, RagResponse } from '../interfaces/llm.interface.js';
import { env } from '../../../config/env.js';

export class GroqLlmProvider implements ILLMProvider {
  private groq: Groq | null = null;
  private modelName: string;
  private fallbackModels: string[] = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];

  constructor() {
    this.modelName = env.GROQ_MODEL || process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    const apiKey = env.GROQ_API_KEY || process.env.GROQ_API_KEY;
    if (apiKey) {
      try {
        this.groq = new Groq({ apiKey });
      } catch (error) {
        console.error('Failed to initialize Groq client:', error);
      }
    }
  }

  async generateRagResponse(query: string, context: string): Promise<RagResponse> {
    const systemPrompt = `You are a confident, professional, and knowledgeable personal portfolio agent representing Naim (Naimur Rahman Naim). 
Speak in the FIRST PERSON ("I", "my", "I built", "my experience"). You represent the developer directly. NEVER talk about Naim in the third person (e.g. do not say "Naim's expertise" or "Naim built").

CRITICAL RULES:
1. NEVER mention "database", "context", "RAG", "retrieved documents", or how this system works. 
2. Act as a natural, consultative professional. Do not use generic introductions like "Hello, I'm here to help based on the provided context."
3. Speak with confidence about my background, skills, full-stack experience (6+ years), architectural work, and projects.
4. If asked about something not explicitly detailed, answer gracefully from general engineering strengths or related projects. Do NOT say "I couldn't find this in the database."
5. Never invent or hallucinate projects, features, or experience that contradict the portfolio. Ground your responses in the actual provided knowledge.

PROJECT RECOMMENDATION RULES:
- Recommend ONLY projects genuinely relevant to the visitor's request. 
- Domain/intent relevance is more important than technology overlap.
- If the visitor makes a BROAD request (e.g. "show me some projects"), do NOT dump every project. Curate 2-3 representative projects and present them naturally.
- If only one project is strongly relevant to a specific query, recommend ONLY that project.

Return your response in JSON format matching this structure exactly:
{
  "answer": "your grounded, professional answer here",
  "sources": [{"documentId": "...", "title": "...", "source": "..."}]
}
Make sure to return valid JSON.`;

    const userPrompt = `Context:\n${context}\n\nQuestion: ${query}`;

    if (!this.groq) {
      return {
        answer: 'AI chat service is not configured yet. Please provide GROQ_API_KEY in the backend environment.',
        sources: [],
      };
    }

    const candidateModels = Array.from(new Set([this.modelName, ...this.fallbackModels]));
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const response = await this.groq.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        });

        const content = response.choices[0]?.message?.content || '{}';
        
        try {
          const parsed = JSON.parse(content) as RagResponse;
          if (parsed && typeof parsed.answer === 'string') {
            return {
              answer: parsed.answer,
              sources: Array.isArray(parsed.sources) ? parsed.sources : []
            };
          }
          return { answer: content, sources: [] };
        } catch (e) {
          return { answer: content, sources: [] };
        }
      } catch (error: any) {
        lastError = error;
        console.warn(`Groq model ${model} failed: ${error.message}. Trying next candidate...`);
      }
    }

    console.error("Groq API failed on all candidate models", lastError);
    return { answer: "Unable to generate response from Groq.", sources: [] };
  }

  getModelName(): string {
    return this.modelName;
  }
}
