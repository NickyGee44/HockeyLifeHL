import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="mb-2">
            <span className="text-foreground">Terms of </span>
            <span className="text-canada-red">Service</span>
          </h1>
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Terms of Service</CardTitle>
            <CardDescription>
              Rules and guidelines for using HockeyLifeHL
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Acceptance of Terms</h3>
              <p className="text-muted-foreground">
                By accessing and using HockeyLifeHL, you agree to be bound by these 
                Terms of Service and all applicable laws and regulations.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">User Accounts</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>You are responsible for maintaining the security of your account</li>
                <li>You must provide accurate and complete information</li>
                <li>You are responsible for all activities under your account</li>
                <li>One account per player - sharing accounts is prohibited</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">League Participation</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>All players must be registered and have paid league fees</li>
                <li>Players must follow league rules and regulations</li>
                <li>Unsportsmanlike conduct may result in suspension or removal</li>
                <li>League decisions are final</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Payment Terms</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>League fees must be paid by the specified deadline</li>
                <li>Refunds are at the discretion of the league owner</li>
                <li>Payment processing is handled securely through Stripe</li>
                <li>Failure to pay may result in removal from the league</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Content and Data</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Game statistics and player data are property of the league</li>
                <li>You grant the league permission to use your statistics publicly</li>
                <li>AI-generated content may include your name and performance data</li>
                <li>Do not attempt to manipulate or falsify statistics</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Prohibited Activities</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Hacking, tampering, or attempting to access unauthorized areas</li>
                <li>Falsifying statistics or game data</li>
                <li>Harassing or abusing other players</li>
                <li>Violating any applicable laws or regulations</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Limitation of Liability</h3>
              <p className="text-muted-foreground">
                HockeyLifeHL is provided &quot;as is&quot; without warranties. The league 
                is not responsible for injuries, damages, or losses incurred during 
                participation. Players participate at their own risk.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Changes to Terms</h3>
              <p className="text-muted-foreground">
                We reserve the right to modify these terms at any time. Continued use 
                of the service after changes constitutes acceptance of the new terms.
              </p>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                If you have questions about these terms, please{" "}
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
