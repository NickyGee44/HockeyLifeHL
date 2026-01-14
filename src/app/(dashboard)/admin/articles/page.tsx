"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAllArticles, createArticle, updateArticle, deleteArticle, generateAIArticle } from "@/lib/admin/article-actions";
import { getAllGames } from "@/lib/games/actions";
import { getAllSeasons } from "@/lib/seasons/actions";
import { getCurrentDraft } from "@/lib/draft/actions";
import { toast } from "sonner";
import type { Draft, Season } from "@/types/database";

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "announcement",
    published: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [articlesResult, gamesResult, seasonsResult] = await Promise.all([
      getAllArticles(),
      getAllGames(),
      getAllSeasons(),
    ]);
    
    if (articlesResult.articles) {
      setArticles(articlesResult.articles);
    }
    if (gamesResult.games) {
      setGames(gamesResult.games.filter((g: any) => g.status === "completed"));
    }
    if (seasonsResult.seasons) {
      const activeSeason = (seasonsResult.seasons as Season[]).find(
        (s) => s.status === "active" || s.status === "playoffs"
      );
      if (activeSeason) {
        setSeasons([activeSeason]);
        const draftResult = await getCurrentDraft(activeSeason.id);
        const currentDraft = draftResult?.draft ?? undefined;
        if (currentDraft?.status === "completed") {
          setDraft(currentDraft);
        }
      }
    }
    setLoading(false);
  }

  async function loadArticles() {
    const result = await getAllArticles();
    if (result.articles) {
      setArticles(result.articles);
    }
  }

  async function handleCreate() {
    const form = new FormData();
    form.set("title", formData.title);
    form.set("content", formData.content);
    form.set("type", formData.type);
    form.set("published", formData.published.toString());

    const result = await createArticle(form);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Article created");
      setIsCreateOpen(false);
      setFormData({ title: "", content: "", type: "announcement", published: false });
      loadArticles();
    }
  }

  async function handleUpdate() {
    if (!editingArticle) return;
    
    const form = new FormData();
    form.set("title", formData.title);
    form.set("content", formData.content);
    form.set("published", formData.published.toString());

    const result = await updateArticle(editingArticle.id, form);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Article updated");
      setEditingArticle(null);
      loadArticles();
    }
  }

  async function handleGenerateAI(type: "game_recap" | "draft_grades" | "weekly_wrap", contextId: string) {
    setIsAIGenerating(true);
    const result = await generateAIArticle(type, contextId);
    
    if (result.error) {
      toast.error(result.error);
      setIsAIGenerating(false);
      return;
    }

    // Pre-fill form with generated content
    setFormData({
      title: result.title || "",
      content: result.content || "",
      type: type,
      published: false,
    });
    setIsCreateOpen(true);
    setIsAIGenerating(false);
    toast.success("AI article generated! Review and publish.");
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Articles ✍️</h1>
          <p className="text-muted-foreground mt-2">
            Manage league articles and news
          </p>
        </div>
        <div className="flex gap-2">
          {/* AI Generation Buttons */}
          {games.length > 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={isAIGenerating}>
                  🤖 Generate Game Recap
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Select Game for Recap</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {games.slice(0, 10).map((game: any) => (
                    <Button
                      key={game.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleGenerateAI("game_recap", game.id)}
                      disabled={isAIGenerating}
                    >
                      {game.home_team?.name} vs {game.away_team?.name} - {new Date(game.scheduled_at).toLocaleDateString()}
                    </Button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}
          {draft && (
            <Button
              variant="outline"
              onClick={() => handleGenerateAI("draft_grades", draft.id)}
              disabled={isAIGenerating}
            >
              🤖 Generate Draft Grades
            </Button>
          )}
          {seasons.length > 0 && (
            <Button
              variant="outline"
              onClick={() => handleGenerateAI("weekly_wrap", seasons[0].id)}
              disabled={isAIGenerating}
            >
              🤖 Generate Weekly Wrap
            </Button>
          )}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-canada-red hover:bg-canada-red-dark">
                + New Article
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Article</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="game_recap">Game Recap</SelectItem>
                    <SelectItem value="weekly_wrap">Weekly Wrap</SelectItem>
                    <SelectItem value="draft_grades">Draft Grades</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <textarea
                  className="w-full min-h-[200px] p-2 border rounded"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.published}
                  onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                />
                <Label>Publish immediately</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} className="bg-canada-red hover:bg-canada-red-dark">Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid gap-4">
        {articles.map(article => (
          <Card key={article.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{article.title}</CardTitle>
                  <CardDescription>{article.type}</CardDescription>
                </div>
                <div className="flex gap-2">
                  {article.published ? (
                    <Badge className="bg-green-600">Published</Badge>
                  ) : (
                    <Badge variant="outline">Draft</Badge>
                  )}
                  <Button variant="outline" size="sm" onClick={() => {
                    setEditingArticle(article);
                    setFormData({
                      title: article.title,
                      content: article.content,
                      type: article.type,
                      published: article.published,
                    });
                  }}>Edit</Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Dialog open={!!editingArticle} onOpenChange={() => setEditingArticle(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Article</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <textarea
                className="w-full min-h-[200px] p-2 border rounded"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.published}
                onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
              />
              <Label>Published</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingArticle(null)}>Cancel</Button>
            <Button onClick={handleUpdate} className="bg-canada-red hover:bg-canada-red-dark">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
