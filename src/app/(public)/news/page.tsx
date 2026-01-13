import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAllArticles } from "@/lib/admin/article-actions";

export default async function NewsPage() {
  const { articles } = await getAllArticles();
  const publishedArticles = articles.filter(a => a.published).sort((a, b) => 
    new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime()
  );

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

      {publishedArticles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No articles published yet. Check back soon!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {publishedArticles.map((article) => (
            <Card key={article.id} className="hover:border-canada-red/50 transition-colors">
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
