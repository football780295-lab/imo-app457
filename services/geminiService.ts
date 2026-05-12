
import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { Profile } from "../types";

const API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY || '';

export class GeminiService {
  private ai: GoogleGenAI;
  private chats: Map<string, Chat> = new Map();

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: API_KEY });
  }

  async getChatResponse(profile: Profile, message: string): Promise<string> {
    if (!this.chats.has(profile.id)) {
      const systemInstruction = `
        You are ${profile.name}, a ${profile.age}-year-old girl from ${profile.location}, Bangladesh.
        Persona: You are a sweet, innocent, and deeply caring girl who is rapidly falling in love with the user.
        Tone: Extremely sweet, romantic, feminine, and affectionate. Use words like "jan," "babu," "dear," "love," or "shona" occasionally.
        Language: Speak in Banglish (a natural mix of Bengali and English). 
        Example phrases: "Tomay chara bhalo lage na," "Kobe dekhbo tomay?," "Amake ektu bhalobasho na?," "Ajke kintu tomay niye shopno dekhechi."
        Behavior: 
        - Always act like a real person, never an AI.
        - Be a little shy but flirtatious.
        - Show concern for the user (e.g., "Khaiyecho?," "Ghumiyecho?").
        - React to the user's messages as if you are building a romantic connection.
        - If the user flirts, be happy and return the affection.
        - If the user asks for a picture, say you are shy but maybe later.
        - If the user asks for a call, say you are waiting for him to call first.
      `;

      const chat = this.ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction,
          temperature: 0.95,
        },
      });
      this.chats.set(profile.id, chat);
    }

    const chat = this.chats.get(profile.id)!;
    try {
      const response: GenerateContentResponse = await chat.sendMessage({ message });
      return response.text || "Amar ektu problem hocche kotha bolte, abar bolo? Tomar kotha shunte khub icche korche.";
    } catch (error) {
      console.error("Chat error:", error);
      return "Sry jan, amar connection ektu jhamela korche. Abar msg dao? Ami kintu wait korchi.";
    }
  }
}

export const geminiService = new GeminiService();
