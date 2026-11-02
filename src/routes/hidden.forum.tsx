import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { denApprove, denForum, denMe } from "@/lib/den";
import { authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/hidden/forum")({
  component: DenForum,
  head: () => ({
    meta: [{ title: "den" }],
  }),
});

function DenForum() {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [data, setData] = useState<Awaited<ReturnType<typeof denForum>> | null>(
    null,
  );
  const [me, setMe] = useState<Awaited<ReturnType<typeof denMe>> | null>(null);

  async function reload() {
    const [who, board] = await Promise.all([denMe(), denForum()]);
    setMe(who);
    setData(board);
    if (who.role === "none") void navigate({ to: "/hidden" });
  }

  useEffect(() => {
    if (user) void reload();
  }, [user]);

  if (authEnabled && (isPending || !user)) {
    return (
      <main className="den-shell">
        <div className="den-card">
          <h1>Sign in to continue</h1>
          <p>Use your Looters Computas account before entering this member area.</p>
          <a href="/login?callbackURL=%2Fhidden%2Fforum">Sign in / Create account</a>
        </div>
      </main>
    );
  }

  if (!me || !data) {
    return <main className="den-shell">loading…</main>;
  }

  if (me.role === "user" && me.user?.status !== "approved") {
    return (
      <main className="den-shell">
        <div className="den-card">
          <h1>Entrant</h1>
          <p>
            You are in the waiting room. You cannot view the den until Looters
            approves you in their DMs.
          </p>
          <p className="den-hint">Status: {me.user?.status}</p>
          <Link to="/">back to the shop</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="den-shell den-forum">
      <div className="den-card den-wide">
        <h1>Den</h1>
        {data.role === "admin" ? (
          <section>
            <h2>DMs · approve</h2>
            <ul className="den-pending">
              {data.pending.map((u) => (
                <li key={u.id}>
                  <span>
                    {u.username} · {u.email} · {u.status}
                  </span>
                  {u.status === "entrant" ? (
                    <span className="den-actions">
                      <button
                        type="button"
                        onClick={async () => {
                          await denApprove({ data: { id: u.id, allow: true } });
                          await reload();
                        }}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await denApprove({ data: { id: u.id, allow: false } });
                          await reload();
                        }}
                      >
                        Reject
                      </button>
                    </span>
                  ) : (
                    <em>waiting on letter</em>
                  )}
                </li>
              ))}
              {data.pending.length === 0 ? <li>No DMs.</li> : null}
            </ul>
          </section>
        ) : null}
        <section>
          <h2>Board</h2>
          <ul className="den-board">
            {data.dms.map((m) => (
              <li key={m.id}>
                <b>{m.author}</b>
                <span>{new Date(m.created_at).toLocaleString("en-NZ")}</span>
                <p>{m.body}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
