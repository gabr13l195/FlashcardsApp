export interface Flashcard {
  id: string;
  front: string; // Palabra en inglés
  back: string; // Traducción o significado
  deckId: string;
  createdAt: Date;
  updatedAt: Date;
  // Datos para repetición espaciada (algoritmo SM-2)
  easeFactor: number; // Factor de facilidad (default: 2.5)
  interval: number; // Intervalo en días hasta la próxima repetición
  repetitions: number; // Número de repeticiones exitosas consecutivas
  nextReviewDate: Date; // Fecha de la próxima repetición
  lastReviewDate?: Date; // Fecha de la última repetición
}

export type ReviewResponse = 'again' | 'hard' | 'good' | 'easy';

export const ReviewResponseLabels: Record<ReviewResponse, string> = {
  again: 'No sé',
  hard: 'Recuerdo medio',
  good: 'Bien',
  easy: 'Aprendida'
};
