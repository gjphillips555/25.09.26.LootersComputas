import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/termsandconditions")({
  component: TermsPage,
  head: () => ({
    meta: [{ title: "Terms and Conditions · Looters Computas" }],
  }),
});

function TermsPage() {
  return (
    <LegalPage title="Terms and Conditions" updated="3 November 2026">
      <p>
        These Terms and Conditions (“Terms”) govern your access to and use of
        Looters Computas at looterscomputas.online (the “Site”), including the
        marketplace, member accounts and Siftah AI workspace (“we”, “us”, “our”).
        By creating an account or using member-only services, you confirm that
        you have read and agree to these Terms and our{" "}
        <a href="/storepolicy">Store Policy</a>. If you do not agree, please
        do not use the Site or purchase from us.
      </p>

      <h2>1. Who we are</h2>
      <p>
        Looters Computas is a New Zealand technology marketplace where members
        can list, browse, buy, sell and arrange swaps of computers, electronics,
        gaming equipment and related goods. We may also offer our own products.
        We provide the platform and are not automatically the seller of goods
        listed by members. Enquiries:{" "}
        <a href="mailto:LootersRetail@protonmail.com">
          LootersRetail@protonmail.com
        </a>
        .
      </p>

      <h2>2. Marketplace listings, sales and payments</h2>
      <p>
        Prices are displayed in New Zealand dollars (NZD). Listings may be
        posted by individual members or by Looters Computas. Unless a listing
        or checkout clearly identifies Looters Computas as the seller, a sale
        or swap is an arrangement directly between the buyer and the member
        seller. The seller is responsible for the accuracy and legality of the
        listing, ownership of the item, condition, delivery and fulfilment.
      </p>
      <p>
        Members may arrange direct payments using PayPal. Unless a checkout
        expressly says otherwise, Looters Computas does not receive or hold
        member-to-member funds, provide escrow, or guarantee payment, delivery
        or the condition of an item. PayPal transactions are subject to
        PayPal's own terms and buyer or seller protections. Check the item and
        seller details before agreeing to a deal or sending payment.
      </p>
      <p>
        For products sold by Looters Computas, a contract is formed when we
        accept your order and payment is successfully received. Product
        descriptions and photographs are provided in good faith. Refurbished
        goods may show cosmetic wear consistent with prior use. Shipping and
        delivery estimates are shown at checkout; you must supply accurate
        delivery details.
      </p>

      <h2>3. Consumer guarantees (New Zealand)</h2>
      <p>
        Nothing in these Terms limits rights under the Consumer Guarantees Act
        1993 or the Fair Trading Act 1986 where those laws apply. The rights
        and obligations for a member-to-member sale depend on whether the
        member seller is acting in trade and the circumstances of the sale.
        Member sellers are responsible for meeting their own legal obligations.
      </p>

      <h2>4. Terms of signing up to Looters Computas</h2>
      <p>
        A Looters account is required to open full listing pages, place orders,
        sell items and use member-only marketplace features. Visitors who are
        not signed in may browse public listing thumbnails only. Siftah also
        offers a limited guest trial without an account. You may register with
        Google or an email address, including Proton Mail.
      </p>
      <p>
        By creating an account, or by signing in with Google or another
        identity provider, you confirm that:
      </p>
      <ul>
        <li>you are at least 18 years of age;</li>
        <li>
          the information associated with that account (name and email) is
          accurate, and you are authorised to use that Google (or other)
          account;
        </li>
        <li>
          you have read and agree to these Terms and to our Store Policy;
        </li>
        <li>
          you will keep your sign-in credentials confidential and notify us
          promptly of any unauthorised use.
        </li>
      </ul>
      <p>
        When you sign in with Google, Google authenticates you and shares with
        us the profile information you permit (typically your name, email
        address and profile photo). We use that information only to identify
        your session, pre-fill checkout where you choose, and communicate about
        your orders. We do not receive or store your Google password.
      </p>
      <p>
        We may suspend or close an account if we reasonably believe these Terms
        have been breached, or if required by law. You may stop using the Site
        at any time. Signing out does not cancel orders already placed.
      </p>

      <h2>5. Siftah and AI tools</h2>
      <p>
        Siftah provides AI chat, coding, image and related creative tools. To
        deliver these features, your prompts, conversation context and any
        images or files you choose to upload may be sent to third-party AI
        processing providers, including Hugging Face, Stable Horde for some
        media-generation requests, and providers made available through those
        services. Those providers process the submitted
        material to generate a response. We may change the providers or
        underlying systems used without changing the Siftah interface.
      </p>
      <p>
        Do not submit passwords, payment-card details, confidential business
        information, sensitive personal information, or private material about
        another person unless you have the right and permission to do so.
        Review the privacy information and terms of any third-party provider
        whose services process your content.
      </p>
      <p>
        AI responses and generated content can be inaccurate, incomplete,
        misleading or unsuitable. You are responsible for checking outputs
        before relying on, publishing, sharing or acting on them. Siftah is not
        a substitute for qualified legal, medical, financial, engineering or
        other professional advice. You remain responsible for how you use
        prompts, outputs, code and generated media, including checking that
        your use does not infringe another person's rights.
      </p>

      <h2>6. Guest trials, Credits and paid access</h2>
      <p>
        Siftah's limited free trial is available in guest mode only. Successful
        chat replies and completed image or video generations count towards the
        guest trial allowance. Once the allowance is used, a five-hour cooldown
        applies before it resets. Trial limits may be adjusted to protect
        availability and prevent abuse. Signing in with a standard member
        account does not create a new free trial or remove a cooldown.
      </p>
      <p>
        Signed-in members can continue using paid Siftah features by purchasing
        Credits through PayPal. The current charge is 2 Credits per completed
        chat response or successful image or video generation. Failed generation
        attempts do not consume Credits or trial uses. Credits are attached to
        the member account that made the purchase,
        cannot be transferred or exchanged for cash, and are subject to
        applicable consumer law and any refund rights that cannot legally be
        excluded. Verified authorised administrators may receive separate
        access privileges.
      </p>

      <h2>7. Responsible AI use</h2>
      <p>
        Some Siftah tools may allow a broader range of creative or technical
        outputs than conventional assistants. That does not authorise misuse.
        You are solely responsible for your use of the tools and must not use
        them to facilitate unlawful activity, fraud, threats, harassment,
        exploitation, privacy violations, infringement, unauthorised access,
        malware or other harm. You must not use AI outputs as a substitute for
        your own legal obligations or to evade applicable safeguards or laws.
      </p>
      <p>
        We may restrict or suspend access where we reasonably believe a user
        has misused Siftah, breached these Terms, created a risk to another
        person, or threatened the security or availability of the Site.
      </p>

      <h2>8. Acceptable use</h2>
      <p>
        You must not misuse the Site, attempt to interfere with its security or
        availability, scrape it in a way that imposes an unreasonable load, or
        use it for any unlawful purpose. Hidden or staff-only areas of the Site
        are not for public use.
      </p>

      <h2>9. Liability</h2>
      <p>
        To the maximum extent permitted by New Zealand law, we are not liable
        for indirect, incidental or consequential loss, or for loss of profit,
        data or business opportunity. Our aggregate liability arising out of
        any order is limited to the amount you paid for the relevant goods.
        This clause does not exclude liability that cannot be excluded by law.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update these Terms from time to time. The version published on
        this page is the current version. Continued use of the Site after a
        change constitutes acceptance of the updated Terms. Material changes
        to warranty or returns are described in the Store Policy.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These Terms are governed by the laws of New Zealand. The New Zealand
        courts have exclusive jurisdiction, except that we may seek injunctive
        relief in any jurisdiction.
      </p>

      <p>
        Questions about these Terms:{" "}
        <a href="mailto:LootersRetail@protonmail.com">
          LootersRetail@protonmail.com
        </a>
        .
      </p>
    </LegalPage>
  );
}
