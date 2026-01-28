"use client";

/**
 * Design Settings Component
 *
 * Handles template selection and customization for league design settings.
 * Allows league owners/admins to:
 * - View current template
 * - Change template with live preview
 * - Customize colors (preset or custom)
 * - Reset to template defaults
 *
 * @since 2026-01-28
 * @agent Agent 1
 * @task Task 4.3 from ENHANCED_SIGNUP_IMPLEMENTATION_PLAN.md
 */

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Palette, RotateCcw, Check, Info, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { getAllTemplates, setLeagueTemplate, resetLeagueTemplate } from "@/lib/templates/actions";
import type { SiteTemplate, TemplateCustomization } from "@/types/site-templates";
import dynamic from "next/dynamic";

// Import components dynamically (these are created by other agents)
const TemplateSelector = dynamic(() =>
  import("@/components/signup/TemplateSelector").then((mod) => ({
    default: mod.TemplateSelector,
  })),
  { ssr: false }
);
const TemplatePreview = dynamic(() =>
  import("@/components/signup/TemplatePreview").then((mod) => ({
    default: mod.TemplatePreview,
  })),
  { ssr: false }
);

interface DesignSettingsProps {
  leagueId: string;
  currentTemplate: SiteTemplate | null;
  currentCustomizations: TemplateCustomization;
}

export function DesignSettings({
  leagueId,
  currentTemplate,
  currentCustomizations,
}: DesignSettingsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // State
  const [templates, setTemplates] = useState<SiteTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<SiteTemplate | null>(currentTemplate);
  const [customizations, setCustomizations] = useState<TemplateCustomization>(currentCustomizations);
  const [isChangeDialogOpen, setIsChangeDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load available templates
  useEffect(() => {
    const loadTemplates = async () => {
      const result = await getAllTemplates();
      if (result.success && result.data) {
        setTemplates(result.data);
      }
    };
    loadTemplates();
  }, []);

  // Handle template selection in dialog
  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
    }
  };

  // Apply template change
  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;

    setError(null);
    setSuccess(null);
    setIsLoading(true);

    const result = await setLeagueTemplate(leagueId, selectedTemplate.id, customizations);

    setIsLoading(false);

    if (result.success) {
      setSuccess("Template updated successfully!");
      setIsChangeDialogOpen(false);

      // Refresh the page to show new template
      startTransition(() => {
        router.refresh();
      });

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || "Failed to update template");
    }
  };

  // Reset to default template
  const handleReset = async () => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    const result = await resetLeagueTemplate(leagueId);

    setIsLoading(false);
    setIsResetDialogOpen(false);

    if (result.success) {
      setSuccess("Template reset to defaults!");
      setCustomizations({});

      // Refresh the page
      startTransition(() => {
        router.refresh();
      });

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || "Failed to reset template");
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Alert */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">{success}</AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Current Template Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Template</CardTitle>
              <CardDescription>
                {currentTemplate
                  ? "Your league is using a custom template design"
                  : "No template selected yet"}
              </CardDescription>
            </div>
            {currentTemplate && (
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                Active
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentTemplate ? (
            <>
              {/* Template Info */}
              <div className="flex items-start gap-4">
                {currentTemplate.preview_image_url && (
                  <div className="w-48 h-27 rounded-lg overflow-hidden border bg-muted flex-shrink-0">
                    <img
                      src={currentTemplate.preview_image_url}
                      alt={currentTemplate.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <h3 className="text-lg font-semibold">{currentTemplate.name}</h3>
                  <p className="text-sm text-muted-foreground">{currentTemplate.description}</p>

                  {/* Color Presets */}
                  {currentTemplate.config.colorPresets && currentTemplate.config.colorPresets.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Available presets:</span>
                      {currentTemplate.config.colorPresets.slice(0, 3).map((preset, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <div
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: preset.primary }}
                          />
                          <span className="text-xs">{preset.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={() => setIsChangeDialogOpen(true)} variant="outline">
                  <Palette className="h-4 w-4 mr-2" />
                  Change Template
                </Button>
                <Button onClick={() => setIsResetDialogOpen(true)} variant="ghost" size="sm">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* No Template State */}
              <div className="text-center py-8 space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Palette className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-medium">No Template Selected</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose a professional template to customize your league's appearance
                  </p>
                </div>
                <Button onClick={() => setIsChangeDialogOpen(true)}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Choose Template
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 space-y-1">
              <p className="font-medium">About Site Templates</p>
              <p>
                Templates control the overall look and feel of your league site including layout,
                colors, typography, and component styles. You can fine-tune colors in the Branding
                settings after selecting a template.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Template Dialog */}
      <Dialog open={isChangeDialogOpen} onOpenChange={setIsChangeDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose a Template</DialogTitle>
            <DialogDescription>
              Select a template design for your league site. You can preview each template before
              applying it.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="select" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="select">Select Template</TabsTrigger>
              <TabsTrigger value="preview" disabled={!selectedTemplate}>
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="select" className="space-y-4 mt-4">
              {templates.length > 0 ? (
                <TemplateSelector
                  templates={templates}
                  selectedTemplateId={selectedTemplate?.id || null}
                  onSelect={handleTemplateSelect}
                  showFeaturedBadge={true}
                  columns={2}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Loading templates...
                </div>
              )}
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              {selectedTemplate && (
                <div className="space-y-4">
                  <TemplatePreview
                    template={selectedTemplate}
                    customizations={customizations}
                    leagueName="Your League"
                    tagline="Preview Mode"
                    showDeviceToggle={true}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsChangeDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleApplyTemplate} disabled={!selectedTemplate || isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isLoading ? "Applying..." : "Apply Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Template to Defaults?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all custom color settings and restore the template's default appearance.
              You can customize it again at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isLoading ? "Resetting..." : "Reset to Defaults"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
