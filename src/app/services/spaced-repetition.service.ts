import { Injectable } from '@angular/core';
import { Flashcard, ReviewResponse } from '../models/flashcard.model';

@Injectable({
  providedIn: 'root'
})
export class SpacedRepetitionService {
  /**
   * Procesa una respuesta del usuario y actualiza los datos de la flashcard.
   *
   * Reglas:
   * - Siempre se programa el próximo repaso en al menos 24 horas.
   * - "Necesito repasar más" => intervalo corto y se reducen repeticiones/facilidad.
   * - "Me la sé" => se incrementan repeticiones y el intervalo crece de forma suave.
   */
  processReview(card: Flashcard, response: ReviewResponse): Flashcard {
    const updatedCard: Flashcard = { ...card };
    const now = new Date();

    if (response === 'again') {
      updatedCard.repetitions = 0;
      updatedCard.interval = 1;
      updatedCard.easeFactor = Math.max(1.3, card.easeFactor - 0.2);
    } else {
      let nextInterval: number;
      
      // Si es su primera vez acertándola, empezamos con 1 día para repasar mañana, a menos que sea fácil
      if (card.repetitions === 0) {
        nextInterval = response === 'easy' ? 4 : 1;
      } else {
        // Fórmulas solicitadas por el usuario:
        switch(response) {
          case 'hard':
            nextInterval = card.interval * 1.2;
            updatedCard.easeFactor = Math.max(1.3, card.easeFactor - 0.15);
            break;
          case 'good':
            nextInterval = card.interval * card.easeFactor;
            // easeFactor se mantiene igual para 'good' generalmente
            break;
          case 'easy':
            nextInterval = card.interval * (card.easeFactor + 0.3);
            updatedCard.easeFactor = card.easeFactor + 0.15;
            break;
        }
      }

      updatedCard.repetitions = card.repetitions + 1;
      updatedCard.interval = Math.max(1, Math.round(nextInterval!));
    }

    updatedCard.nextReviewDate = this.addDays(now, updatedCard.interval);
    updatedCard.lastReviewDate = now;
    updatedCard.updatedAt = now;

    return updatedCard;
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  getMasteryPercentage(card: Flashcard): number {
    if (card.interval === 0 && card.repetitions === 0) return 0; // Nueva carta
    if (card.repetitions === 0) return 25; // "De nuevo" (falló recientemente)
    
    if (card.repetitions === 1) {
      if (card.interval >= 4) return 100; // "Fácil" en el primer intento
      return 50; // "Difícil" o "Bien" en el primer intento
    }
    
    if (card.repetitions === 2) {
      if (card.interval >= 7) return 100; // "Fácil" incrementa rápido el intervalo
      return 75; // "Bien" típicamente llega acá
    }
    
    return 100; // 3 o más repeticiones exitosas se considera "Fácil"/Dominada
  }
}
