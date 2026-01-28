import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us - HockeyLifeHL",
  description: "Get in touch with HockeyLifeHL. Have questions about the league? We're here to help!",
  openGraph: {
    title: "Contact Us - HockeyLifeHL",
    description: "Get in touch with HockeyLifeHL. Have questions about the league? We're here to help!",
  },
};

export default function ContactPage() {
  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Contact Us</h1>
        <p className="text-muted-foreground">Get in touch with the HockeyLifeHL team</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>League Administrator</CardTitle>
            <CardDescription>For general inquiries and league information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Email</p>
              <a href="mailto:admin@hockeylifehl.com" className="text-canada-red hover:underline font-medium">
                admin@hockeylifehl.com
              </a>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Response Time</p>
              <p className="text-sm">Usually within 24-48 hours</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Technical Support</CardTitle>
            <CardDescription>Website issues and technical problems</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Email</p>
              <a href="mailto:support@hockeylifehl.com" className="text-canada-red hover:underline font-medium">
                support@hockeylifehl.com
              </a>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">For</p>
              <p className="text-sm">Login issues, stats problems, payment questions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Badge variant="outline">Q</Badge>
              How do I join the league?
            </h3>
            <p className="text-muted-foreground text-sm pl-9">
              New players can sign up when a new season opens. The league administrator will send
              out invitations to previous players and may open registration to new members if there's
              space available.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Badge variant="outline">Q</Badge>
              How do I report an issue with game stats?
            </h3>
            <p className="text-muted-foreground text-sm pl-9">
              If you believe there's an error in your stats, contact your team captain first. They
              can work with the opposing captain to correct any mistakes. For unresolved issues,
              contact the league administrator.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Badge variant="outline">Q</Badge>
              I'm having trouble logging in. What should I do?
            </h3>
            <p className="text-muted-foreground text-sm pl-9">
              First, try using the "Forgot Password" link on the login page. If that doesn't work,
              contact technical support at support@hockeylifehl.com with your registered email address.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Badge variant="outline">Q</Badge>
              Can I change teams?
            </h3>
            <p className="text-muted-foreground text-sm pl-9">
              Teams are redrafted every 13 games, so you'll have a chance to play with different
              teammates regularly. Between draft cycles, team changes are generally not allowed to
              maintain league balance.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Badge variant="outline">Q</Badge>
              How are payments handled?
            </h3>
            <p className="text-muted-foreground text-sm pl-9">
              League fees can be paid online through the website or via cash/e-transfer to the league
              administrator. Payment details are provided when you sign up for a new season.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Other Ways to Connect</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge className="bg-canada-red">📱</Badge>
            <div>
              <p className="font-medium">Team Communication</p>
              <p className="text-sm text-muted-foreground">
                Captains can send messages to their teams through the captain dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-canada-red">📰</Badge>
            <div>
              <p className="font-medium">League News</p>
              <p className="text-sm text-muted-foreground">
                Check the news page for updates, game recaps, and announcements
              </p>
              <Button variant="link" asChild className="px-0 h-auto">
                <Link href="/news">View News →</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 bg-muted/50">
        <CardContent className="py-6 text-center">
          <p className="text-muted-foreground text-sm">
            We aim to respond to all inquiries within 24-48 hours during the hockey season.
            Thank you for being part of the HockeyLifeHL community!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
