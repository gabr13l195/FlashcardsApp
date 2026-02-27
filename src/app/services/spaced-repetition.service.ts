import { Injectable } from '@angular/core';
import { Flashcard, ReviewResponse } from '../models/flashcard.model';

/**
 * Servicio que implementa el algoritmo SM-2 (SuperMemo 2)
 * para repetición espaciada de flashcards
 */
@Injectable({
  providedIn: 'root'
})
export class SpacedRepetitionService {
  // Intervalos mínimos en días según la respuesta
  private readonly MIN_INTERVALS: Record<ReviewResponse, number> = {
    again: 0, // Repetir inmediatamente
    hard: 0.5, // Medio día
    good: 1, // 1 día
    easy: 4 // 4 días
  };

  /**
   * Procesa una respuesta del usuario y actualiza los datos de la flashcard
   */
  processReview(card: Flashcard, response: ReviewResponse): Flashcard {
    const updatedCard = { ...card };
    const now = new Date();

    switch (response) {
      case 'again':
        // Resetear completamente
        updatedCard.easeFactor = Math.max(1.3, card.easeFactor - 0.2);
        updatedCard.interval = 0;
        updatedCard.repetitions = 0;
        updatedCard.nextReviewDate = now; // Disponible inmediatamente
        break;

      case 'hard':
        // Disminuir facilidad ligeramente
        updatedCard.easeFactor = Math.max(1.3, card.easeFactor - 0.15);
        updatedCard.interval = this.calculateInterval(updatedCard, 'hard');
        updatedCard.repetitions = Math.max(0, card.repetitions - 1);
        updatedCard.nextReviewDate = this.addDays(now, updatedCard.interval);
        break;

      case 'good':
        // Comportamiento estándar
        updatedCard.interval = this.calculateInterval(updatedCard, 'good');
        updatedCard.repetitions = card.repetitions + 1;
        updatedCard.nextReviewDate = this.addDays(now, updatedCard.interval);
        break;

      case 'easy':
        // Aumentar facilidad
        updatedCard.easeFactor = Math.min(2.5, card.easeFactor + 0.15);
        updatedCard.interval = this.calculateInterval(updatedCard, 'easy');
        updatedCard.repetitions = card.repetitions + 1;
        updatedCard.nextReviewDate = this.addDays(now, updatedCard.interval);
        break;
    }

    updatedCard.lastReviewDate = now;
    updatedCard.updatedAt = now;

    return updatedCard;
  }

  /**
   * Calcula el intervalo hasta la próxima repetición
   */
  private calculateInterval(card: Flashcard, response: ReviewResponse): number {
    if (card.repetitions === 0) {
      // Primera repetición
      return this.MIN_INTERVALS[response];
    }

    if (card.repetitions === 1) {
      // Segunda repetición
      return Math.max(1, this.MIN_INTERVALS[response]);
    }

    // Repeticiones subsecuentes: intervalo anterior * factor de facilidad
    const baseInterval = card.interval * card.easeFactor;
    
    // Ajustar según la respuesta
    let multiplier = 1;
    if (response === 'easy') {
      multiplier = 1.3;
    } else if (response === 'hard') {
      multiplier = 0.8;
    }

    return Math.max(this.MIN_INTERVALS[response], baseInterval * multiplier);
  }

  /**
   * Agrega días a una fecha
   */
  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Obtiene el porcentaje de dominio estimado de una carta
   */
  getMasteryPercentage(card: Flashcard): number {
    if (card.repetitions === 0) return 0;
    
    // Basado en el factor de facilidad y número de repeticiones
    const easeScore = (card.easeFactor - 1.3) / (2.5 - 1.3); // Normalizar entre 0 y 1
    const repScore = Math.min(1, card.repetitions / 5); // Máximo en 5 repeticiones
    
    return Math.round((easeScore * 0.6 + repScore * 0.4) * 100);
  }
}
