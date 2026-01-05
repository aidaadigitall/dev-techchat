
import { GoogleGenAI } from "@google/genai";
import { prisma } from '../lib/prisma';

export class AIService {
  
  /**
   * Generates a suggestion for a specific conversation based on tenant configuration.
   */
  async generateSuggestion(tenantId: string, conversationId: string): Promise<void> {
    try {
      // 1. Fetch Tenant AI Config
      const llmConfig = await prisma.lLMConfig.findFirst({
        where: { tenantId, enabled: true }
      });

      if (!llmConfig || !llmConfig.apiKey) {
        console.warn(`[AIService] AI not configured or disabled for tenant ${tenantId}`);
        return;
      }

      // 2. Fetch Context (Last 20 messages)
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            take: 20,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!conversation) throw new Error("Conversation not found");

      // Sort messages chronologically for the AI
      const history = conversation.messages.reverse();
      
      // 3. Construct Prompt
      const historyText = history.map(m => {
        const role = m.from === 'me' ? 'Atendente' : 'Cliente';
        return `${role}: ${m.content}`;
      }).join('\n');

      const systemPrompt = llmConfig.systemPrompt || "Você é um assistente de suporte útil e educado. Responda de forma concisa.";
      
      const fullPrompt = `${systemPrompt}\n\nHistórico da conversa:\n${historyText}\n\nSugira uma resposta para o Atendente enviar agora:`;

      // 4. Call Gemini API
      // Using gemini-3-flash-preview as recommended for text tasks in SDK guidelines
      // or falling back to user configured model if compatible
      const modelName = llmConfig.model && llmConfig.model.includes('gemini') 
        ? llmConfig.model 
        : 'gemini-3-flash-preview';

      const ai = new GoogleGenAI({ apiKey: llmConfig.apiKey });
      
      const response = await ai.models.generateContent({
        model: modelName,
        contents: fullPrompt,
        config: {
          temperature: 0.7,
          maxOutputTokens: 500,
        }
      });

      const suggestionText = response.text;

      if (!suggestionText) throw new Error("Empty response from AI");

      // 5. Save Suggestion to DB
      await prisma.aISuggestion.create({
        data: {
          tenantId,
          conversationId,
          provider: 'google',
          model: modelName,
          inputSummary: `Last ${history.length} messages`,
          suggestion: suggestionText.trim()
        }
      });

      console.log(`[AIService] Suggestion generated for conversation ${conversationId}`);

    } catch (error) {
      console.error("[AIService] Error generating suggestion:", error);
      throw error;
    }
  }
}
