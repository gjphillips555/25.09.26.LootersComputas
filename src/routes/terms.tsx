import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/terms')({
  component: TermsPage,
})

function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 prose prose-invert">
      <h1 className="text-3xl font-bold text-orange-400 mb-6">
        Terms & Conditions — Looters Computas Marketplace
      </h1>

      <p className="text-sm text-muted-foreground mb-8">
        Last updated: 31 October 2026
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-purple-300 mb-3">1. Platform Role</h2>
        <p>
          Looters Computas provides a marketplace platform that allows users to list, browse,
          and arrange the sale, purchase, or swap of computer parts and related goods.
        </p>
        <p className="mt-3 font-medium text-orange-300">
          We are not a party to any transaction. We do not handle payments, take possession of
          goods, or guarantee any deal between users.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-purple-300 mb-3">2. Payments</h2>
        <p>
          All payments and transfers of value are arranged directly between users via PayPal,
          Skrill, or other methods they agree on. The platform never receives, holds, or
          processes funds on behalf of users.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-purple-300 mb-3">3. Swaps / Trade Offers</h2>
        <p>
          Users may submit swap (trade) offers against a listing. These offers (including any
          photos and descriptions of the items being offered) are visible only to the owner of
          the original listing. Acceptance of a swap is at the sole discretion of the listing
          owner.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-purple-300 mb-3">4. Content & Conduct</h2>
        <p>
          Users are solely responsible for everything they post, list, offer, or message on
          the platform. This includes the accuracy of descriptions, the condition of goods,
          images, and any claims made.
        </p>
        <p className="mt-3">
          <strong>Looters Computas accepts no responsibility for any content, listings,
          offers, messages, or transactions that occur on the platform.</strong>
        </p>
        <p className="mt-3">
          As administrators we will do our best to maintain and upkeep a safe and professional
          trading platform. We reserve the right to remove listings, suspend accounts, or take
          other action if we become aware of illegal, fraudulent, abusive, or otherwise
          harmful activity.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-purple-300 mb-3">5. No Warranty</h2>
        <p>
          The platform is provided “as is”. We make no warranties regarding the quality,
          safety, legality, or availability of any goods or services offered by users.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-purple-300 mb-3">6. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by New Zealand law, Looters Computas and its
          operators shall not be liable for any loss, damage, or dispute arising from the use
          of this marketplace or from any transaction between users.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-purple-300 mb-3">7. Changes</h2>
        <p>
          We may update these terms from time to time. Continued use of the platform after
          changes constitutes acceptance of the revised terms.
        </p>
      </section>

      <p className="mt-12 text-sm text-muted-foreground">
        By creating an account or using the marketplace you agree to these terms.
      </p>
    </div>
  )
}
