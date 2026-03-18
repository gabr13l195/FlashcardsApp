import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { GeminiService } from '../../services/gemini.service';
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
  duplicateWordError = false;
  isSubmitting = false;
  isTranslating = false;
  isGenerating = false;

  constructor(
    private fb: FormBuilder,
    private supabaseService: SupabaseService,
    private geminiService: GeminiService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.cardForm = this.fb.group({
      word: ['', [Validators.required, Validators.minLength(1)]],
      definition: ['', [Validators.required, Validators.minLength(1)]]
    });
  }

  onWordInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;
    if (value.length > 0) {
      // Capitalize first letter, keep the rest as is
      value = value.charAt(0).toUpperCase() + value.slice(1);
      this.cardForm.get('word')?.setValue(value, { emitEvent: false });
    }
  }

  async onWordBlur(): Promise<void> {
    const wordCtrl = this.cardForm.get('word');
    const defCtrl = this.cardForm.get('definition');
    if (!wordCtrl || !defCtrl) return;

    const word = wordCtrl.value?.trim();
    const definition = defCtrl.value?.trim();

    if (word && !definition && !this.isTranslating && !this.isEditMode) {
      this.isTranslating = true;
      try {
        const translation = await this.geminiService.translateWord(word);
        if (translation) {
           this.cardForm.patchValue({ definition: translation });
        }
      } catch (e) {
        console.error('Error traduciendo con Gemini:', e);
      } finally {
        this.isTranslating = false;
      }
    }
  }

  async generateDetails(): Promise<void> {
    const word = this.cardForm.get('word')?.value?.trim();
    const currentDef = this.cardForm.get('definition')?.value?.trim();

    if (!word) return;

    this.isGenerating = true;
    try {
      // Extraemos la traducción principal de la actual definición (primera parte)
      const primaryTranslation = currentDef ? currentDef.split('\n')[0].split('/')[0].trim() : '';

      const details = await this.geminiService.generateDetails(word, primaryTranslation);
      
      let newDef = currentDef ? currentDef.split('\n')[0] : '';
      if (primaryTranslation) {
        // Solo agregar el segundo significado si no estaba ya presente
        if (!newDef.includes('/') && details.secondaryMeaning) {
          newDef = `${primaryTranslation} / ${details.secondaryMeaning}`;
        }
      } else {
        newDef = details.secondaryMeaning;
      }

      newDef += `\n\nEjemplo:\n${details.sentence}`;

      this.cardForm.patchValue({ definition: newDef });
    } catch (e: any) {
      console.error('Error generando detalles:', e);
      let errMsg = 'Error de API. ';
      if (e?.status === 429 || e?.message?.includes('429')) {
        errMsg += 'Has excedido la cuota gratuita de tu API Key (Demasiadas peticiones).';
      } else if (e?.status === 400 || e?.message?.includes('400')) {
        errMsg += 'La API Key sigue siendo inválida. Intenta recargar la página por completo (Ctrl+F5).';
      } else {
        errMsg += e.message || 'Error desconocido';
      }
      alert(errMsg);
    } finally {
      this.isGenerating = false;
    }
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
      
      // Combinar meanings y sentence en un solo texto interactivamente editable
      let definitionText = card.meanings ? card.meanings.join('\n') : '';
      if (card.sentence) {
        definitionText += definitionText ? `\n\nEjemplo:\n${card.sentence}` : `Ejemplo:\n${card.sentence}`;
      }

      this.cardForm.patchValue({
        word: card.word,
        definition: definitionText
      });
    }
  }

  async onSubmit(): Promise<void> {
    if (this.cardForm.invalid || !this.deckId) return;

    this.duplicateWordError = false;
    this.isSubmitting = true;

    const formValue = this.cardForm.value;
    const wordToCheck = formValue.word.trim();

    try {
      // Validar palabra duplicada
      const isDuplicate = await this.supabaseService.isWordUsedInDeck(
        this.deckId, 
        wordToCheck, 
        this.isEditMode ? this.cardId : undefined
      );

      if (isDuplicate) {
        this.duplicateWordError = true;
        this.isSubmitting = false;
        return;
      }

      // Parse the definition text area to meet the required structure
      let meaningsToSave: string[] = [];
      let sentenceToSave: string | null = null;
      
      const lines = formValue.definition.split('\n').map((l: string) => l.trim()).filter((l: string) => l);
      if (lines.length > 0) {
        meaningsToSave = lines[0].split('/').map((m: string) => m.trim());
        if (lines.length > 1) {
          let sentenceLines = lines.slice(1).join('\n');
          sentenceLines = sentenceLines.replace(/^Ejemplo:\s*/i, '').replace(/^Ej:\s*/i, '').trim();
          sentenceToSave = sentenceLines;
        }
      } else {
        // Fallback
        meaningsToSave = [formValue.definition];
      }

      if (this.isEditMode && this.cardId) {
        await this.supabaseService.updateCard(this.cardId, {
          word: wordToCheck,
          meanings: meaningsToSave,
          sentence: sentenceToSave ?? undefined
        });
        this.router.navigate(['/decks', this.deckId, 'cards']);
      } else {
        await this.supabaseService.createCard({
          deckId: this.deckId,
          word: wordToCheck,
          meanings: meaningsToSave,
          sentence: sentenceToSave ?? undefined
        });
        this.cardsAdded++;
        this.showSuccess = true;
        
        // Reset form to default state
        this.cardForm.reset();
        
        this.cardForm.markAsPristine();
        this.cardForm.markAsUntouched();

        // Auto-hide success toast after 2 seconds
        setTimeout(() => {
          this.showSuccess = false;
        }, 2000);
      }
    } catch (error) {
      console.error('Error al guardar carta:', error);
    } finally {
      this.isSubmitting = false;
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
