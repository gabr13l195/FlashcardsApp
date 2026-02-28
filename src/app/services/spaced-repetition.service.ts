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

    if (response === 'more') {
      // El usuario siente que necesita más práctica: mantener intervalo diario
      // y reiniciar el contador de repeticiones.
      updatedCard.repetitions = 0;
      updatedCard.interval = 1;
      updatedCard.easeFactor = Math.max(1.3, card.easeFactor - 0.1);
    } else {
      // "Me la sé": aumentar ligeramente la facilidad e intervalo.
      let nextInterval: number;

      if (card.repetitions === 0) {
        // Primera vez que se marca "Me la sé": repasar mañana
        nextInterval = 1;
      } else if (card.repetitions === 1) {
        // Segunda vez: espaciar un poco más
        nextInterval = 3;
      } else {
        // A partir de ahí, duplicar suavemente hasta un máximo razonable
        nextInterval = Math.min(30, Math.round(card.interval * 2));
      }

      updatedCard.repetitions = card.repetitions + 1;
      updatedCard.interval = Math.max(1, nextInterval);
      updatedCard.easeFactor = Math.min(2.5, card.easeFactor + 0.05);
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
    if (card.repetitions === 0) return 0;

    const easeScore = (card.easeFactor - 1.3) / (2.5 - 1.3);
    const repScore = Math.min(1, card.repetitions / 5);

    return Math.round((easeScore * 0.6 + repScore * 0.4) * 100);
  }
}
