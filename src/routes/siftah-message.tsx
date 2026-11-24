import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Old messenger page. Siftah Message now lives in the pop-up chat window: send visitors home with
 * ?chat=messages and the chat head opens itself on the Messages (Online + DMs) tab.
 */
export const Route = createFileRoute("/siftah-message")({
  beforeLoad: () => {
    throw redirect({ href: "/?chat=messages", statusCode: 302 });
  },
  component: () => null,
});
