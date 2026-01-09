/**
 * Supabase Database Types
 * Auto-generated types should replace this file after running supabase gen types
 * 
 * Created: Jan 5, 2026
 * Purpose: Type definitions for all database tables
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string
          name: string
          slug: string
          avatar_url: string | null
          system_prompt: string
          wallet_address: string
          chip_count: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          avatar_url?: string | null
          system_prompt: string
          wallet_address: string
          chip_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          avatar_url?: string | null
          system_prompt?: string
          wallet_address?: string
          chip_count?: number
          created_at?: string
        }
      }
      lobbies: {
        Row: {
          id: string
          name: string
          status: 'active' | 'paused'
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          status?: 'active' | 'paused'
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          status?: 'active' | 'paused'
          created_at?: string
        }
      }
      hands: {
        Row: {
          id: string
          lobby_id: string
          hand_number: number
          status: 'betting_open' | 'betting_closed' | 'playing' | 'resolved'
          community_cards: string[] | null
          pot_amount: number
          winner_agent_id: string | null
          winning_hand: string | null
          betting_closes_at: string | null
          resolved_at: string | null
          created_at: string
          // Added for proper poker flow
          current_round: 'preflop' | 'flop' | 'turn' | 'river' | null
          dealer_position: number | null
          active_agent_id: string | null
        }
        Insert: {
          id?: string
          lobby_id: string
          hand_number: number
          status?: 'betting_open' | 'betting_closed' | 'playing' | 'resolved'
          community_cards?: string[] | null
          pot_amount?: number
          winner_agent_id?: string | null
          winning_hand?: string | null
          betting_closes_at?: string | null
          resolved_at?: string | null
          created_at?: string
          current_round?: 'preflop' | 'flop' | 'turn' | 'river' | null
          dealer_position?: number | null
          active_agent_id?: string | null
        }
        Update: {
          id?: string
          lobby_id?: string
          hand_number?: number
          status?: 'betting_open' | 'betting_closed' | 'playing' | 'resolved'
          community_cards?: string[] | null
          pot_amount?: number
          winner_agent_id?: string | null
          winning_hand?: string | null
          betting_closes_at?: string | null
          resolved_at?: string | null
          created_at?: string
          current_round?: 'preflop' | 'flop' | 'turn' | 'river' | null
          dealer_position?: number | null
          active_agent_id?: string | null
        }
      }
      hand_agents: {
        Row: {
          id: string
          hand_id: string
          agent_id: string
          seat_position: number
          hole_cards: string[] | null
          chip_count: number
          current_bet: number
          is_folded: boolean
          is_all_in: boolean
        }
        Insert: {
          id?: string
          hand_id: string
          agent_id: string
          seat_position: number
          hole_cards?: string[] | null
          chip_count: number
          current_bet?: number
          is_folded?: boolean
          is_all_in?: boolean
        }
        Update: {
          id?: string
          hand_id?: string
          agent_id?: string
          seat_position?: number
          hole_cards?: string[] | null
          chip_count?: number
          current_bet?: number
          is_folded?: boolean
          is_all_in?: boolean
        }
      }
      agent_actions: {
        Row: {
          id: string
          hand_id: string
          agent_id: string
          action_type: 'fold' | 'check' | 'call' | 'raise' | 'all_in' | 'blind'
          amount: number | null
          reasoning: string | null
          tx_hash: string | null
          round: 'preflop' | 'flop' | 'turn' | 'river'
          created_at: string
        }
        Insert: {
          id?: string
          hand_id: string
          agent_id: string
          action_type: 'fold' | 'check' | 'call' | 'raise' | 'all_in' | 'blind'
          amount?: number | null
          reasoning?: string | null
          tx_hash?: string | null
          round: 'preflop' | 'flop' | 'turn' | 'river'
          created_at?: string
        }
        Update: {
          id?: string
          hand_id?: string
          agent_id?: string
          action_type?: 'fold' | 'check' | 'call' | 'raise' | 'all_in' | 'blind'
          amount?: number | null
          reasoning?: string | null
          tx_hash?: string | null
          round?: 'preflop' | 'flop' | 'turn' | 'river'
          created_at?: string
        }
      }
      spectator_bets: {
        Row: {
          id: string
          hand_id: string
          wallet_address: string
          agent_id: string
          amount: number
          odds_at_bet: number | null
          tx_hash: string
          status: 'pending' | 'won' | 'lost'
          payout_amount: number | null
          payout_tx_hash: string | null
          created_at: string
        }
        Insert: {
          id?: string
          hand_id: string
          wallet_address: string
          agent_id: string
          amount: number
          odds_at_bet?: number | null
          tx_hash: string
          status?: 'pending' | 'won' | 'lost'
          payout_amount?: number | null
          payout_tx_hash?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          hand_id?: string
          wallet_address?: string
          agent_id?: string
          amount?: number
          odds_at_bet?: number | null
          tx_hash?: string
          status?: 'pending' | 'won' | 'lost'
          payout_amount?: number | null
          payout_tx_hash?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Convenience aliases
export type Agent = Tables<'agents'>
export type Lobby = Tables<'lobbies'>
export type Hand = Tables<'hands'>
export type HandAgent = Tables<'hand_agents'>
export type AgentAction = Tables<'agent_actions'>
export type SpectatorBet = Tables<'spectator_bets'>


