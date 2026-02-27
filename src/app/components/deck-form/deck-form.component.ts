import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { Deck } from '../../models/deck.model';

@Component({
  selector: 'app-deck-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './deck-form.component.html',
  styleUrl: './deck-form.component.css'
})
export class DeckFormComponent implements OnInit {
  deckForm: FormGroup;
  isEditMode = false;
  deckId?: string;

  constructor(
    private fb: FormBuilder,
    private supabaseService: SupabaseService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.deckForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1)]],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.isEditMode = true;
        this.deckId = params['id'];
        void this.loadDeck();
      }
    });
  }

  async loadDeck(): Promise<void> {
    if (!this.deckId) return;
    
    const deck = await this.supabaseService.getDeck(this.deckId);
    if (deck) {
      this.deckForm.patchValue({
        name: deck.name,
        description: deck.description || ''
      });
    }
  }

  async onSubmit(): Promise<void> {
    if (this.deckForm.invalid) return;

    const formValue = this.deckForm.value;

    if (this.isEditMode && this.deckId) {
      await this.supabaseService.updateDeck(this.deckId, {
        name: formValue.name,
        description: formValue.description
      });
    } else {
      await this.supabaseService.createDeck({
        name: formValue.name,
        description: formValue.description
      });
    }

    this.router.navigate(['/']);
  }

  cancel(): void {
    this.router.navigate(['/']);
  }
}
