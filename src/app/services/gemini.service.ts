import { Injectable } from '@angular/core';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private _genAI: GoogleGenerativeAI;
  private readonly API_KEY = 'AIzaSyDIJuUGAYiq1JBqt2mtZoBCB07JFkD0ZEE';

  constructor() {
    this._genAI = new GoogleGenerativeAI(this.API_KEY);
  }

  async translateWord(word: string): Promise<string> {
    try {
      const model = this._genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `Traduce la palabra o frase en inglés "${word}" al español de la forma más natural y usada comúnmente en conversaciones. 
Responde ÚNICAMENTE con la traducción en español, sin comillas, signos de puntuación extra, sin pronunciación ni explicaciones de ningún tipo. Solo el texto en español.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      return text;
    } catch (e) {
      console.error('Generative AI Error:', e);
      throw e;
    }
  }

  async generateDetails(word: string, primaryTranslation: string): Promise<{ secondaryMeaning: string; sentence: string }> {
    try {
      const model = this._genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `Actúa como un profesor nativo de inglés.

Considera la palabra/frase en inglés: "${word}".
Su significado principal en español es "${primaryTranslation}".

Proporciona EXACTAMENTE un objeto JSON válido, sin comillas invertidas de markdown y sin ningún otro texto explicativo, con las siguientes propiedades:
1. "secondaryMeaning": Un segundo significado, uso común, sinónimo o acepción popular que tenga en español (diferente al principal), que sea muy conciso. (Máximo 2-4 palabras).
2. "sentence": Una oración completa que muestre cómo usar esa palabra en inglés, adecuada para nivel B1 (intermedio), con contexto natural y claro.

Formato requerido estricto:
{"secondaryMeaning": "...", "sentence": "..."}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      
      // Attempt to clean markdown if present (e.g., ```json ... ```)
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = text.substring(jsonStart, jsonEnd);
        return JSON.parse(jsonStr) as { secondaryMeaning: string; sentence: string };
      }

      throw new Error('Formato JSON no válido devuelto por Gemini.');
    } catch (e) {
      console.error('Generative AI Error:', e);
      throw e;
    }
  }
}
