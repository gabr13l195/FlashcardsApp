import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { Flashcard } from '../../models/flashcard.model';

@Component({
  selector: 'app-card-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './card-form.component.html',
  styleUrl: './card-form.component.css'
})
export class CardFormComponent implements OnInit {
  cardForm: FormGroup;
  isEditMode = false;
  deckId?: string;
  cardId?: string;
  cardsAdded = 0;
  showSuccess = false;

  constructor(
    private fb: FormBuilder,
    private supabaseService: SupabaseService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.cardForm = this.fb.group({
      front: ['', [Validators.required, Validators.minLength(1)]],
      back: ['', [Validators.required, Validators.minLength(1)]]
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.deckId = params['deckId'];

      if (params['id']) {
        this.isEditMode = true;
        this.cardId = params['id'];
        void this.loadCard();
      }
    });
  }

  async loadCard(): Promise<void> {
    if (!this.cardId) return;

    const card = await this.supabaseService.getCard(this.cardId);
    if (card) {
      this.deckId = card.deckId;
      this.cardForm.patchValue({
        front: card.front,
        back: card.back
      });
    }
  }

  async onSubmit(): Promise<void> {
    if (this.cardForm.invalid || !this.deckId) return;

    const formValue = this.cardForm.value;

    if (this.isEditMode && this.cardId) {
      await this.supabaseService.updateCard(this.cardId, {
        front: formValue.front,
        back: formValue.back
      });
      this.router.navigate(['/decks', this.deckId, 'cards']);
    } else {
      await this.supabaseService.createCard({
        ...formValue,
        deckId: this.deckId
      });
      this.cardsAdded++;
      this.showSuccess = true;
      this.cardForm.reset();
      this.cardForm.markAsPristine();
      this.cardForm.markAsUntouched();

      // Auto-hide success toast after 2 seconds
      setTimeout(() => {
        this.showSuccess = false;
      }, 2000);
    }
  }

  cancel(): void {
    if (this.deckId) {
      this.router.navigate(['/decks', this.deckId, 'cards']);
    } else {
      this.router.navigate(['/']);
    }
  }
}
