import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { SpacedRepetitionService } from '../../services/spaced-repetition.service';
import { Flashcard, ReviewResponse, ReviewResponseLabels } from '../../models/flashcard.model';
import { Deck } from '../../models/deck.model';

@Component({
  selector: 'app-review',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './review.component.html',
  styleUrl: './review.component.css'
})
export class ReviewComponent implements OnInit {
  deckId?: string;
  deck?: Deck;
  cards: Flashcard[] = [];
  currentCardIndex = 0;
  currentCard?: Flashcard;
  showBack = false;
  isTransitioning = false;
  isFlipping = false;
  reviewComplete = false;
  cardsReviewed = 0;
  cardsTotal = 0;

  ReviewResponseLabels = ReviewResponseLabels;

  constructor(
    private supabaseService: SupabaseService,
    private spacedRepetitionService: SpacedRepetitionService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

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
    this.deck = (await this.supabaseService.getDeck(this.deckId)) ?? undefined;
  }

  async loadCards(): Promise<void> {
    if (!this.deckId) return;

    // Obtener cartas pendientes de repaso
    const dueCards = await this.supabaseService.getCardsDueForReview(this.deckId);

    // Si no hay cartas pendientes, mostrar todas las cartas
    let loadedCards = [...(dueCards.length > 0
      ? dueCards
      : await this.supabaseService.getCards(this.deckId))];

    // Mezclar aleatoriamente las cartas (Fisher-Yates shuffle)
    for (let i = loadedCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [loadedCards[i], loadedCards[j]] = [loadedCards[j], loadedCards[i]];
    }

    this.cards = loadedCards;
    this.cardsTotal = this.cards.length;

    if (this.cards.length > 0) {
      this.currentCard = this.cards[0];
    } else {
      this.reviewComplete = true;
    }
  }

  flipCard(): void {
    if (this.isFlipping) return;

    this.isFlipping = true;
    this.showBack = !this.showBack;

    setTimeout(() => {
      this.isFlipping = false;
    }, 300);
  }

  async handleResponse(response: ReviewResponse): Promise<void> {
    if (!this.currentCard) return;

    // Procesar la respuesta con el algoritmo de repetición espaciada
    const updatedCard = this.spacedRepetitionService.processReview(this.currentCard, response);

    // Guardar la carta actualizada
    await this.supabaseService.updateCard(this.currentCard.id, updatedCard);

    if (response === 'more') {
      // Reinsertar la carta en una posición aleatoria entre las cartas restantes
      // o al final si es la última.
      const remainingCount = this.cards.length - this.currentCardIndex - 1;
      const insertIndex = this.currentCardIndex + 1 + Math.floor(Math.random() * (remainingCount + 1));
      this.cards.splice(insertIndex, 0, updatedCard);
    } else {
      this.cardsReviewed++;
    }

    // Avanzar a la siguiente carta
    this.currentCardIndex++;

    if (this.currentCardIndex < this.cards.length) {
      // Initiate smooth transition out
      this.isTransitioning = true;
      this.showBack = false;

      // Wait 150ms for UI to slide out, then swap card data
      setTimeout(() => {
        this.currentCard = this.cards[this.currentCardIndex];

        // Wait a tiny bit for DOM refresh then slide back in
        setTimeout(() => {
          this.isTransitioning = false;
        }, 30);
      }, 150);
    } else {
      // Repaso completado
      this.reviewComplete = true;
      this.currentCard = undefined;
    }
  }

  finishReview(): void {
    if (this.deckId) {
      this.router.navigate(['/decks', this.deckId, 'cards']);
    } else {
      this.router.navigate(['/']);
    }
  }

  restartReview(): void {
    this.currentCardIndex = 0;
    this.showBack = false;
    this.reviewComplete = false;
    this.cardsReviewed = 0;
    void this.loadCards();
  }

  getProgress(): number {
    if (this.cardsTotal === 0) return 0;
    return Math.round((this.cardsReviewed / this.cardsTotal) * 100);
  }
}
