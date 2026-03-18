export interface Flashcard {
  id: string;
  word: string; // Palabra en inglés
  meanings: string[]; // Traducciones o significados
  sentence?: string; // Oración de ejemplo opcional
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

// Respuesta del usuario durante el repaso (Algoritmo SM-2 modificado)
export type ReviewResponse = 'again' | 'hard' | 'good' | 'easy';

export const ReviewResponseLabels: Record<ReviewResponse, string> = {
  again: 'De nuevo',
  hard: 'Difícil',
  good: 'Bien',
  easy: 'Fácil'
};
