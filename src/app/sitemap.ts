import { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 3600; // Revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const supabase = await createClient();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/rules`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/standings`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/schedule`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/stats`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/teams`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/news`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];

  // Get all teams
  const { data: teams } = await supabase
    .from("teams")
    .select("id, updated_at")
    .order("name");

  const teamPages: MetadataRoute.Sitemap =
    teams?.map((team) => ({
      url: `${baseUrl}/teams/${team.id}`,
      lastModified: team.updated_at ? new Date(team.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })) || [];

  // Get all players
  const { data: players } = await supabase
    .from("profiles")
    .select("id, updated_at")
    .eq("role", "player")
    .order("full_name");

  const playerPages: MetadataRoute.Sitemap =
    players?.map((player) => ({
      url: `${baseUrl}/stats/${player.id}`,
      lastModified: player.updated_at ? new Date(player.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })) || [];

  return [...staticPages, ...teamPages, ...playerPages];
}
