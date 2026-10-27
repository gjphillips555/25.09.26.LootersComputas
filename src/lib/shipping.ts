export type ShippableLine = {
  id: string;
  title: string;
  qty: number;
  shippingId: string;
  shipping: { id: string; price: number; label: string }[];
};

export function packagesForItems(itemCount: number) {
  if (itemCount <= 0) return 0;
  return Math.ceil(itemCount / 3);
}

export function lineShippingPrice(line: ShippableLine): number | null {
  if (line.shipping.length === 0) return 0;
  if (!line.shippingId) return null;
  const ship = line.shipping.find((s) => s.id === line.shippingId);
  return ship ? ship.price : null;
}

export function packingQuote(lines: ShippableLine[]) {
  const slots: { title: string; price: number }[] = [];
  let digitalCount = 0;
  for (const line of lines) {
    if (line.shipping.length === 0) {
      digitalCount += line.qty;
      continue;
    }
    const price = lineShippingPrice(line);
    if (price === null) {
      return {
        ready: false as const,
        itemCount: lines.reduce((n, l) => n + l.qty, 0),
        packages: 0,
        shippingTotal: 0,
        charged: [] as { title: string; price: number }[],
      };
    }
    if (price === 0) {
      digitalCount += line.qty;
      continue;
    }
    for (let i = 0; i < line.qty; i += 1) {
      slots.push({ title: line.title, price });
    }
  }
  const packages = packagesForItems(slots.length);
  slots.sort((a, b) => b.price - a.price);
  const charged = slots.slice(0, packages);
  const shippingTotal = charged.reduce((n, s) => n + s.price, 0);
  return {
    ready: true as const,
    itemCount: slots.length + digitalCount,
    packages,
    shippingTotal,
    charged,
  };
}

export function packingLabel(itemCount: number, packages: number, ready: boolean) {
  if (!ready) return "Select shipping on each item to tally the total";
  if (itemCount <= 0) return "No items";
  if (packages === 0) return itemCount === 1 ? "1 digital item · emailed, no courier" : `${itemCount} digital items · emailed, no courier`;
  if (itemCount === 1) return "1 item · 1 shipping option";
  if (packages === 1) {
    return `${itemCount} items · dearest shipping option covers the pack`;
  }
  return `${itemCount} items · ${packages} dearest shipping options`;
}
