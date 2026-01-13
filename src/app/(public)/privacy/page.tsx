import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="mb-2">
            <span className="text-foreground">Privacy </span>
            <span className="text-canada-red">Policy</span>
          </h1>
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Privacy Policy</CardTitle>
            <CardDescription>
              How we collect, use, and protect your information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Information We Collect</h3>
              <p className="text-muted-foreground mb-2">
                We collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Name, email address, and contact information</li>
                <li>Player information (jersey number, position)</li>
                <li>Game statistics and performance data</li>
                <li>Payment information (processed securely through Stripe)</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">How We Use Your Information</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>To manage league operations and player rosters</li>
                <li>To track game statistics and standings</li>
                <li>To communicate with you about league activities</li>
                <li>To process payments for league fees</li>
                <li>To generate league content and articles</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Data Security</h3>
              <p className="text-muted-foreground">
                We use industry-standard security measures to protect your information. 
                All data is stored securely using Supabase, and payment information 
                is processed through Stripe&apos;s secure payment system.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Public Information</h3>
              <p className="text-muted-foreground">
                Player names, statistics, and team information are displayed publicly 
                on the website as part of league operations. This information is 
                necessary for the league to function and is visible to all users.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Your Rights</h3>
              <p className="text-muted-foreground">
                You have the right to access, update, or delete your personal information. 
                Contact the league owner through your dashboard to make changes to your account.
              </p>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                If you have questions about this privacy policy, please{" "}
                <a href="/contact" className="text-canada-red hover:underline">
                  contact us
                </a>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
