import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const baseUrl = "https://thuis3d.com"; // Update with actual domain
    const currentDate = new Date().toISOString().split("T")[0];

    // Fetch all products with their top keywords
    const { data: products } = await supabaseClient
      .from("products")
      .select("id, name, slug, updated_at")
      .is("deleted_at", null);

    // Fetch top keywords for each product
    const productsWithKeywords = await Promise.all(
      (products || []).map(async (product) => {
        const { data: keywords } = await supabaseClient
          .from("seo_keywords")
          .select("keyword")
          .eq("source_type", "product")
          .eq("source_id", product.id)
          .eq("is_active", true)
          .order("relevance_score", { ascending: false })
          .limit(5);
        
        return {
          ...product,
          keywords: keywords?.map(k => k.keyword).join(", ") || ""
        };
      })
    );

    // Fetch all blog posts
    const { data: blogPosts } = await supabaseClient
      .from("blog_posts")
      .select("id, slug, updated_at")
      .eq("is_published", true)
      .is("deleted_at", null);

    // Fetch all pages
    const { data: pages } = await supabaseClient
      .from("pages")
      .select("id, slug, updated_at")
      .eq("is_published", true)
      .is("deleted_at", null);

    // Build sitemap XML
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  
  <!-- Main Pages -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/products</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/blog</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/quotes</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/gift-card</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;

    // Add products with keywords
    if (productsWithKeywords) {
      for (const product of productsWithKeywords) {
        const lastmod = product.updated_at ? new Date(product.updated_at).toISOString().split("T")[0] : currentDate;
        sitemap += `
  <url>
    <loc>${baseUrl}/product/${product.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>${product.keywords ? `
    <!-- Keywords: ${product.keywords} -->` : ''}
  </url>`;
      }
    }

    // Add blog posts
    if (blogPosts) {
      for (const post of blogPosts) {
        const lastmod = post.updated_at ? new Date(post.updated_at).toISOString().split("T")[0] : currentDate;
        sitemap += `
  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
      }
    }

    // Add custom pages
    if (pages) {
      for (const page of pages) {
        const lastmod = page.updated_at ? new Date(page.updated_at).toISOString().split("T")[0] : currentDate;
        sitemap += `
  <url>
    <loc>${baseUrl}/page/${page.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`;
      }
    }

    sitemap += `
</urlset>`;

    // Log audit
    await supabaseClient.from("seo_audit_log").insert({
      audit_type: "sitemap",
      status: "success",
      message: "Sitemap generado exitosamente",
      details: {
        products_count: products?.length || 0,
        blog_posts_count: blogPosts?.length || 0,
        pages_count: pages?.length || 0,
      },
    });

    return new Response(sitemap, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml",
      },
    });
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});