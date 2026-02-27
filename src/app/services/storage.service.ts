import { Injectable } from '@angular/core';
import { Deck } from '../models/deck.model';
import { Flashcard } from '../models/flashcard.model';

const DECKS_STORAGE_KEY = 'flashcard_app_decks';
const CARDS_STORAGE_KEY = 'flashcard_app_cards';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private decks: Deck[] = [];
  private cards: Flashcard[] = [];

  constructor() {
    this.loadData();
  }

  // Cargar datos desde localStorage
  private loadData(): void {
    const decksJson = localStorage.getItem(DECKS_STORAGE_KEY);
    const cardsJson = localStorage.getItem(CARDS_STORAGE_KEY);

    this.decks = decksJson ? JSON.parse(decksJson).map((d: any) => ({
      ...d,
      createdAt: new Date(d.createdAt),
      updatedAt: new Date(d.updatedAt)
    })) : [];

    this.cards = cardsJson ? JSON.parse(cardsJson).map((c: any) => ({
      ...c,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
      nextReviewDate: new Date(c.nextReviewDate),
      lastReviewDate: c.lastReviewDate ? new Date(c.lastReviewDate) : undefined
    })) : [];
  }

  // Guardar datos en localStorage
  private saveData(): void {
    localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(this.decks));
    localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(this.cards));
  }

  // Operaciones con Decks
  getDecks(): Deck[] {
    return [...this.decks];
  }

  getDeck(id: string): Deck | undefined {
    return this.decks.find(d => d.id === id);
  }

  createDeck(deck: Omit<Deck, 'id' | 'createdAt' | 'updatedAt' | 'cardIds'>): Deck {
    const newDeck: Deck = {
      ...deck,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      cardIds: []
    };
    this.decks.push(newDeck);
    this.saveData();
    return newDeck;
  }

  updateDeck(id: string, updates: Partial<Deck>): Deck | null {
    const index = this.decks.findIndex(d => d.id === id);
    if (index === -1) return null;

    this.decks[index] = {
      ...this.decks[index],
      ...updates,
      updatedAt: new Date()
    };
    this.saveData();
    return this.decks[index];
  }

  deleteDeck(id: string): boolean {
    const index = this.decks.findIndex(d => d.id === id);
    if (index === -1) return false;

    // Eliminar todas las cartas del mazo
    const deck = this.decks[index];
    deck.cardIds.forEach(cardId => {
      this.deleteCard(cardId);
    });

    this.decks.splice(index, 1);
    this.saveData();
    return true;
  }

  // Operaciones con Flashcards
  getCards(deckId?: string): Flashcard[] {
    if (deckId) {
      return this.cards.filter(c => c.deckId === deckId);
    }
    return [...this.cards];
  }

  getCard(id: string): Flashcard | undefined {
    return this.cards.find(c => c.id === id);
  }

  createCard(card: Omit<Flashcard, 'id' | 'createdAt' | 'updatedAt' | 'easeFactor' | 'interval' | 'repetitions' | 'nextReviewDate'>): Flashcard {
    const newCard: Flashcard = {
      ...card,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      nextReviewDate: new Date() // Disponible inmediatamente
    };

    this.cards.push(newCard);

    // Agregar la carta al mazo
    const deck = this.decks.find(d => d.id === card.deckId);
    if (deck) {
      deck.cardIds.push(newCard.id);
      deck.updatedAt = new Date();
    }

    this.saveData();
    return newCard;
  }

  updateCard(id: string, updates: Partial<Flashcard>): Flashcard | null {
    const index = this.cards.findIndex(c => c.id === id);
    if (index === -1) return null;

    this.cards[index] = {
      ...this.cards[index],
      ...updates,
      updatedAt: new Date()
    };
    this.saveData();
    return this.cards[index];
  }

  deleteCard(id: string): boolean {
    const index = this.cards.findIndex(c => c.id === id);
    if (index === -1) return false;

    const card = this.cards[index];

    // Remover la carta del mazo
    const deck = this.decks.find(d => d.id === card.deckId);
    if (deck) {
      deck.cardIds = deck.cardIds.filter(cardId => cardId !== id);
      deck.updatedAt = new Date();
    }

    this.cards.splice(index, 1);
    this.saveData();
    return true;
  }

  // Obtener cartas listas para repaso
  getCardsDueForReview(deckId?: string): Flashcard[] {
    const now = new Date();
    let cards = deckId ? this.getCards(deckId) : this.getCards();
    
    return cards.filter(card => {
      return card.nextReviewDate <= now;
    });
  }

  // Generar ID único
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
