import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { BrandTicker } from "@/components/brand-ticker";
import { CategoryNav } from "@/components/category-nav";
import { ProductGrid } from "@/components/product-grid";
import { RefineBar } from "@/components/refine-bar";
import { ShopSearch } from "@/components/shop-search";
import {
  productInCategory,
  SHOP_CATEGORIES,
  useProductSearch,
  type ShopCategoryId,
} from "@/lib/product-search";
import type { Catalog } from "@/lib/products";

export function ShopCatalog({
  catalog,
  category,
}: {
  catalog: Catalog;
  category: ShopCategoryId;
}) {
  const setCategory = useProductSearch((s) => s.setCategory);

  // Keep search-store category aligned with the URL so filters don't fight the route.
  useEffect(() => {
    setCategory(category);
  }, [category, setCategory]);

  const label =
    SHOP_CATEGORIES.find((c) => c.id === category)?.label ?? "All products";

  if (category === "gift-cards") {
    return (
      <AppShell>
        <BrandTicker />
        <CategoryNav />
        <h1 className="mb-3 mt-2 font-display text-xl font-semibold">{label}</h1>
        <p className="py-24 text-center text-lg text-muted-foreground">Coming soon.</p>
      </AppShell>
    );
  }

  const products = catalog.products.filter((p) =>
    productInCategory(p, category),
  );

  return (
    <AppShell>
      <BrandTicker />
      <CategoryNav />
      <div className="mb-3 mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-xl font-semibold">{label}</h1>
        <ShopSearch className="w-full sm:max-w-md" variant="plain" />
      </div>
      {category === "digital" ? (
        <p className="mb-3 max-w-2xl text-sm text-muted-foreground">
          Emailed after you pay. Third-party digital licences, not a Microsoft shop box and not Microsoft 365. Full refund if the key will not activate.
        </p>
      ) : null}
      <RefineBar products={products} />
      <ProductGrid
        key={category}
        products={products}
        error={catalog.error}
        category={category}
        layout="grid"
      />
    </AppShell>
  );
}
