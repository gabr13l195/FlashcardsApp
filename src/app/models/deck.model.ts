import { Flashcard } from './flashcard.model';

export interface Deck {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  cardIds: string[]; // IDs de las flashcards en este mazo
}

export interface DeckWithCards extends Deck {
  cards: Flashcard[];
}
