/**
 * Player Profile Route - /profile
 *
 * Redirects to /dashboard/profile for editing your own profile
 * This route exists for backwards compatibility and cleaner URLs
 */

import { redirect } from "next/navigation";

export default function ProfilePage() {
  // Redirect to dashboard profile (edit your own profile)
  redirect("/dashboard/profile");
}
