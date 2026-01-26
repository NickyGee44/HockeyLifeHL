import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAllCustomDomains } from "@/lib/admin/domain-verification";

/**
 * Admin Domains Overview Page
 * Lists all custom domains across all leagues
 */
export default async function AdminDomainsPage() {
  const result = await getAllCustomDomains();

  if (result.error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Domain Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage custom domains across all leagues
          </p>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {result.error}
            </p>
            <Button asChild>
              <Link href="/admin/domains">
                Try Again
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const domains = result.domains || [];
  const verifiedCount = domains.filter(d => d.verified).length;
  const pendingCount = domains.filter(d => !d.verified).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Domain Management</h1>
          <p className="text-muted-foreground mt-2">
            {domains.length} custom {domains.length === 1 ? 'domain' : 'domains'} configured
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/leagues">
            Back to Leagues
          </Link>
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Domains</CardDescription>
            <CardTitle className="text-3xl">{domains.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Custom domains configured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Verified</CardDescription>
            <CardTitle className="text-3xl text-green-600">{verifiedCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              DNS verified and active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{pendingCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Awaiting DNS verification
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Domains Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Custom Domains</CardTitle>
          <CardDescription>
            Manage custom domain configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {domains.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                No custom domains configured yet
              </p>
              <Button asChild variant="outline">
                <Link href="/admin/leagues">Configure a Domain</Link>
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>League</TableHead>
                    <TableHead>Subdomain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {domains.map((domain) => (
                    <TableRow key={domain.leagueId}>
                      <TableCell className="font-medium">
                        {domain.domain}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/leagues/${domain.leagueId}`}
                          className="hover:underline"
                        >
                          {domain.leagueName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {domain.subdomain}.beerleaguehockey.ca
                      </TableCell>
                      <TableCell>
                        {domain.verified ? (
                          <Badge className="bg-green-600">✓ Verified</Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600">
                            ⏳ Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/leagues/${domain.leagueId}/domain`}>
                            Configure
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information */}
      <Card>
        <CardHeader>
          <CardTitle>Domain Verification Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Badge className="bg-green-600">✓ Verified</Badge>
              <span>DNS Verified & Active</span>
            </h4>
            <p className="text-sm text-muted-foreground">
              Domain has been verified and is actively serving the league instance.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Badge variant="outline" className="text-yellow-600">⏳ Pending</Badge>
              <span>Awaiting Verification</span>
            </h4>
            <p className="text-sm text-muted-foreground">
              Domain has been configured but DNS verification is pending. League owner needs to add the required DNS records.
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Note:</strong> DNS verification typically takes 5-60 minutes but can take up to 48 hours in some cases.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
