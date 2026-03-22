import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  
  constructor(private supabaseService: SupabaseService) {}

  async translateWord(word: string): Promise<string> {
    try {
      const { data, error } = await this.supabaseService.client.functions.invoke('gemini-api', {
        body: { action: 'translate', word: word }
      });

      if (error) {
        console.error('Edge Function Error (Translate):', error);
        throw error;
      }

      return data.text;
    } catch (e) {
      console.error('Generative AI Request Error:', e);
      throw e;
    }
  }

  async generateDetails(word: string, primaryTranslation: string): Promise<{ secondaryMeaning: string; sentence: string }> {
    try {
      const { data, error } = await this.supabaseService.client.functions.invoke('gemini-api', {
        body: { action: 'details', word: word, primaryTranslation: primaryTranslation }
      });

      if (error) {
        console.error('Edge Function Error (Details):', error);
        throw error;
      }

      return {
        secondaryMeaning: data.secondaryMeaning,
        sentence: data.sentence
      };
    } catch (e) {
      console.error('Generative AI Request Error:', e);
      throw e;
    }
  }
}
