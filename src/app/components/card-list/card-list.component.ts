import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { Flashcard } from '../../models/flashcard.model';
import { Deck } from '../../models/deck.model';
import { SpacedRepetitionService } from '../../services/spaced-repetition.service';

@Component({
  selector: 'app-card-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './card-list.component.html',
  styleUrl: './card-list.component.css'
})
export class CardListComponent implements OnInit {
  deckId?: string;
  deck?: Deck;
  cards: Flashcard[] = [];
  showBack = false;
  selectedCard?: Flashcard;

  constructor(
    private supabaseService: SupabaseService,
    private spacedRepetitionService: SpacedRepetitionService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.deckId = params['id'];
      if (this.deckId) {
        void this.loadDeck();
        void this.loadCards();
      }
    });
  }

  async loadDeck(): Promise<void> {
    if (!this.deckId) return;
    this.deck = await this.supabaseService.getDeck(this.deckId) ?? undefined;
  }

  async loadCards(): Promise<void> {
    if (!this.deckId) return;
    this.cards = await this.supabaseService.getCards(this.deckId);
  }

  async deleteCard(cardId: string): Promise<void> {
    if (confirm('¿Estás seguro de que quieres eliminar esta carta?')) {
      await this.supabaseService.deleteCard(cardId);
      await this.loadCards();
    }
  }

  getMasteryPercentage(card: Flashcard): number {
    return this.spacedRepetitionService.getMasteryPercentage(card);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}
