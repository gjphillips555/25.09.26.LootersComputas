import { useState } from "react";
import { startPayPalConnect } from "@/lib/marketplace/start-paypal-connect";
import { isPayPalConnected, type ProfileRow } from "@/lib/marketplace/profile";

export function ConnectPayPalButton({
  profile,
  onConnected,
}: {
  profile: ProfileRow | null;
  onConnected?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isPayPalConnected(profile)) {
    return (
      <div className="rounded-lg border border-green-600/40 bg-green-950/30 px-4 py-3 text-sm">
        <div className="font-medium text-green-400">PayPal connected</div>
        <div className="text-muted-foreground mt-1">
          {profile?.paypal_email}
          {profile?.paypal_verified ? " · verified" : ""}
        </div>
      </div>
    );
  }

  async function handleConnect() {
    setLoading(true);
    setError(null);
    try {
      const { url } = await startPayPalConnect();
      // Full page redirect into PayPal
      window.location.href = url;
    } catch (e: any) {
      setError(e?.message || "Could not start PayPal connection");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleConnect}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-[#0070ba] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#005ea6] disabled:opacity-60"
      >
        {loading ? "Redirecting…" : "Connect PayPal"}
      </button>
      <p className="text-xs text-muted-foreground max-w-sm">
        Required before you can create listings or make offers / swaps.
        We only receive confirmation that the account is yours — we never
        handle your money.
      </p>
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
