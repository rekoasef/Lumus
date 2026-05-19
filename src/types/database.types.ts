export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_cache: {
        Row: {
          cache_key: string
          created_at: string | null
          expires_at: string
          id: string
          model_used: string
          module: string
          prompt: string | null
          response: string
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          cache_key: string
          created_at?: string | null
          expires_at: string
          id?: string
          model_used: string
          module: string
          prompt?: string | null
          response: string
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          cache_key?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          model_used?: string
          module?: string
          prompt?: string | null
          response?: string
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          content: string
          created_at: string | null
          id: string
          model_used: string | null
          module: string
          role: string
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          model_used?: string | null
          module: string
          role: string
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          model_used?: string | null
          module?: string
          role?: string
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      body_records: {
        Row: {
          body_fat_pct: number | null
          created_at: string | null
          date: string
          id: string
          muscle_kg: number | null
          notes: string | null
          photo_url: string | null
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          body_fat_pct?: number | null
          created_at?: string | null
          date?: string
          id?: string
          muscle_kg?: number | null
          notes?: string | null
          photo_url?: string | null
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          body_fat_pct?: number | null
          created_at?: string | null
          date?: string
          id?: string
          muscle_kg?: number | null
          notes?: string | null
          photo_url?: string | null
          user_id?: string
          weight_kg?: number | null
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
      calendar_events: {
        Row: {
          all_day: boolean | null
          color: string | null
          created_at: string | null
          description: string | null
          end_time: string | null
          id: string
          start_time: string
          task_id: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          all_day?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          start_time: string
          task_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          all_day?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          start_time?: string
          task_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_events: {
        Row: {
          contact_id: string
          created_at: string | null
          date: string
          id: string
          notes: string | null
          recurring: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          date: string
          id?: string
          notes?: string | null
          recurring?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          recurring?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          birth_date: string | null
          created_at: string | null
          id: string
          name: string
          notes: string | null
          relation: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          relation?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          relation?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      finance_categories: {
        Row: {
          color: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          type: string
          user_id: string
        }
        Insert: {
          color?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          type: string
          user_id: string
        }
        Update: {
          color?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          completed: boolean | null
          created_at: string | null
          date: string
          habit_id: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          date?: string
          habit_id: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          date?: string
          habit_id?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          active: boolean | null
          color: string | null
          created_at: string | null
          description: string | null
          frequency: string | null
          icon: string | null
          id: string
          name: string
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          frequency?: string | null
          icon?: string | null
          id?: string
          name: string
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          frequency?: string | null
          icon?: string | null
          id?: string
          name?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      health_logs: {
        Row: {
          created_at: string | null
          date: string
          id: string
          sleep_hours: number | null
          steps: number | null
          user_id: string
          water_ml: number | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          sleep_hours?: number | null
          steps?: number | null
          user_id: string
          water_ml?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          sleep_hours?: number | null
          steps?: number | null
          user_id?: string
          water_ml?: number | null
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          ai_summary: string | null
          content: string
          created_at: string | null
          date: string
          id: string
          mood: number | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          content: string
          created_at?: string | null
          date?: string
          id?: string
          mood?: number | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          content?: string
          created_at?: string | null
          date?: string
          id?: string
          mood?: number | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      meal_logs: {
        Row: {
          calories: number | null
          created_at: string | null
          date: string
          id: string
          meal_type: string
          name: string | null
          notes: string | null
          recipe_id: string | null
          user_id: string
        }
        Insert: {
          calories?: number | null
          created_at?: string | null
          date?: string
          id?: string
          meal_type: string
          name?: string | null
          notes?: string | null
          recipe_id?: string | null
          user_id: string
        }
        Update: {
          calories?: number | null
          created_at?: string | null
          date?: string
          id?: string
          meal_type?: string
          name?: string | null
          notes?: string | null
          recipe_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_logs_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      mood_logs: {
        Row: {
          created_at: string | null
          date: string
          id: string
          mood: number
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          mood: number
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          mood?: number
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          module: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          module?: string | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          module?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      objectives: {
        Row: {
          achieved: boolean | null
          created_at: string | null
          description: string | null
          id: string
          month: number | null
          progress: number | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
          year: number
        }
        Insert: {
          achieved?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          month?: number | null
          progress?: number | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
          year: number
        }
        Update: {
          achieved?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          month?: number | null
          progress?: number | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      recipes: {
        Row: {
          ai_generated: boolean | null
          calories: number | null
          carbs_g: number | null
          created_at: string | null
          description: string | null
          fat_g: number | null
          favorite: boolean | null
          id: string
          ingredients: Json | null
          instructions: string | null
          prep_time_min: number | null
          protein_g: number | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_generated?: boolean | null
          calories?: number | null
          carbs_g?: number | null
          created_at?: string | null
          description?: string | null
          fat_g?: number | null
          favorite?: boolean | null
          id?: string
          ingredients?: Json | null
          instructions?: string | null
          prep_time_min?: number | null
          protein_g?: number | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_generated?: boolean | null
          calories?: number | null
          carbs_g?: number | null
          created_at?: string | null
          description?: string | null
          fat_g?: number | null
          favorite?: boolean | null
          id?: string
          ingredients?: Json | null
          instructions?: string | null
          prep_time_min?: number | null
          protein_g?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      routines: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
          wallet_id: string | null
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
          wallet_id?: string | null
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
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saving_goals_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_list_items: {
        Row: {
          auto_added: boolean | null
          category: string | null
          checked: boolean | null
          created_at: string | null
          id: string
          name: string
          quantity: string | null
          user_id: string
        }
        Insert: {
          auto_added?: boolean | null
          category?: string | null
          checked?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          quantity?: string | null
          user_id: string
        }
        Update: {
          auto_added?: boolean | null
          category?: string | null
          checked?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          quantity?: string | null
          user_id?: string
        }
        Relationships: []
      }
      study_notes: {
        Row: {
          content: string
          created_at: string | null
          id: string
          tags: string[] | null
          title: string | null
          topic_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          tags?: string[] | null
          title?: string | null
          topic_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          tags?: string[] | null
          title?: string | null
          topic_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_notes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "study_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      study_topics: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          progress: number | null
          source_url: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          progress?: number | null
          source_url?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          progress?: number | null
          source_url?: string | null
          status?: string | null
          title?: string
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
      task_label_assignments: {
        Row: {
          label_id: string
          task_id: string
        }
        Insert: {
          label_id: string
          task_id: string
        }
        Update: {
          label_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_label_assignments_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "task_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_label_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_labels: {
        Row: {
          color: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          duration_minutes: number | null
          id: string
          parent_id: string | null
          priority: string | null
          routine_id: string | null
          start_time: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          duration_minutes?: number | null
          id?: string
          parent_id?: string | null
          priority?: string | null
          routine_id?: string | null
          start_time?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          duration_minutes?: number | null
          id?: string
          parent_id?: string | null
          priority?: string | null
          routine_id?: string | null
          start_time?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_task_routine"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          auto_classified: boolean | null
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
          auto_classified?: boolean | null
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
          auto_classified?: boolean | null
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
      user_context_cache: {
        Row: {
          expires_at: string
          generated_at: string | null
          id: string
          snapshot: Json
          user_id: string
        }
        Insert: {
          expires_at: string
          generated_at?: string | null
          id?: string
          snapshot: Json
          user_id: string
        }
        Update: {
          expires_at?: string
          generated_at?: string | null
          id?: string
          snapshot?: Json
          user_id?: string
        }
        Relationships: []
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
          avatar_url: string | null
          birth_date: string | null
          created_at: string | null
          education: string | null
          height_cm: number | null
          id: string
          monthly_salary: number | null
          name: string
          occupation: string | null
          onboarding_done: boolean | null
          timezone: string | null
          updated_at: string | null
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          education?: string | null
          height_cm?: number | null
          id?: string
          monthly_salary?: number | null
          name: string
          occupation?: string | null
          onboarding_done?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          education?: string | null
          height_cm?: number | null
          id?: string
          monthly_salary?: number | null
          name?: string
          occupation?: string | null
          onboarding_done?: boolean | null
          timezone?: string | null
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
      workout_exercises: {
        Row: {
          description: string | null
          id: string
          is_default: boolean | null
          muscle_group: string | null
          name: string
          user_id: string
        }
        Insert: {
          description?: string | null
          id?: string
          is_default?: boolean | null
          muscle_group?: string | null
          name: string
          user_id: string
        }
        Update: {
          description?: string | null
          id?: string
          is_default?: boolean | null
          muscle_group?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_routine_exercises: {
        Row: {
          exercise_id: string
          id: string
          order_index: number | null
          reps: number | null
          rest_seconds: number | null
          routine_id: string
          sets: number | null
        }
        Insert: {
          exercise_id: string
          id?: string
          order_index?: number | null
          reps?: number | null
          rest_seconds?: number | null
          routine_id: string
          sets?: number | null
        }
        Update: {
          exercise_id?: string
          id?: string
          order_index?: number | null
          reps?: number | null
          rest_seconds?: number | null
          routine_id?: string
          sets?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_routine_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_routine_exercises_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "workout_routines"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_routines: {
        Row: {
          ai_generated: boolean | null
          created_at: string | null
          description: string | null
          goal: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_generated?: boolean | null
          created_at?: string | null
          description?: string | null
          goal?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_generated?: boolean | null
          created_at?: string | null
          description?: string | null
          goal?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      workout_session_logs: {
        Row: {
          exercise_id: string
          id: string
          notes: string | null
          reps_done: number | null
          session_id: string
          set_number: number
          weight_kg: number | null
        }
        Insert: {
          exercise_id: string
          id?: string
          notes?: string | null
          reps_done?: number | null
          session_id: string
          set_number: number
          weight_kg?: number | null
        }
        Update: {
          exercise_id?: string
          id?: string
          notes?: string | null
          reps_done?: number | null
          session_id?: string
          set_number?: number
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_session_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_session_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          completed: boolean | null
          created_at: string | null
          date: string
          duration_min: number | null
          id: string
          notes: string | null
          routine_id: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          date?: string
          duration_min?: number | null
          id?: string
          notes?: string | null
          routine_id?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          date?: string
          duration_min?: number | null
          id?: string
          notes?: string | null
          routine_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "workout_routines"
            referencedColumns: ["id"]
          },
        ]
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
  public: {
    Enums: {},
  },
} as const
