export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      billing_subscriptions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          id: string
          mp_preapproval_id: string | null
          next_payment_date: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          id?: string
          mp_preapproval_id?: string | null
          next_payment_date?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          id?: string
          mp_preapproval_id?: string | null
          next_payment_date?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount: number
          category_id: string
          created_at: string | null
          id: string
          month: number
          user_id: string
          year: number
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string | null
          id?: string
          month: number
          user_id: string
          year: number
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string | null
          id?: string
          month?: number
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rate_history: {
        Row: {
          created_at: string
          date: string
          eur: number | null
          source: string
          usd: number
        }
        Insert: {
          created_at?: string
          date: string
          eur?: number | null
          source?: string
          usd: number
        }
        Update: {
          created_at?: string
          date?: string
          eur?: number | null
          source?: string
          usd?: number
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string
          path: string | null
          status: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          message: string
          path?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string
          path?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      finance_categories: {
        Row: {
          color: string | null
          deleted_at: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          type: string
          user_id: string
        }
        Insert: {
          color?: string | null
          deleted_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          type: string
          user_id: string
        }
        Update: {
          color?: string | null
          deleted_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_reports: {
        Row: {
          content: string
          created_at: string
          id: string
          month: string
          regenerations: number
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          month: string
          regenerations?: number
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          month?: string
          regenerations?: number
          user_id?: string
        }
        Relationships: []
      }
      free_access_grants: {
        Row: {
          expires_at: string | null
          granted_at: string
          reason: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          reason: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      holdings: {
        Row: {
          created_at: string
          id: string
          kind: string
          manual_price: number | null
          name: string
          price_source: string | null
          purchase_currency: string
          purchase_date: string
          purchase_price: number
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          manual_price?: number | null
          name: string
          price_source?: string | null
          purchase_currency?: string
          purchase_date: string
          purchase_price: number
          quantity: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          manual_price?: number | null
          name?: string
          price_source?: string | null
          purchase_currency?: string
          purchase_date?: string
          purchase_price?: number
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          email_enabled: boolean
          in_app_enabled: boolean
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          email_enabled?: boolean
          in_app_enabled?: boolean
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          email_enabled?: boolean
          in_app_enabled?: boolean
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          dedupe_key: string
          emailed_at: string | null
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          dedupe_key: string
          emailed_at?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          dedupe_key?: string
          emailed_at?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_transactions: {
        Row: {
          active: boolean
          amount: number
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          next_date: string
          repeat_day: number | null
          repeat_type: string
          type: string
          updated_at: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          active?: boolean
          amount: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          next_date: string
          repeat_day?: number | null
          repeat_type: string
          type: string
          updated_at?: string
          user_id: string
          wallet_id: string
        }
        Update: {
          active?: boolean
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          next_date?: string
          repeat_day?: number | null
          repeat_type?: string
          type?: string
          updated_at?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      saving_goal_wallets: {
        Row: {
          goal_id: string
          wallet_id: string
        }
        Insert: {
          goal_id: string
          wallet_id: string
        }
        Update: {
          goal_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saving_goal_wallets_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "saving_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saving_goal_wallets_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      saving_goals: {
        Row: {
          achieved: boolean | null
          created_at: string | null
          current_amount: number | null
          icon: string | null
          id: string
          name: string
          target_amount: number
          target_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achieved?: boolean | null
          created_at?: string | null
          current_amount?: number | null
          icon?: string | null
          id?: string
          name: string
          target_amount: number
          target_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achieved?: boolean | null
          created_at?: string | null
          current_amount?: number | null
          icon?: string | null
          id?: string
          name?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          active: boolean | null
          amount: number
          billing_cycle: string | null
          created_at: string | null
          currency: string | null
          icon: string | null
          id: string
          name: string
          next_billing: string | null
          updated_at: string | null
          user_id: string
          variable: boolean
          wallet_id: string | null
        }
        Insert: {
          active?: boolean | null
          amount: number
          billing_cycle?: string | null
          created_at?: string | null
          currency?: string | null
          icon?: string | null
          id?: string
          name: string
          next_billing?: string | null
          updated_at?: string | null
          user_id: string
          variable?: boolean
          wallet_id?: string | null
        }
        Update: {
          active?: boolean | null
          amount?: number
          billing_cycle?: string | null
          created_at?: string | null
          currency?: string | null
          icon?: string | null
          id?: string
          name?: string
          next_billing?: string | null
          updated_at?: string | null
          user_id?: string
          variable?: boolean
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string | null
          date: string
          deleted_at: string | null
          description: string | null
          id: string
          type: string
          updated_at: string | null
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string | null
          date?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          type: string
          updated_at?: string | null
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          date?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          type?: string
          updated_at?: string | null
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_goals: {
        Row: {
          achieved: boolean | null
          created_at: string | null
          description: string | null
          id: string
          target_date: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achieved?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          target_date?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achieved?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          target_date?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_life_summary: {
        Row: {
          content: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          activity_level: string
          avatar_url: string | null
          birth_date: string | null
          created_at: string | null
          daily_calorie_goal: number | null
          daily_protein_goal: number | null
          education: string | null
          height_cm: number | null
          id: string
          monthly_salary: number | null
          name: string
          occupation: string | null
          onboarding_done: boolean | null
          timezone: string | null
          trains: boolean
          updated_at: string | null
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          activity_level?: string
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          daily_calorie_goal?: number | null
          daily_protein_goal?: number | null
          education?: string | null
          height_cm?: number | null
          id?: string
          monthly_salary?: number | null
          name: string
          occupation?: string | null
          onboarding_done?: boolean | null
          timezone?: string | null
          trains?: boolean
          updated_at?: string | null
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          activity_level?: string
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          daily_calorie_goal?: number | null
          daily_protein_goal?: number | null
          education?: string | null
          height_cm?: number | null
          id?: string
          monthly_salary?: number | null
          name?: string
          occupation?: string | null
          onboarding_done?: boolean | null
          timezone?: string | null
          trains?: boolean
          updated_at?: string | null
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number | null
          color: string | null
          created_at: string | null
          currency: string | null
          deleted_at: string | null
          icon: string | null
          id: string
          name: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          color?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          icon?: string | null
          id?: string
          name: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          color?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wealth_analyses: {
        Row: {
          content: string
          created_at: string
          id: string
          month: string
          regenerations: number
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          month: string
          regenerations?: number
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          month?: string
          regenerations?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_finance_summary: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          category_id: string
          currency: string
          total: number
          tx_count: number
          type: string
        }[]
      }
      merge_finance_categories: {
        Args: { p_source: string; p_target: string }
        Returns: Json
      }
      recompute_wallet_balance: {
        Args: { p_wallet_id: string }
        Returns: undefined
      }
      seed_default_finance_categories: {
        Args: { p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
