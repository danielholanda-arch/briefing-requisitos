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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      answers: {
        Row: {
          projeto_id: string
          question_id: string
          skipped: boolean
          updated_at: string
          value: Json | null
        }
        Insert: {
          projeto_id: string
          question_id: string
          skipped?: boolean
          updated_at?: string
          value?: Json | null
        }
        Update: {
          projeto_id?: string
          question_id?: string
          skipped?: boolean
          updated_at?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "answers_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "perguntas"
            referencedColumns: ["id"]
          },
        ]
      }
      perguntas: {
        Row: {
          ajuda: string | null
          ativa: boolean
          created_at: string
          escala_max: number | null
          escala_min: number | null
          id: string
          obrigatoria: boolean
          opcoes: string[]
          ordem: number
          permite_outro: boolean
          placeholder: string | null
          rotulo_max: string | null
          rotulo_min: string | null
          secao_id: string
          tipo: Database["public"]["Enums"]["tipo_pergunta"]
          titulo: string
          updated_at: string
        }
        Insert: {
          ajuda?: string | null
          ativa?: boolean
          created_at?: string
          escala_max?: number | null
          escala_min?: number | null
          id: string
          obrigatoria?: boolean
          opcoes?: string[]
          ordem?: number
          permite_outro?: boolean
          placeholder?: string | null
          rotulo_max?: string | null
          rotulo_min?: string | null
          secao_id: string
          tipo: Database["public"]["Enums"]["tipo_pergunta"]
          titulo: string
          updated_at?: string
        }
        Update: {
          ajuda?: string | null
          ativa?: boolean
          created_at?: string
          escala_max?: number | null
          escala_min?: number | null
          id?: string
          obrigatoria?: boolean
          opcoes?: string[]
          ordem?: number
          permite_outro?: boolean
          placeholder?: string | null
          rotulo_max?: string | null
          rotulo_min?: string | null
          secao_id?: string
          tipo?: Database["public"]["Enums"]["tipo_pergunta"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "perguntas_secao_id_fkey"
            columns: ["secao_id"]
            isOneToOne: false
            referencedRelation: "secoes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          created_at: string
          email: string | null
          empresa: string | null
          id: string
          matricula: string
          nome: string
          senha_provisoria: boolean
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          empresa?: string | null
          id: string
          matricula: string
          nome: string
          senha_provisoria?: boolean
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          empresa?: string | null
          id?: string
          matricula?: string
          nome?: string
          senha_provisoria?: boolean
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projeto_questionarios: {
        Row: {
          created_at: string
          enviado_em: string | null
          projeto_id: string
          questionario_id: string
          status: Database["public"]["Enums"]["briefing_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          enviado_em?: string | null
          projeto_id: string
          questionario_id: string
          status?: Database["public"]["Enums"]["briefing_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          enviado_em?: string | null
          projeto_id?: string
          questionario_id?: string
          status?: Database["public"]["Enums"]["briefing_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projeto_questionarios_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_questionarios_questionario_id_fkey"
            columns: ["questionario_id"]
            isOneToOne: false
            referencedRelation: "questionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      projetos: {
        Row: {
          cliente_id: string
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projetos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      questionarios: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          padrao: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          padrao?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          padrao?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      secoes: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          ordem: number
          questionario_id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id: string
          ordem?: number
          questionario_id: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          ordem?: number
          questionario_id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "secoes_questionario_id_fkey"
            columns: ["questionario_id"]
            isOneToOne: false
            referencedRelation: "questionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      enviar_briefing: {
        Args: { _projeto: string; _questionario: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "cliente"
      briefing_status: "nao_iniciado" | "em_andamento" | "concluido"
      tipo_pergunta:
        | "texto"
        | "texto_longo"
        | "escolha_unica"
        | "multipla_escolha"
        | "escala"
        | "arquivos"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "cliente"],
      briefing_status: ["nao_iniciado", "em_andamento", "concluido"],
      tipo_pergunta: [
        "texto",
        "texto_longo",
        "escolha_unica",
        "multipla_escolha",
        "escala",
        "arquivos",
      ],
    },
  },
} as const
