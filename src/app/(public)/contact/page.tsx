import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="mb-2">
            <span className="text-foreground">Contact </span>
            <span className="text-canada-red">Us</span>
          </h1>
          <p className="text-muted-foreground">
            Get in touch with HockeyLifeHL
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>
              Have questions? We&apos;re here to help!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">League Administration</h3>
              <p className="text-muted-foreground">
                For questions about league operations, player registration, payments, 
                or general inquiries, please contact the league owner through your 
                dashboard or email.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Technical Support</h3>
              <p className="text-muted-foreground">
                Experiencing issues with the website or app? Contact the league owner 
                for technical support.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Game-Related Questions</h3>
              <p className="text-muted-foreground">
                For questions about games, schedules, or stats, contact your team captain 
                or the league owner.
              </p>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-4">
                If you&apos;re a registered player, you can access your dashboard to 
                view contact information and send messages.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button className="bg-canada-red hover:bg-canada-red-dark" asChild>
                  <Link href="/register">Join League</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
