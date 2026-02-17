/**
 * Captain Verification Redirect
 * Verification has moved to league-sites. This page informs users
 * and will be removed once all existing verification links expire.
 */
export default function CaptainVerificationPage() {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Verification Has Moved</h2>
        <p className="text-neutral-400">
          Game verification is now handled through your league&apos;s website.
          Please contact your scorekeeper or league admin for a new verification link.
        </p>
      </div>
    </div>
  );
}
