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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      api_rate_limits: {
        Row: {
          endpoint: string
          request_count: number | null
          user_id: string
          window_start: string | null
        }
        Insert: {
          endpoint: string
          request_count?: number | null
          user_id: string
          window_start?: string | null
        }
        Update: {
          endpoint?: string
          request_count?: number | null
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
      }
      backup_metadata: {
        Row: {
          created_at: string
          deleted_at: string
          deleted_by: string | null
          deletion_reason: string | null
          estimated_size_mb: number | null
          expiration_date: string | null
          id: string
          original_data: Json
          permanently_deleted_at: string | null
          record_id: string
          related_files: string[] | null
          restored_at: string | null
          table_name: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string
          deleted_by?: string | null
          deletion_reason?: string | null
          estimated_size_mb?: number | null
          expiration_date?: string | null
          id?: string
          original_data: Json
          permanently_deleted_at?: string | null
          record_id: string
          related_files?: string[] | null
          restored_at?: string | null
          table_name: string
        }
        Update: {
          created_at?: string
          deleted_at?: string
          deleted_by?: string | null
          deletion_reason?: string | null
          estimated_size_mb?: number | null
          expiration_date?: string | null
          id?: string
          original_data?: Json
          permanently_deleted_at?: string | null
          record_id?: string
          related_files?: string[] | null
          restored_at?: string | null
          table_name?: string
        }
        Relationships: []
      }
      backup_retention_settings: {
        Row: {
          auto_cleanup_enabled: boolean | null
          created_at: string
          id: string
          large_file_retention_days: number | null
          retention_days: number
          size_threshold_mb: number | null
          table_name: string
          updated_at: string
        }
        Insert: {
          auto_cleanup_enabled?: boolean | null
          created_at?: string
          id?: string
          large_file_retention_days?: number | null
          retention_days?: number
          size_threshold_mb?: number | null
          table_name: string
          updated_at?: string
        }
        Update: {
          auto_cleanup_enabled?: boolean | null
          created_at?: string
          id?: string
          large_file_retention_days?: number | null
          retention_days?: number
          size_threshold_mb?: number | null
          table_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      banner_images: {
        Row: {
          alt_text: string | null
          banner_id: string
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          banner_id: string
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          banner_id?: string
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "banner_images_banner_id_fkey"
            columns: ["banner_id"]
            isOneToOne: false
            referencedRelation: "homepage_banners"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      blog_post_roles: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          role: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_roles_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string | null
          category_id: string | null
          content: string
          created_at: string | null
          deleted_at: string | null
          excerpt: string | null
          featured_image: string | null
          id: string
          is_published: boolean | null
          published_at: string | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          category_id?: string | null
          content: string
          created_at?: string | null
          deleted_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          category_id?: string | null
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      calculator_calibrations: {
        Row: {
          actual_energy_used: number | null
          actual_material_used: number
          actual_time: number
          calculated_material_cost: number | null
          calculated_time: number | null
          calculated_total_cost: number | null
          calculated_volume: number | null
          calculated_weight: number | null
          calibration_name: string
          cost_adjustment_factor: number | null
          created_at: string | null
          id: string
          infill_percentage: number | null
          is_active: boolean | null
          layer_height: number | null
          material_adjustment_factor: number | null
          material_id: string | null
          notes: string | null
          print_speed: number | null
          stl_file_path: string
          supports_enabled: boolean | null
          test_type: string
          time_adjustment_factor: number | null
          updated_at: string | null
        }
        Insert: {
          actual_energy_used?: number | null
          actual_material_used: number
          actual_time: number
          calculated_material_cost?: number | null
          calculated_time?: number | null
          calculated_total_cost?: number | null
          calculated_volume?: number | null
          calculated_weight?: number | null
          calibration_name: string
          cost_adjustment_factor?: number | null
          created_at?: string | null
          id?: string
          infill_percentage?: number | null
          is_active?: boolean | null
          layer_height?: number | null
          material_adjustment_factor?: number | null
          material_id?: string | null
          notes?: string | null
          print_speed?: number | null
          stl_file_path: string
          supports_enabled?: boolean | null
          test_type: string
          time_adjustment_factor?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_energy_used?: number | null
          actual_material_used?: number
          actual_time?: number
          calculated_material_cost?: number | null
          calculated_time?: number | null
          calculated_total_cost?: number | null
          calculated_volume?: number | null
          calculated_weight?: number | null
          calibration_name?: string
          cost_adjustment_factor?: number | null
          created_at?: string | null
          id?: string
          infill_percentage?: number | null
          is_active?: boolean | null
          layer_height?: number | null
          material_adjustment_factor?: number | null
          material_id?: string | null
          notes?: string | null
          print_speed?: number | null
          stl_file_path?: string
          supports_enabled?: boolean | null
          test_type?: string
          time_adjustment_factor?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calculator_calibrations_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      calibration_materials: {
        Row: {
          actual_energy_kwh: number | null
          actual_material_grams: number
          actual_time_minutes: number
          calculated_time: number | null
          calculated_volume: number | null
          calculated_weight: number | null
          calibration_test_id: string
          created_at: string
          id: string
          infill_percentage: number
          is_active: boolean
          layer_height: number
          material_adjustment_factor: number | null
          material_id: string | null
          print_speed: number
          time_adjustment_factor: number | null
        }
        Insert: {
          actual_energy_kwh?: number | null
          actual_material_grams: number
          actual_time_minutes: number
          calculated_time?: number | null
          calculated_volume?: number | null
          calculated_weight?: number | null
          calibration_test_id: string
          created_at?: string
          id?: string
          infill_percentage?: number
          is_active?: boolean
          layer_height: number
          material_adjustment_factor?: number | null
          material_id?: string | null
          print_speed?: number
          time_adjustment_factor?: number | null
        }
        Update: {
          actual_energy_kwh?: number | null
          actual_material_grams?: number
          actual_time_minutes?: number
          calculated_time?: number | null
          calculated_volume?: number | null
          calculated_weight?: number | null
          calibration_test_id?: string
          created_at?: string
          id?: string
          infill_percentage?: number
          is_active?: boolean
          layer_height?: number
          material_adjustment_factor?: number | null
          material_id?: string | null
          print_speed?: number
          time_adjustment_factor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "calibration_materials_calibration_test_id_fkey"
            columns: ["calibration_test_id"]
            isOneToOne: false
            referencedRelation: "calibration_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calibration_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      calibration_profiles: {
        Row: {
          created_at: string
          geometry_classification: string | null
          id: string
          is_active: boolean
          layer_height: number | null
          material_adjustment_factor: number
          material_id: string | null
          profile_name: string
          sample_count: number
          size_category: string | null
          supports_enabled: boolean | null
          time_adjustment_factor: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          geometry_classification?: string | null
          id?: string
          is_active?: boolean
          layer_height?: number | null
          material_adjustment_factor?: number
          material_id?: string | null
          profile_name: string
          sample_count?: number
          size_category?: string | null
          supports_enabled?: boolean | null
          time_adjustment_factor?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          geometry_classification?: string | null
          id?: string
          is_active?: boolean
          layer_height?: number | null
          material_adjustment_factor?: number
          material_id?: string | null
          profile_name?: string
          sample_count?: number
          size_category?: string | null
          supports_enabled?: boolean | null
          time_adjustment_factor?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calibration_profiles_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      calibration_tests: {
        Row: {
          created_at: string
          geometry_classification: string | null
          id: string
          notes: string | null
          size_category: string | null
          stl_file_path: string
          supports_enabled: boolean
          test_name: string
        }
        Insert: {
          created_at?: string
          geometry_classification?: string | null
          id?: string
          notes?: string | null
          size_category?: string | null
          stl_file_path: string
          supports_enabled?: boolean
          test_name: string
        }
        Update: {
          created_at?: string
          geometry_classification?: string | null
          id?: string
          notes?: string | null
          size_category?: string | null
          stl_file_path?: string
          supports_enabled?: boolean
          test_name?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string | null
          custom_text: string | null
          customization_selections: Json | null
          id: string
          product_id: string
          quantity: number
          selected_color: string | null
          selected_material: string | null
          session_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          custom_text?: string | null
          customization_selections?: Json | null
          id?: string
          product_id: string
          quantity?: number
          selected_color?: string | null
          selected_material?: string | null
          session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          custom_text?: string | null
          customization_selections?: Json | null
          id?: string
          product_id?: string
          quantity?: number
          selected_color?: string | null
          selected_material?: string | null
          session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_selected_color_fkey"
            columns: ["selected_color"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_selected_material_fkey"
            columns: ["selected_material"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      checkout_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          shipping_info: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          shipping_info: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          shipping_info?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      colors: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          hex_code: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          hex_code: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          hex_code?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          deleted_at: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          is_loyalty_reward: boolean | null
          max_uses: number | null
          min_purchase: number | null
          points_required: number | null
          product_id: string | null
          times_used: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          deleted_at?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_loyalty_reward?: boolean | null
          max_uses?: number | null
          min_purchase?: number | null
          points_required?: number | null
          product_id?: string | null
          times_used?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          deleted_at?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_loyalty_reward?: boolean | null
          max_uses?: number | null
          min_purchase?: number | null
          points_required?: number | null
          product_id?: string | null
          times_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          allowed_pages: string[] | null
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          allowed_pages?: string[] | null
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          allowed_pages?: string[] | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          concept: string
          created_at: string | null
          created_by: string | null
          date: string
          id: string
        }
        Insert: {
          amount: number
          concept: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
        }
        Update: {
          amount?: number
          concept?: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
        }
        Relationships: []
      }
      footer_links: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          section: string
          title: string
          url: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          section?: string
          title: string
          url: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          section?: string
          title?: string
          url?: string
        }
        Relationships: []
      }
      footer_settings: {
        Row: {
          background_color: string | null
          border_color: string | null
          border_top_style: string | null
          border_top_width: number | null
          brand_name: string | null
          brand_tagline: string | null
          columns_layout: string | null
          copyright_text: string | null
          created_at: string
          help_section_title: string | null
          id: string
          link_font_size: number | null
          newsletter_button_color: string | null
          newsletter_description: string | null
          newsletter_placeholder: string | null
          newsletter_title: string | null
          padding_bottom: number | null
          padding_horizontal: number | null
          padding_top: number | null
          payment_methods_title: string | null
          quick_links_title: string | null
          section_gap: number | null
          show_bancontact: boolean | null
          show_blog_link: boolean | null
          show_brand_section: boolean | null
          show_catalog_link: boolean | null
          show_cookies_link: boolean | null
          show_copyright: boolean | null
          show_faq_link: boolean | null
          show_footer: boolean | null
          show_gift_cards_link: boolean | null
          show_help_section: boolean | null
          show_ideal: boolean | null
          show_legal_link: boolean | null
          show_mastercard: boolean | null
          show_newsletter: boolean | null
          show_payment_methods: boolean | null
          show_paypal: boolean | null
          show_privacy_link: boolean | null
          show_quick_links: boolean | null
          show_quote_link: boolean | null
          show_social_icons: boolean | null
          show_terms_link: boolean | null
          show_visa: boolean | null
          social_facebook: string | null
          social_icon_color: string | null
          social_icon_size: number | null
          social_instagram: string | null
          social_linkedin: string | null
          social_tiktok: string | null
          social_twitter: string | null
          social_youtube: string | null
          text_color: string | null
          text_font_size: number | null
          title_font_size: number | null
          title_font_weight: string | null
          updated_at: string
        }
        Insert: {
          background_color?: string | null
          border_color?: string | null
          border_top_style?: string | null
          border_top_width?: number | null
          brand_name?: string | null
          brand_tagline?: string | null
          columns_layout?: string | null
          copyright_text?: string | null
          created_at?: string
          help_section_title?: string | null
          id?: string
          link_font_size?: number | null
          newsletter_button_color?: string | null
          newsletter_description?: string | null
          newsletter_placeholder?: string | null
          newsletter_title?: string | null
          padding_bottom?: number | null
          padding_horizontal?: number | null
          padding_top?: number | null
          payment_methods_title?: string | null
          quick_links_title?: string | null
          section_gap?: number | null
          show_bancontact?: boolean | null
          show_blog_link?: boolean | null
          show_brand_section?: boolean | null
          show_catalog_link?: boolean | null
          show_cookies_link?: boolean | null
          show_copyright?: boolean | null
          show_faq_link?: boolean | null
          show_footer?: boolean | null
          show_gift_cards_link?: boolean | null
          show_help_section?: boolean | null
          show_ideal?: boolean | null
          show_legal_link?: boolean | null
          show_mastercard?: boolean | null
          show_newsletter?: boolean | null
          show_payment_methods?: boolean | null
          show_paypal?: boolean | null
          show_privacy_link?: boolean | null
          show_quick_links?: boolean | null
          show_quote_link?: boolean | null
          show_social_icons?: boolean | null
          show_terms_link?: boolean | null
          show_visa?: boolean | null
          social_facebook?: string | null
          social_icon_color?: string | null
          social_icon_size?: number | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_tiktok?: string | null
          social_twitter?: string | null
          social_youtube?: string | null
          text_color?: string | null
          text_font_size?: number | null
          title_font_size?: number | null
          title_font_weight?: string | null
          updated_at?: string
        }
        Update: {
          background_color?: string | null
          border_color?: string | null
          border_top_style?: string | null
          border_top_width?: number | null
          brand_name?: string | null
          brand_tagline?: string | null
          columns_layout?: string | null
          copyright_text?: string | null
          created_at?: string
          help_section_title?: string | null
          id?: string
          link_font_size?: number | null
          newsletter_button_color?: string | null
          newsletter_description?: string | null
          newsletter_placeholder?: string | null
          newsletter_title?: string | null
          padding_bottom?: number | null
          padding_horizontal?: number | null
          padding_top?: number | null
          payment_methods_title?: string | null
          quick_links_title?: string | null
          section_gap?: number | null
          show_bancontact?: boolean | null
          show_blog_link?: boolean | null
          show_brand_section?: boolean | null
          show_catalog_link?: boolean | null
          show_cookies_link?: boolean | null
          show_copyright?: boolean | null
          show_faq_link?: boolean | null
          show_footer?: boolean | null
          show_gift_cards_link?: boolean | null
          show_help_section?: boolean | null
          show_ideal?: boolean | null
          show_legal_link?: boolean | null
          show_mastercard?: boolean | null
          show_newsletter?: boolean | null
          show_payment_methods?: boolean | null
          show_paypal?: boolean | null
          show_privacy_link?: boolean | null
          show_quick_links?: boolean | null
          show_quote_link?: boolean | null
          show_social_icons?: boolean | null
          show_terms_link?: boolean | null
          show_visa?: boolean | null
          social_facebook?: string | null
          social_icon_color?: string | null
          social_icon_size?: number | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_tiktok?: string | null
          social_twitter?: string | null
          social_youtube?: string | null
          text_color?: string | null
          text_font_size?: number | null
          title_font_size?: number | null
          title_font_weight?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      gallery_items: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_published: boolean
          media_type: string
          media_url: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_published?: boolean
          media_type: string
          media_url: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_published?: boolean
          media_type?: string
          media_url?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gift_cards: {
        Row: {
          code: string
          created_at: string | null
          current_balance: number
          deleted_at: string | null
          expires_at: string | null
          id: string
          initial_amount: number
          is_active: boolean | null
          message: string | null
          recipient_email: string
          sender_name: string | null
          tax_enabled: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_balance: number
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          initial_amount: number
          is_active?: boolean | null
          message?: string | null
          recipient_email: string
          sender_name?: string | null
          tax_enabled?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_balance?: number
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          initial_amount?: number
          is_active?: boolean | null
          message?: string | null
          recipient_email?: string
          sender_name?: string | null
          tax_enabled?: boolean | null
        }
        Relationships: []
      }
      homepage_banners: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          display_style: string | null
          height: string | null
          id: string
          image_url: string
          is_active: boolean | null
          link_url: string | null
          page_section: string | null
          position_order: number | null
          size_mode: string | null
          text_color: string | null
          title: string
          title_color: string | null
          updated_at: string | null
          video_url: string | null
          width: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          display_style?: string | null
          height?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link_url?: string | null
          page_section?: string | null
          position_order?: number | null
          size_mode?: string | null
          text_color?: string | null
          title: string
          title_color?: string | null
          updated_at?: string | null
          video_url?: string | null
          width?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          display_style?: string | null
          height?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_url?: string | null
          page_section?: string | null
          position_order?: number | null
          size_mode?: string | null
          text_color?: string | null
          title?: string
          title_color?: string | null
          updated_at?: string | null
          video_url?: string | null
          width?: string | null
        }
        Relationships: []
      }
      homepage_features: {
        Row: {
          created_at: string | null
          description: string
          display_order: number | null
          icon_name: string
          id: string
          is_active: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          display_order?: number | null
          icon_name: string
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          display_order?: number | null
          icon_name?: string
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      homepage_quick_access_cards: {
        Row: {
          button_text: string
          button_url: string
          created_at: string | null
          description: string
          display_order: number | null
          icon_name: string
          id: string
          is_active: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          button_text: string
          button_url: string
          created_at?: string | null
          description: string
          display_order?: number | null
          icon_name: string
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          button_text?: string
          button_url?: string
          created_at?: string | null
          description?: string
          display_order?: number | null
          icon_name?: string
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      homepage_sections: {
        Row: {
          background_color: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          icon_name: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          section_key: string
          subtitle: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          background_color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          section_key: string
          subtitle?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          background_color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          section_key?: string
          subtitle?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          invoice_id: string
          product_id: string | null
          product_name: string
          quantity: number
          tax_enabled: boolean | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          tax_enabled?: boolean | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          tax_enabled?: boolean | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          coupon_code: string | null
          coupon_discount: number | null
          created_at: string | null
          deleted_at: string | null
          discount: number | null
          due_date: string | null
          gift_card_amount: number | null
          gift_card_code: string | null
          id: string
          invoice_number: string
          issue_date: string | null
          notes: string | null
          order_id: string | null
          payment_method: string | null
          payment_status: string | null
          quote_id: string | null
          shipping: number | null
          subtotal: number
          tax: number | null
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          coupon_code?: string | null
          coupon_discount?: number | null
          created_at?: string | null
          deleted_at?: string | null
          discount?: number | null
          due_date?: string | null
          gift_card_amount?: number | null
          gift_card_code?: string | null
          id?: string
          invoice_number: string
          issue_date?: string | null
          notes?: string | null
          order_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          quote_id?: string | null
          shipping?: number | null
          subtotal: number
          tax?: number | null
          total: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          coupon_code?: string | null
          coupon_discount?: number | null
          created_at?: string | null
          deleted_at?: string | null
          discount?: number | null
          due_date?: string | null
          gift_card_amount?: number | null
          gift_card_code?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string | null
          notes?: string | null
          order_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          quote_id?: string | null
          shipping?: number | null
          subtotal?: number
          tax?: number | null
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_pages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_published: boolean | null
          page_type: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          page_type: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          page_type?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      loyalty_adjustments: {
        Row: {
          admin_id: string | null
          created_at: string
          id: string
          points_change: number
          reason: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          id?: string
          points_change: number
          reason: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          id?: string
          points_change?: number
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_adjustments_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_adjustments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_points: {
        Row: {
          created_at: string | null
          id: string
          lifetime_points: number
          points_balance: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lifetime_points?: number
          points_balance?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lifetime_points?: number
          points_balance?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      loyalty_redemptions: {
        Row: {
          coupon_code: string | null
          created_at: string
          expires_at: string | null
          id: string
          points_spent: number
          reward_id: string
          status: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          points_spent: number
          reward_id: string
          status?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          points_spent?: number
          reward_id?: string
          status?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "loyalty_rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          is_active: boolean | null
          name: string
          points_required: number
          reward_type: string
          reward_value: number
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          points_required: number
          reward_type: string
          reward_value: number
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points_required?: number
          reward_type?: string
          reward_value?: number
        }
        Relationships: []
      }
      loyalty_settings: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean
          points_per_dollar: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean
          points_per_dollar?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean
          points_per_dollar?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      material_colors: {
        Row: {
          color_id: string
          created_at: string | null
          id: string
          material_id: string
        }
        Insert: {
          color_id: string
          created_at?: string | null
          id?: string
          material_id: string
        }
        Update: {
          color_id?: string
          created_at?: string | null
          id?: string
          material_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_colors_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_colors_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          cost: number | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachments: Json | null
          created_at: string | null
          id: string
          is_admin_message: boolean | null
          is_read: boolean | null
          message: string
          parent_message_id: string | null
          sender_email: string
          sender_name: string
          subject: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          is_admin_message?: boolean | null
          is_read?: boolean | null
          message: string
          parent_message_id?: string | null
          sender_email: string
          sender_name: string
          subject?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          is_admin_message?: boolean | null
          is_read?: boolean | null
          message?: string
          parent_message_id?: string | null
          sender_email?: string
          sender_name?: string
          subject?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          is_read: boolean | null
          language: string | null
          link: string | null
          message: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_read?: boolean | null
          language?: string | null
          link?: string | null
          message: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_read?: boolean | null
          language?: string | null
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          custom_text: string | null
          customization_selections: Json | null
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          selected_color: string | null
          selected_material: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          custom_text?: string | null
          customization_selections?: Json | null
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          selected_color?: string | null
          selected_material?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          custom_text?: string | null
          customization_selections?: Json | null
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          selected_color?: string | null
          selected_material?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_selected_color_fkey"
            columns: ["selected_color"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_selected_material_fkey"
            columns: ["selected_material"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      order_statuses: {
        Row: {
          color: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          billing_address: string | null
          created_at: string | null
          deleted_at: string | null
          discount: number | null
          id: string
          notes: string | null
          order_number: string
          payment_method: string | null
          payment_status: string | null
          shipping: number | null
          shipping_address: string | null
          status_id: string | null
          subtotal: number
          tax: number | null
          total: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          billing_address?: string | null
          created_at?: string | null
          deleted_at?: string | null
          discount?: number | null
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_status?: string | null
          shipping?: number | null
          shipping_address?: string | null
          status_id?: string | null
          subtotal: number
          tax?: number | null
          total: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          billing_address?: string | null
          created_at?: string | null
          deleted_at?: string | null
          discount?: number | null
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_status?: string | null
          shipping?: number | null
          shipping_address?: string | null
          status_id?: string | null
          subtotal?: number
          tax?: number | null
          total?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "order_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      page_builder_elements: {
        Row: {
          content: Json | null
          created_at: string | null
          display_order: number | null
          element_type: string
          id: string
          is_visible: boolean | null
          section_id: string
          styles: Json | null
          updated_at: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          display_order?: number | null
          element_type: string
          id?: string
          is_visible?: boolean | null
          section_id: string
          styles?: Json | null
          updated_at?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          display_order?: number | null
          element_type?: string
          id?: string
          is_visible?: boolean | null
          section_id?: string
          styles?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_builder_elements_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "page_builder_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      page_builder_history: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          new_state: Json | null
          page_id: string
          previous_state: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          new_state?: Json | null
          page_id: string
          previous_state?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_state?: Json | null
          page_id?: string
          previous_state?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_builder_history_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "page_builder_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      page_builder_pages: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_enabled: boolean | null
          page_key: string
          page_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          page_key: string
          page_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          page_key?: string
          page_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      page_builder_sections: {
        Row: {
          content: Json | null
          created_at: string | null
          display_order: number | null
          id: string
          is_visible: boolean | null
          page_id: string
          section_name: string
          section_type: string
          settings: Json | null
          styles: Json | null
          updated_at: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_visible?: boolean | null
          page_id: string
          section_name: string
          section_type: string
          settings?: Json | null
          styles?: Json | null
          updated_at?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_visible?: boolean | null
          page_id?: string
          section_name?: string
          section_type?: string
          settings?: Json | null
          styles?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_builder_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "page_builder_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      page_builder_templates: {
        Row: {
          category: string | null
          config: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          preview_image: string | null
          template_name: string
          template_type: string
        }
        Insert: {
          category?: string | null
          config: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          preview_image?: string | null
          template_name: string
          template_type: string
        }
        Update: {
          category?: string | null
          config?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          preview_image?: string | null
          template_name?: string
          template_type?: string
        }
        Relationships: []
      }
      pages: {
        Row: {
          content: string
          created_at: string | null
          deleted_at: string | null
          id: string
          is_published: boolean | null
          meta_description: string | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_published?: boolean | null
          meta_description?: string | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_published?: boolean | null
          meta_description?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      preview_3d_models: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          model_type: string
          name: string
          updated_at: string | null
          vertices_data: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          model_type: string
          name: string
          updated_at?: string | null
          vertices_data: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          model_type?: string
          name?: string
          updated_at?: string | null
          vertices_data?: Json
        }
        Relationships: []
      }
      printing_calculator_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      product_colors: {
        Row: {
          color_id: string
          id: string
          product_id: string
        }
        Insert: {
          color_id: string
          id?: string
          product_id: string
        }
        Update: {
          color_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_colors_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_colors_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_customization_sections: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_required: boolean | null
          product_id: string
          section_name: string
          section_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_required?: boolean | null
          product_id: string
          section_name: string
          section_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_required?: boolean | null
          product_id?: string
          section_name?: string
          section_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_customization_sections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          product_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          product_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_materials: {
        Row: {
          id: string
          material_id: string
          product_id: string
        }
        Insert: {
          id?: string
          material_id: string
          product_id: string
        }
        Update: {
          id?: string
          material_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_materials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_roles: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          role: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_roles_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_section_colors: {
        Row: {
          color_id: string
          created_at: string
          id: string
          section_id: string
        }
        Insert: {
          color_id: string
          created_at?: string
          id?: string
          section_id: string
        }
        Update: {
          color_id?: string
          created_at?: string
          id?: string
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_section_colors_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_section_colors_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "product_customization_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      product_section_images: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          image_name: string
          image_url: string
          section_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_name: string
          image_url: string
          section_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_name?: string
          image_url?: string
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_section_images_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "product_customization_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      product_shipping_rates: {
        Row: {
          country_code: string | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          product_id: string | null
          shipping_cost: number
        }
        Insert: {
          country_code?: string | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          product_id?: string | null
          shipping_cost: number
        }
        Update: {
          country_code?: string | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          product_id?: string | null
          shipping_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_shipping_rates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allow_direct_purchase: boolean | null
          allow_quote_request: boolean | null
          category_id: string | null
          created_at: string | null
          custom_shipping_cost: number | null
          deleted_at: string | null
          description: string | null
          enable_color_selection: boolean | null
          enable_custom_text: boolean | null
          enable_material_selection: boolean | null
          height: number | null
          id: string
          length: number | null
          name: string
          price: number | null
          product_code: string | null
          shipping_type: string | null
          stock: number | null
          tax_enabled: boolean | null
          updated_at: string | null
          video_url: string | null
          visible_to_all: boolean | null
          weight: number | null
          width: number | null
        }
        Insert: {
          allow_direct_purchase?: boolean | null
          allow_quote_request?: boolean | null
          category_id?: string | null
          created_at?: string | null
          custom_shipping_cost?: number | null
          deleted_at?: string | null
          description?: string | null
          enable_color_selection?: boolean | null
          enable_custom_text?: boolean | null
          enable_material_selection?: boolean | null
          height?: number | null
          id?: string
          length?: number | null
          name: string
          price?: number | null
          product_code?: string | null
          shipping_type?: string | null
          stock?: number | null
          tax_enabled?: boolean | null
          updated_at?: string | null
          video_url?: string | null
          visible_to_all?: boolean | null
          weight?: number | null
          width?: number | null
        }
        Update: {
          allow_direct_purchase?: boolean | null
          allow_quote_request?: boolean | null
          category_id?: string | null
          created_at?: string | null
          custom_shipping_cost?: number | null
          deleted_at?: string | null
          description?: string | null
          enable_color_selection?: boolean | null
          enable_custom_text?: boolean | null
          enable_material_selection?: boolean | null
          height?: number | null
          id?: string
          length?: number | null
          name?: string
          price?: number | null
          product_code?: string | null
          shipping_type?: string | null
          stock?: number | null
          tax_enabled?: boolean | null
          updated_at?: string | null
          video_url?: string | null
          visible_to_all?: boolean | null
          weight?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          admin_pin: string | null
          blocked_at: string | null
          blocked_reason: string | null
          city: string | null
          country: string | null
          created_at: string | null
          current_page: string | null
          email: string | null
          full_name: string | null
          id: string
          is_blocked: boolean | null
          is_online: boolean | null
          last_activity_at: string | null
          last_sign_in_at: string | null
          phone: string | null
          postal_code: string | null
          preferred_language: string | null
          reviews_blocked: boolean | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          admin_pin?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          current_page?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_blocked?: boolean | null
          is_online?: boolean | null
          last_activity_at?: string | null
          last_sign_in_at?: string | null
          phone?: string | null
          postal_code?: string | null
          preferred_language?: string | null
          reviews_blocked?: boolean | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          admin_pin?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          current_page?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_blocked?: boolean | null
          is_online?: boolean | null
          last_activity_at?: string | null
          last_sign_in_at?: string | null
          phone?: string | null
          postal_code?: string | null
          preferred_language?: string | null
          reviews_blocked?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quantity_discount_tiers: {
        Row: {
          created_at: string
          discount_type: string
          discount_value: number
          display_order: number | null
          id: string
          is_active: boolean
          max_quantity: number | null
          min_quantity: number
          tier_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          discount_type: string
          discount_value: number
          display_order?: number | null
          id?: string
          is_active?: boolean
          max_quantity?: number | null
          min_quantity: number
          tier_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          discount_type?: string
          discount_value?: number
          display_order?: number | null
          id?: string
          is_active?: boolean
          max_quantity?: number | null
          min_quantity?: number
          tier_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      quote_statuses: {
        Row: {
          color: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          name: string
          slug: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          slug?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          slug?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          address: string | null
          calculated_material_cost: number | null
          calculated_time_estimate: number | null
          calculated_volume: number | null
          calculated_weight: number | null
          calculation_details: Json | null
          city: string | null
          color_id: string | null
          country: string | null
          created_at: string | null
          custom_text: string | null
          customer_email: string
          customer_name: string
          deleted_at: string | null
          description: string | null
          estimated_price: number | null
          file_storage_path: string | null
          file_url: string | null
          gallery_reference_id: string | null
          id: string
          layer_height: number | null
          let_team_decide_layer: boolean | null
          let_team_decide_supports: boolean | null
          material_id: string | null
          phone: string | null
          postal_code: string | null
          product_id: string | null
          quantity: number | null
          quote_type: string
          service_attachments: Json | null
          shipping_cost: number | null
          shipping_zone: string | null
          status_id: string | null
          supports_required: boolean | null
          tax_enabled: boolean
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          calculated_material_cost?: number | null
          calculated_time_estimate?: number | null
          calculated_volume?: number | null
          calculated_weight?: number | null
          calculation_details?: Json | null
          city?: string | null
          color_id?: string | null
          country?: string | null
          created_at?: string | null
          custom_text?: string | null
          customer_email: string
          customer_name: string
          deleted_at?: string | null
          description?: string | null
          estimated_price?: number | null
          file_storage_path?: string | null
          file_url?: string | null
          gallery_reference_id?: string | null
          id?: string
          layer_height?: number | null
          let_team_decide_layer?: boolean | null
          let_team_decide_supports?: boolean | null
          material_id?: string | null
          phone?: string | null
          postal_code?: string | null
          product_id?: string | null
          quantity?: number | null
          quote_type: string
          service_attachments?: Json | null
          shipping_cost?: number | null
          shipping_zone?: string | null
          status_id?: string | null
          supports_required?: boolean | null
          tax_enabled?: boolean
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          calculated_material_cost?: number | null
          calculated_time_estimate?: number | null
          calculated_volume?: number | null
          calculated_weight?: number | null
          calculation_details?: Json | null
          city?: string | null
          color_id?: string | null
          country?: string | null
          created_at?: string | null
          custom_text?: string | null
          customer_email?: string
          customer_name?: string
          deleted_at?: string | null
          description?: string | null
          estimated_price?: number | null
          file_storage_path?: string | null
          file_url?: string | null
          gallery_reference_id?: string | null
          id?: string
          layer_height?: number | null
          let_team_decide_layer?: boolean | null
          let_team_decide_supports?: boolean | null
          material_id?: string | null
          phone?: string | null
          postal_code?: string | null
          product_id?: string | null
          quantity?: number | null
          quote_type?: string
          service_attachments?: Json | null
          shipping_cost?: number | null
          shipping_zone?: string | null
          status_id?: string | null
          supports_required?: boolean | null
          tax_enabled?: boolean
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_gallery_reference_id_fkey"
            columns: ["gallery_reference_id"]
            isOneToOne: false
            referencedRelation: "gallery_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "quote_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          is_approved: boolean | null
          product_id: string
          rating: number
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          product_id: string
          rating: number
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          product_id?: string
          rating?: number
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_audit_log: {
        Row: {
          audit_type: string
          created_at: string | null
          details: Json | null
          id: string
          message: string
          page_path: string | null
          recommendations: string[] | null
          score: number | null
          status: string
        }
        Insert: {
          audit_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          message: string
          page_path?: string | null
          recommendations?: string[] | null
          score?: number | null
          status: string
        }
        Update: {
          audit_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          message?: string
          page_path?: string | null
          recommendations?: string[] | null
          score?: number | null
          status?: string
        }
        Relationships: []
      }
      seo_keywords: {
        Row: {
          auto_generated: boolean | null
          competition_level: string | null
          created_at: string | null
          current_ranking: number | null
          id: string
          is_active: boolean | null
          keyword: string
          keyword_type: string | null
          language: string | null
          relevance_score: number | null
          search_volume: number | null
          search_volume_estimate: string | null
          source_id: string | null
          source_type: string
          target_ranking: number | null
          updated_at: string | null
        }
        Insert: {
          auto_generated?: boolean | null
          competition_level?: string | null
          created_at?: string | null
          current_ranking?: number | null
          id?: string
          is_active?: boolean | null
          keyword: string
          keyword_type?: string | null
          language?: string | null
          relevance_score?: number | null
          search_volume?: number | null
          search_volume_estimate?: string | null
          source_id?: string | null
          source_type: string
          target_ranking?: number | null
          updated_at?: string | null
        }
        Update: {
          auto_generated?: boolean | null
          competition_level?: string | null
          created_at?: string | null
          current_ranking?: number | null
          id?: string
          is_active?: boolean | null
          keyword?: string
          keyword_type?: string | null
          language?: string | null
          relevance_score?: number | null
          search_volume?: number | null
          search_volume_estimate?: string | null
          source_id?: string | null
          source_type?: string
          target_ranking?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      seo_meta_tags: {
        Row: {
          canonical_url: string | null
          created_at: string | null
          id: string
          keywords: string[] | null
          meta_description: string
          nofollow: boolean | null
          noindex: boolean | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          og_type: string | null
          page_path: string
          page_title: string
          twitter_description: string | null
          twitter_image: string | null
          twitter_title: string | null
          updated_at: string | null
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string | null
          id?: string
          keywords?: string[] | null
          meta_description: string
          nofollow?: boolean | null
          noindex?: boolean | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          og_type?: string | null
          page_path: string
          page_title: string
          twitter_description?: string | null
          twitter_image?: string | null
          twitter_title?: string | null
          updated_at?: string | null
        }
        Update: {
          canonical_url?: string | null
          created_at?: string | null
          id?: string
          keywords?: string[] | null
          meta_description?: string
          nofollow?: boolean | null
          noindex?: boolean | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          og_type?: string | null
          page_path?: string
          page_title?: string
          twitter_description?: string | null
          twitter_image?: string | null
          twitter_title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      seo_redirects: {
        Row: {
          created_at: string | null
          from_path: string
          id: string
          is_active: boolean | null
          redirect_type: number | null
          to_path: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          from_path: string
          id?: string
          is_active?: boolean | null
          redirect_type?: number | null
          to_path: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          from_path?: string
          id?: string
          is_active?: boolean | null
          redirect_type?: number | null
          to_path?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      seo_settings: {
        Row: {
          auto_generate_keywords: boolean | null
          auto_generate_meta_descriptions: boolean | null
          bing_site_verification: string | null
          canonical_domain: string | null
          created_at: string | null
          facebook_app_id: string | null
          favicon_url: string | null
          google_analytics_id: string | null
          google_site_verification: string | null
          id: string
          og_image: string | null
          site_description: string
          site_keywords: string[] | null
          site_title: string
          twitter_handle: string | null
          updated_at: string | null
          yandex_verification: string | null
        }
        Insert: {
          auto_generate_keywords?: boolean | null
          auto_generate_meta_descriptions?: boolean | null
          bing_site_verification?: string | null
          canonical_domain?: string | null
          created_at?: string | null
          facebook_app_id?: string | null
          favicon_url?: string | null
          google_analytics_id?: string | null
          google_site_verification?: string | null
          id?: string
          og_image?: string | null
          site_description?: string
          site_keywords?: string[] | null
          site_title?: string
          twitter_handle?: string | null
          updated_at?: string | null
          yandex_verification?: string | null
        }
        Update: {
          auto_generate_keywords?: boolean | null
          auto_generate_meta_descriptions?: boolean | null
          bing_site_verification?: string | null
          canonical_domain?: string | null
          created_at?: string | null
          facebook_app_id?: string | null
          favicon_url?: string | null
          google_analytics_id?: string | null
          google_site_verification?: string | null
          id?: string
          og_image?: string | null
          site_description?: string
          site_keywords?: string[] | null
          site_title?: string
          twitter_handle?: string | null
          updated_at?: string | null
          yandex_verification?: string | null
        }
        Relationships: []
      }
      shipping_countries: {
        Row: {
          country_code: string
          country_name: string
          created_at: string | null
          id: string
          is_enabled: boolean | null
          shipping_cost: number | null
        }
        Insert: {
          country_code: string
          country_name: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          shipping_cost?: number | null
        }
        Update: {
          country_code?: string
          country_name?: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          shipping_cost?: number | null
        }
        Relationships: []
      }
      shipping_postal_codes: {
        Row: {
          applies_to_products: boolean | null
          applies_to_quotes: boolean | null
          country_code: string
          created_at: string | null
          id: string
          is_enabled: boolean | null
          postal_code: string
          quotes_shipping_cost: number | null
          shipping_cost: number
        }
        Insert: {
          applies_to_products?: boolean | null
          applies_to_quotes?: boolean | null
          country_code: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          postal_code: string
          quotes_shipping_cost?: number | null
          shipping_cost: number
        }
        Update: {
          applies_to_products?: boolean | null
          applies_to_quotes?: boolean | null
          country_code?: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          postal_code?: string
          quotes_shipping_cost?: number | null
          shipping_cost?: number
        }
        Relationships: []
      }
      shipping_settings: {
        Row: {
          created_at: string | null
          default_shipping_cost: number | null
          enable_shipping_for_quotes: boolean | null
          free_shipping_products_only: boolean | null
          free_shipping_threshold: number | null
          id: string
          is_enabled: boolean | null
          quotes_default_shipping_cost: number | null
          quotes_free_shipping_threshold: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_shipping_cost?: number | null
          enable_shipping_for_quotes?: boolean | null
          free_shipping_products_only?: boolean | null
          free_shipping_threshold?: number | null
          id?: string
          is_enabled?: boolean | null
          quotes_default_shipping_cost?: number | null
          quotes_free_shipping_threshold?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_shipping_cost?: number | null
          enable_shipping_for_quotes?: boolean | null
          free_shipping_products_only?: boolean | null
          free_shipping_threshold?: number | null
          id?: string
          is_enabled?: boolean | null
          quotes_default_shipping_cost?: number | null
          quotes_free_shipping_threshold?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shipping_zones: {
        Row: {
          applies_to_products: boolean | null
          applies_to_quotes: boolean | null
          base_cost: number
          cost_per_kg: number
          country: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean | null
          minimum_cost: number | null
          postal_code_prefix: string
          quotes_base_cost: number | null
          quotes_cost_per_kg: number | null
          quotes_minimum_cost: number | null
          updated_at: string
          zone_name: string
        }
        Insert: {
          applies_to_products?: boolean | null
          applies_to_quotes?: boolean | null
          base_cost?: number
          cost_per_kg?: number
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean | null
          minimum_cost?: number | null
          postal_code_prefix: string
          quotes_base_cost?: number | null
          quotes_cost_per_kg?: number | null
          quotes_minimum_cost?: number | null
          updated_at?: string
          zone_name: string
        }
        Update: {
          applies_to_products?: boolean | null
          applies_to_quotes?: boolean | null
          base_cost?: number
          cost_per_kg?: number
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean | null
          minimum_cost?: number | null
          postal_code_prefix?: string
          quotes_base_cost?: number | null
          quotes_cost_per_kg?: number | null
          quotes_minimum_cost?: number | null
          updated_at?: string
          zone_name?: string
        }
        Relationships: []
      }
      site_customization: {
        Row: {
          admin_sidebar_active_bg: string | null
          admin_sidebar_bg: string | null
          background_color: string | null
          base_font_size: string | null
          border_radius: string | null
          button_style: string | null
          card_bg_color: string | null
          company_address: string | null
          company_name: string
          company_phone: string | null
          company_tax_id: string | null
          company_website: string | null
          copyright_text: string
          created_at: string | null
          favicon_url: string | null
          font_body: string | null
          font_heading: string | null
          header_bg_color: string | null
          header_text_color: string | null
          heading_size_h1: string | null
          heading_size_h2: string | null
          heading_size_h3: string | null
          home_hero_bg_color: string | null
          home_menu_bg_color: string | null
          home_menu_hover_bg_color: string | null
          home_menu_text_color: string | null
          id: string
          legal_email: string | null
          logo_dark_url: string | null
          logo_url: string | null
          navbar_color: string
          og_image: string | null
          primary_color: string
          secondary_color: string
          selected_palette: string | null
          sidebar_active_bg_color: string | null
          sidebar_bg_color: string | null
          sidebar_label_size: string | null
          sidebar_text_color: string | null
          site_name: string
          social_facebook: string | null
          social_instagram: string | null
          social_linkedin: string | null
          social_tiktok: string | null
          social_twitter: string | null
          social_youtube: string | null
          text_color_dark: string
          text_color_light: string
          theme_preset: string | null
          updated_at: string | null
        }
        Insert: {
          admin_sidebar_active_bg?: string | null
          admin_sidebar_bg?: string | null
          background_color?: string | null
          base_font_size?: string | null
          border_radius?: string | null
          button_style?: string | null
          card_bg_color?: string | null
          company_address?: string | null
          company_name?: string
          company_phone?: string | null
          company_tax_id?: string | null
          company_website?: string | null
          copyright_text?: string
          created_at?: string | null
          favicon_url?: string | null
          font_body?: string | null
          font_heading?: string | null
          header_bg_color?: string | null
          header_text_color?: string | null
          heading_size_h1?: string | null
          heading_size_h2?: string | null
          heading_size_h3?: string | null
          home_hero_bg_color?: string | null
          home_menu_bg_color?: string | null
          home_menu_hover_bg_color?: string | null
          home_menu_text_color?: string | null
          id?: string
          legal_email?: string | null
          logo_dark_url?: string | null
          logo_url?: string | null
          navbar_color?: string
          og_image?: string | null
          primary_color?: string
          secondary_color?: string
          selected_palette?: string | null
          sidebar_active_bg_color?: string | null
          sidebar_bg_color?: string | null
          sidebar_label_size?: string | null
          sidebar_text_color?: string | null
          site_name?: string
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_tiktok?: string | null
          social_twitter?: string | null
          social_youtube?: string | null
          text_color_dark?: string
          text_color_light?: string
          theme_preset?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_sidebar_active_bg?: string | null
          admin_sidebar_bg?: string | null
          background_color?: string | null
          base_font_size?: string | null
          border_radius?: string | null
          button_style?: string | null
          card_bg_color?: string | null
          company_address?: string | null
          company_name?: string
          company_phone?: string | null
          company_tax_id?: string | null
          company_website?: string | null
          copyright_text?: string
          created_at?: string | null
          favicon_url?: string | null
          font_body?: string | null
          font_heading?: string | null
          header_bg_color?: string | null
          header_text_color?: string | null
          heading_size_h1?: string | null
          heading_size_h2?: string | null
          heading_size_h3?: string | null
          home_hero_bg_color?: string | null
          home_menu_bg_color?: string | null
          home_menu_hover_bg_color?: string | null
          home_menu_text_color?: string | null
          id?: string
          legal_email?: string | null
          logo_dark_url?: string | null
          logo_url?: string | null
          navbar_color?: string
          og_image?: string | null
          primary_color?: string
          secondary_color?: string
          selected_palette?: string | null
          sidebar_active_bg_color?: string | null
          sidebar_bg_color?: string | null
          sidebar_label_size?: string | null
          sidebar_text_color?: string | null
          site_name?: string
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_tiktok?: string | null
          social_twitter?: string | null
          social_youtube?: string | null
          text_color_dark?: string
          text_color_light?: string
          theme_preset?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_group: string | null
          setting_key: string
          setting_value: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_group?: string | null
          setting_key: string
          setting_value: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_group?: string | null
          setting_key?: string
          setting_value?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      support_detection_settings: {
        Row: {
          created_at: string
          detection_mode: string
          enable_bridging_detection: boolean
          enable_length_analysis: boolean
          high_confidence_threshold: number
          id: string
          material_risk_abs: number
          material_risk_petg: number
          material_risk_pla: number
          max_bridging_distance: number
          medium_confidence_threshold: number
          min_support_area_percent: number
          overhang_angle_threshold: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          detection_mode?: string
          enable_bridging_detection?: boolean
          enable_length_analysis?: boolean
          high_confidence_threshold?: number
          id?: string
          material_risk_abs?: number
          material_risk_petg?: number
          material_risk_pla?: number
          max_bridging_distance?: number
          medium_confidence_threshold?: number
          min_support_area_percent?: number
          overhang_angle_threshold?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          detection_mode?: string
          enable_bridging_detection?: boolean
          enable_length_analysis?: boolean
          high_confidence_threshold?: number
          id?: string
          material_risk_abs?: number
          material_risk_petg?: number
          material_risk_pla?: number
          max_bridging_distance?: number
          medium_confidence_threshold?: number
          min_support_area_percent?: number
          overhang_angle_threshold?: number
          updated_at?: string
        }
        Relationships: []
      }
      tax_settings: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          tax_name: string
          tax_rate: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          tax_name?: string
          tax_rate?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          tax_name?: string
          tax_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      translation_queue: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          error_message: string | null
          field_name: string
          id: string
          processed_at: string | null
          source_language: string | null
          status: string | null
          target_languages: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          error_message?: string | null
          field_name: string
          id?: string
          processed_at?: string | null
          source_language?: string | null
          status?: string | null
          target_languages?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          error_message?: string | null
          field_name?: string
          id?: string
          processed_at?: string | null
          source_language?: string | null
          status?: string | null
          target_languages?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      translation_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      translations: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          field_name: string
          id: string
          is_auto_translated: boolean | null
          language: string
          reviewed_by: string | null
          translated_text: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          field_name: string
          id?: string
          is_auto_translated?: boolean | null
          language: string
          reviewed_by?: string | null
          translated_text: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          field_name?: string
          id?: string
          is_auto_translated?: boolean | null
          language?: string
          reviewed_by?: string | null
          translated_text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      visitor_sessions: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          deleted_at: string | null
          device_type: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_seen_at: string
          os: string | null
          page_path: string | null
          session_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_seen_at?: string
          os?: string | null
          page_path?: string | null
          session_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_seen_at?: string
          os?: string | null
          page_path?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_loyalty_points_manual: {
        Args: {
          p_admin_id: string
          p_points_change: number
          p_reason: string
          p_user_id: string
        }
        Returns: undefined
      }
      award_loyalty_points: {
        Args: { p_order_amount: number; p_order_id: string; p_user_id: string }
        Returns: undefined
      }
      calculate_backup_expiration: {
        Args: { p_estimated_size_mb?: number; p_table_name: string }
        Returns: string
      }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_max_requests: number
          p_user_id: string
          p_window_minutes: number
        }
        Returns: boolean
      }
      cleanup_expired_backups: {
        Args: never
        Returns: {
          deleted_count: number
          table_name: string
        }[]
      }
      cleanup_expired_checkout_sessions: { Args: never; Returns: undefined }
      cleanup_inactive_sessions: { Args: never; Returns: undefined }
      cleanup_inactive_visitor_sessions: { Args: never; Returns: undefined }
      cleanup_low_quality_keywords: { Args: never; Returns: number }
      detect_device_type: { Args: { user_agent: string }; Returns: string }
      enqueue_all_page_builder_sections: { Args: never; Returns: number }
      enqueue_all_translatable_content: { Args: never; Returns: number }
      find_best_calibration_profile: {
        Args: {
          p_geometry_class: string
          p_layer_height: number
          p_material_id: string
          p_size_category: string
          p_supports_enabled: boolean
        }
        Returns: {
          confidence: string
          material_factor: number
          profile_id: string
          time_factor: number
        }[]
      }
      generate_blog_keywords: { Args: never; Returns: undefined }
      generate_gift_card_code: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_meta_tags_automatically: { Args: never; Returns: number }
      generate_next_invoice_number: { Args: never; Returns: string }
      generate_order_number: { Args: never; Returns: string }
      generate_product_code: { Args: never; Returns: string }
      generate_product_keywords: { Args: never; Returns: undefined }
      generate_product_keywords_optimized: { Args: never; Returns: undefined }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      mark_user_offline: { Args: { user_id_param: string }; Returns: undefined }
      notify_admins_async: {
        Args: {
          p_customer_email?: string
          p_customer_name?: string
          p_link?: string
          p_message: string
          p_order_number?: string
          p_subject: string
          p_type: string
        }
        Returns: undefined
      }
      notify_all_admins: {
        Args: {
          p_link?: string
          p_message: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      queue_page_builder_section_translation_manual: {
        Args: { p_section_id: string }
        Returns: undefined
      }
      redeem_loyalty_reward: {
        Args: { p_reward_id: string; p_user_id: string }
        Returns: string
      }
      regenerate_product_keywords: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      remove_loyalty_points: {
        Args: { p_order_amount: number; p_order_id: string; p_user_id: string }
        Returns: undefined
      }
      restore_with_metadata: {
        Args: { p_record_id: string; p_table_name: string }
        Returns: boolean
      }
      send_invoice_email_async: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      send_loyalty_points_email_async: {
        Args: {
          p_available_coupons: Json
          p_email: string
          p_name: string
          p_points_earned: number
          p_total_points: number
          p_user_id: string
        }
        Returns: undefined
      }
      send_notification: {
        Args: {
          p_link?: string
          p_message: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      send_notification_email_http: {
        Args: {
          p_link?: string
          p_message: string
          p_subject: string
          p_to: string
        }
        Returns: undefined
      }
      send_order_email_async: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      send_order_status_email_async: {
        Args: { p_new_status: string; p_old_status: string; p_order_id: string }
        Returns: undefined
      }
      send_quote_confirmation_http: {
        Args: { p_quote_id: string }
        Returns: undefined
      }
      send_quote_email_async: {
        Args: { p_quote_id: string }
        Returns: undefined
      }
      send_quote_update_email_async:
        | { Args: { p_quote_id: string }; Returns: undefined }
        | {
            Args: { p_estimated_price: number; p_quote_id: string }
            Returns: undefined
          }
      send_welcome_email_http: {
        Args: { user_email: string; user_name?: string }
        Returns: undefined
      }
      update_user_activity: {
        Args: { page_path?: string; user_id_param: string }
        Returns: undefined
      }
      verify_admin_pin: { Args: { pin_input: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "client" | "moderator"
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
    Enums: {
      app_role: ["admin", "client", "moderator"],
    },
  },
} as const
