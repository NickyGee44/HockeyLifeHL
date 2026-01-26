"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function StepBranding() {
  const { register, watch } = useFormContext();
  const primaryColor = watch("primaryColor") || "#E31837";
  const secondaryColor = watch("secondaryColor") || "#0066CC";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding & Colors</CardTitle>
        <CardDescription>
          Make it yours. Choose your league&apos;s primary and secondary colors.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex gap-2">
              <Input 
                id="primaryColor" 
                type="color" 
                className="w-12 h-12 p-1 cursor-pointer"
                {...register("primaryColor")}
              />
              <Input 
                type="text" 
                placeholder="#E31837" 
                value={primaryColor}
                readOnly
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondaryColor">Secondary Color</Label>
            <div className="flex gap-2">
              <Input 
                id="secondaryColor" 
                type="color" 
                className="w-12 h-12 p-1 cursor-pointer"
                {...register("secondaryColor")}
              />
              <Input 
                type="text" 
                placeholder="#0066CC" 
                value={secondaryColor}
                readOnly
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="slogan">League Slogan (Optional)</Label>
          <Input 
            id="slogan" 
            placeholder="For Fun, For Beers, For Glory" 
            {...register("slogan")}
          />
        </div>

        {/* Live Preview */}
        <div className="mt-8 p-6 rounded-lg border border-border" style={{ backgroundColor: 'var(--background)' }}>
          <p className="text-sm font-medium text-muted-foreground mb-4">Preview</p>
          <div className="flex flex-col items-center gap-4 text-center">
            <div 
              className="h-16 w-16 rounded-full flex items-center justify-center font-bold text-white text-xl shadow-lg"
              style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
            >
              Logo
            </div>
            <div>
              <h3 className="text-lg font-bold" style={{ color: primaryColor }}>League Name</h3>
              <p className="text-sm text-muted-foreground">League Slogan</p>
            </div>
            <button 
              className="px-4 py-2 rounded-md text-white text-sm font-medium transition-transform hover:scale-105"
              style={{ backgroundColor: primaryColor }}
            >
              Join League
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
