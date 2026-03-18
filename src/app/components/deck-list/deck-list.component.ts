import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { Deck } from '../../models/deck.model';
import { Flashcard } from '../../models/flashcard.model';
import { SpacedRepetitionService } from '../../services/spaced-repetition.service';

@Component({
  selector: 'app-deck-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './deck-list.component.html',
  styleUrl: './deck-list.component.css'
})
export class DeckListComponent implements OnInit {
  decks: Deck[] = [];
  cardsByDeck: Map<string, Flashcard[]> = new Map();
  cardsDueByDeck: Map<string, number> = new Map();
  isLoading = true;

  constructor(
    private supabaseService: SupabaseService,
    private spacedRepetitionService: SpacedRepetitionService
  ) { }

  ngOnInit(): void {
    void this.loadDecks();
  }

  async loadDecks(): Promise<void> {
    this.isLoading = true;
    try {
      this.decks = await this.supabaseService.getDecks();
      this.cardsByDeck.clear();
      this.cardsDueByDeck.clear();

      await Promise.all(
        this.decks.map(async (deck) => {
          const [cards, dueCards] = await Promise.all([
            this.supabaseService.getCards(deck.id),
            this.supabaseService.getCardsDueForReview(deck.id)
          ]);
          this.cardsByDeck.set(deck.id, cards);
          this.cardsDueByDeck.set(deck.id, dueCards.length);
        })
      );
    } catch (error) {
      console.error('Error cargando mazos desde Supabase', error);
    } finally {
      this.isLoading = false;
    }
  }

  deleteDeck(deckId: string, event: Event): void {
    event.stopPropagation();
    if (confirm('¿Estás seguro de que quieres eliminar este mazo? Se eliminarán todas las cartas.')) {
      void this.supabaseService
        .deleteDeck(deckId)
        .then(() => this.loadDecks())
        .catch((error) => console.error('Error eliminando mazo en Supabase', error));
    }
  }

  getCardCount(deckId: string): number {
    return this.cardsByDeck.get(deckId)?.length || 0;
  }

  getDueCount(deckId: string): number {
    return this.cardsDueByDeck.get(deckId) || 0;
  }

  getDeckProgress(deckId: string): number {
    const cards = this.cardsByDeck.get(deckId) || [];
    if (cards.length === 0) return 0;
    
    const totalProgress = cards.reduce((sum, card) => sum + this.spacedRepetitionService.getMasteryPercentage(card), 0);
    return Math.round(totalProgress / cards.length);
  }
}
