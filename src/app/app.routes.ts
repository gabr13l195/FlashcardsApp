import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/deck-list/deck-list.component').then(m => m.DeckListComponent)
  },
  {
    path: 'decks/new',
    loadComponent: () => import('./components/deck-form/deck-form.component').then(m => m.DeckFormComponent)
  },
  {
    path: 'decks/:id/edit',
    loadComponent: () => import('./components/deck-form/deck-form.component').then(m => m.DeckFormComponent)
  },
  {
    path: 'decks/:id/cards',
    loadComponent: () => import('./components/card-list/card-list.component').then(m => m.CardListComponent)
  },
  {
    path: 'decks/:deckId/cards/new',
    loadComponent: () => import('./components/card-form/card-form.component').then(m => m.CardFormComponent)
  },
  {
    path: 'decks/:deckId/cards/:id/edit',
    loadComponent: () => import('./components/card-form/card-form.component').then(m => m.CardFormComponent)
  },
  {
    path: 'decks/:id/review',
    loadComponent: () => import('./components/review/review.component').then(m => m.ReviewComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
