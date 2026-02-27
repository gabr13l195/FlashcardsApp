import { Injectable } from '@angular/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Deck } from '../models/deck.model';
import { Flashcard } from '../models/flashcard.model';

/**
 * Servicio central para comunicarse con Supabase.
 * Encapsula todas las operaciones de lectura/escritura de mazos y cartas.
 */
@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  /**
   * 1) DÓNDE PONER TU SUPABASE URL Y ANON KEY
   *
   * - Ve al panel de Supabase:
   *   Settings → API → Project URL  => SUPABASE_URL
   *   Settings → API → anon public  => SUPABASE_ANON_KEY
   *
   * - Sustituye los textos 'TU_SUPABASE_URL' y 'TU_SUPABASE_ANON_KEY'
   *   por los valores reales DE TU PROYECTO (sin comillas adicionales).
   *
   * - IMPORTANTE: no publiques estas claves en un repo público.
   *   Si el proyecto va a ser público, usa variables de entorno/build.
   */

  private readonly supabaseUrl = 'https://zgnzujntjxdachqwvcth.supabase.co'; // <-- REEMPLAZA ESTO
  private readonly supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpnbnp1am50anhkYWNocXd2Y3RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMzk3MjMsImV4cCI6MjA4NDYxNTcyM30.PEXcmk2HJVue7CQUhHL01n46IUJeu7Vto0GyAv2vvQo'; // <-- REEMPLAZA ESTO

  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(this.supabaseUrl, this.supabaseAnonKey);
  }

  // ---------- Mapeos helper ----------

  private mapDeckRow(row: any): Deck {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      // En Supabase no guardamos cardIds; cuando lo necesites se pueden
      // calcular con una consulta aparte.
      cardIds: []
    };
  }

  private mapCardRow(row: any): Flashcard {
    return {
      id: row.id,
      deckId: row.deck_id,
      front: row.front,
      back: row.back,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      easeFactor: Number(row.ease_factor),
      interval: Number(row.interval),
      repetitions: Number(row.repetitions),
      nextReviewDate: new Date(row.next_review_date),
      lastReviewDate: row.last_review_date ? new Date(row.last_review_date) : undefined
    };
  }

  // ---------- Decks ----------

  async getDecks(): Promise<Deck[]> {
    const { data, error } = await this.supabase
      .from('decks')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error al obtener mazos desde Supabase', error);
      throw error;
    }

    return (data ?? []).map((row) => this.mapDeckRow(row));
  }

  async getDeck(id: string): Promise<Deck | null> {
    const { data, error } = await this.supabase
      .from('decks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No encontrado
        return null;
      }
      console.error('Error al obtener mazo desde Supabase', error);
      throw error;
    }

    return data ? this.mapDeckRow(data) : null;
  }

  async createDeck(input: { name: string; description?: string }): Promise<Deck> {
    const nowIso = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('decks')
      .insert({
        name: input.name,
        description: input.description ?? null,
        created_at: nowIso,
        updated_at: nowIso
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error al crear mazo en Supabase', error);
      throw error;
    }

    return this.mapDeckRow(data);
  }

  async updateDeck(
    id: string,
    updates: Partial<{ name: string; description?: string }>
  ): Promise<Deck | null> {
    const nowIso = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('decks')
      .update({
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.description !== undefined ? { description: updates.description } : {}),
        updated_at: nowIso
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No encontrado
        return null;
      }
      console.error('Error al actualizar mazo en Supabase', error);
      throw error;
    }

    return data ? this.mapDeckRow(data) : null;
  }

  async deleteDeck(id: string): Promise<boolean> {
    const { error } = await this.supabase.from('decks').delete().eq('id', id);

    if (error) {
      console.error('Error al eliminar mazo en Supabase', error);
      throw error;
    }

    // Gracias a ON DELETE CASCADE, las cartas se borran automáticamente.
    return true;
  }

  // ---------- Cartas ----------

  async getCards(deckId?: string): Promise<Flashcard[]> {
    let query = this.supabase.from('cards').select('*').order('created_at', { ascending: true });

    if (deckId) {
      query = query.eq('deck_id', deckId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener cartas desde Supabase', error);
      throw error;
    }

    return (data ?? []).map((row) => this.mapCardRow(row));
  }

  async getCard(id: string): Promise<Flashcard | null> {
    const { data, error } = await this.supabase
      .from('cards')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error al obtener carta desde Supabase', error);
      throw error;
    }

    return data ? this.mapCardRow(data) : null;
  }

  async createCard(input: {
    deckId: string;
    front: string;
    back: string;
  }): Promise<Flashcard> {
    const now = new Date();
    const nowIso = now.toISOString();

    const { data, error } = await this.supabase
      .from('cards')
      .insert({
        deck_id: input.deckId,
        front: input.front,
        back: input.back,
        ease_factor: 2.5,
        interval: 0,
        repetitions: 0,
        next_review_date: nowIso,
        created_at: nowIso,
        updated_at: nowIso
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error al crear carta en Supabase', error);
      throw error;
    }

    return this.mapCardRow(data);
  }

  async updateCard(
    id: string,
    updates: Partial<
      Pick<
        Flashcard,
        | 'front'
        | 'back'
        | 'deckId'
        | 'easeFactor'
        | 'interval'
        | 'repetitions'
        | 'nextReviewDate'
        | 'lastReviewDate'
      >
    >
  ): Promise<Flashcard | null> {
    const nowIso = new Date().toISOString();

    const payload: any = {
      updated_at: nowIso
    };

    if (updates.front !== undefined) payload.front = updates.front;
    if (updates.back !== undefined) payload.back = updates.back;
    if (updates.deckId !== undefined) payload.deck_id = updates.deckId;
    if (updates.easeFactor !== undefined) payload.ease_factor = updates.easeFactor;
    if (updates.interval !== undefined) payload.interval = updates.interval;
    if (updates.repetitions !== undefined) payload.repetitions = updates.repetitions;
    if (updates.nextReviewDate !== undefined) {
      payload.next_review_date = updates.nextReviewDate.toISOString();
    }
    if (updates.lastReviewDate !== undefined) {
      payload.last_review_date = updates.lastReviewDate.toISOString();
    }

    const { data, error } = await this.supabase
      .from('cards')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error al actualizar carta en Supabase', error);
      throw error;
    }

    return data ? this.mapCardRow(data) : null;
  }

  async deleteCard(id: string): Promise<boolean> {
    const { error } = await this.supabase.from('cards').delete().eq('id', id);

    if (error) {
      console.error('Error al eliminar carta en Supabase', error);
      throw error;
    }

    return true;
  }

  async getCardsDueForReview(deckId?: string): Promise<Flashcard[]> {
    const nowIso = new Date().toISOString();

    let query = this.supabase
      .from('cards')
      .select('*')
      .lte('next_review_date', nowIso)
      .order('next_review_date', { ascending: true });

    if (deckId) {
      query = query.eq('deck_id', deckId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener cartas para repaso desde Supabase', error);
      throw error;
    }

    return (data ?? []).map((row) => this.mapCardRow(row));
  }
}

