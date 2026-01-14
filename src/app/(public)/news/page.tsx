"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAllArticles } from "@/lib/admin/article-actions";
import { useEffect } from "react";

export default function NewsPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadArticles() {
      const result = await getAllArticles();
      if (result.articles) {
        const published = result.articles.filter(a => a.published).sort((a, b) => 
          new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime()
        );
        setArticles(published);
      }
      setLoading(false);
    }
    loadArticles();
  }, []);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "game_recap":
        return <Badge className="bg-canada-red">Game Recap</Badge>;
      case "weekly_wrap":
        return <Badge className="bg-rink-blue">Weekly Wrap</Badge>;
      case "draft_grades":
        return <Badge className="bg-gold text-puck-black">Draft Grades</Badge>;
      default:
        return <Badge variant="outline">Announcement</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2">
            <span className="text-foreground">League </span>
            <span className="text-canada-red">News</span>
          </h1>
          <p className="text-muted-foreground">
            Game recaps, weekly wraps, and league announcements
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading articles...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2">
          <span className="text-foreground">League </span>
          <span className="text-canada-red">News</span>
        </h1>
        <p className="text-muted-foreground">
          Game recaps, weekly wraps, and league announcements
        </p>
      </div>

      {articles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No articles published yet. Check back soon!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {articles.map((article) => (
            <Card 
              key={article.id} 
              className="hover:border-canada-red/50 transition-colors cursor-pointer"
              onClick={() => setSelectedArticle(article)}
            >
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  {getTypeBadge(article.type)}
                  <span className="text-sm text-muted-foreground">
                    {new Date(article.published_at || article.created_at).toLocaleDateString("en-CA", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <CardTitle className="text-2xl">{article.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-invert max-w-none">
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {article.content.length > 500 
                      ? article.content.substring(0, 500) + "..."
                      : article.content}
                  </p>
                  {article.content.length > 500 && (
                    <p className="text-canada-red mt-2 font-medium cursor-pointer hover:underline">
                      Read more →
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedArticle(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedArticle && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between mb-2">
                  {getTypeBadge(selectedArticle.type)}
                  <span className="text-sm text-muted-foreground">
                    {new Date(selectedArticle.published_at || selectedArticle.created_at).toLocaleDateString("en-CA", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <DialogTitle className="text-3xl">{selectedArticle.title}</DialogTitle>
              </DialogHeader>
              <DialogDescription asChild>
                <div className="prose prose-invert max-w-none mt-4">
                  <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                    {selectedArticle.content}
                  </div>
                </div>
              </DialogDescription>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
