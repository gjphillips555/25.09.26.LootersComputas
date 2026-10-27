import assert from "node:assert/strict";
import { test } from "node:test";
import { afterpayEach, afterpayLabel } from "./afterpay.ts";
import { productBrand, productKind } from "./product-search.ts";
import type { Product } from "./products.ts";

function item(title: string, extra: Partial<Product> = {}): Product {
  return {
    id: "1",
    title,
    categoryPath: extra.categoryPath ?? null,
    categoryNumber: extra.categoryNumber ?? null,
    categoryName: extra.categoryName ?? null,
    priceLabel: "$1",
    amount: 1,
    buyNow: true,
    photo: null,
    photos: [],
    region: null,
    suburb: null,
    listingUrl: "",
    isNew: false,
    shipping: [],
    maxQty: 1,
    description: extra.description ?? null,
    attributes: extra.attributes ?? [],
    viewCount: null,
  };
}

function kind(title: string, extra?: Partial<Product>) {
  return productKind(item(title, extra));
}

test("unstamped titles still split laptop / desktop / parts", () => {
  assert.equal(
    kind("GigaByte Gaming - Intel i7 | DDR4 | NVMe SSD | Nitro R7 360 | Windows 11 Pro"),
    "desktops",
  );
  assert.equal(kind("Dell Latitude 7490 i5 8GB"), "laptops");
  assert.equal(kind("Refurbished HP 11-k009tu Laptop – Windows 10"), "laptops");
  assert.equal(kind("HP ProDesk 400 G4 SFF Desktop"), "desktops");
  assert.equal(kind("HP Laptop Charger 19V 65W"), "cables");
});

test("title stamps L4 D3 C0 beat the fallback", () => {
  assert.equal(kind("L4 HP ProDesk 400 G4 SFF Desktop"), "laptops");
  assert.equal(kind("D3 Dell Latitude 7490 Laptop"), "desktops");
  assert.equal(kind("C0 HP EliteBook 840 G5"), "components");
  assert.equal(kind("HP EliteBook [L4] i5"), "laptops");
  assert.equal(kind("HP EliteBook 840 G5 - L4"), "laptops");
  assert.equal(kind("l4, refurbished laptop"), "laptops");
  assert.equal(kind("SFF PC | D3 | Win 11"), "desktops");
  assert.equal(kind("(C0) CPU cooler"), "components");
});

test("quoted stamps in live Trade Me titles still match", () => {
  assert.equal(
    kind('HP ProDesk 400 G4 SFF – Intel Core i5 Business Desktop - Refurbished | "D3"'),
    "desktops",
  );
  assert.equal(
    kind('Dell Latitude 3160 – 8GB RAM, 256GB SSD, Windows 11 Pro – Refurbished | "L4"'),
    "laptops",
  );
  assert.equal(kind('3 Port 1394A PCI Card | "C0"'), "components");
});

test("Trade Me laptop tree without a stamp is still a laptop", () => {
  assert.equal(
    kind("Something odd", {
      categoryPath: "/Computers/Laptops/Laptops",
      categoryNumber: "0002-0356-0032",
    }),
    "laptops",
  );
  assert.equal(
    kind("Office box", {
      categoryPath: "/Computers/Desktops",
      categoryNumber: "0002-4715",
    }),
    "desktops",
  );
});

test("brand detection from title and attributes", () => {
  assert.equal(productBrand(item("Refurbished HP 11-k009tu Laptop")), "HP");
  assert.equal(productBrand(item("GigaByte Gaming - Intel i7")), "GIGABYTE");
  assert.equal(
    productBrand(
      item("Gaming PC", {
        attributes: [{ name: "Brand", value: "ASUS" }],
      }),
    ),
    "ASUS",
  );
});

test("laptop or desktop in the title beats a wrong Trade Me folder", () => {
  assert.equal(
    kind("Refurbished HP 11-k009tu Laptop – Windows 10 – Includes Charger – Warranty", {
      categoryPath: "/Computers/Components",
      categoryNumber: "0002-0359",
    }),
    "laptops",
  );
  assert.equal(
    kind("Refurbished Dell OptiPlex 9020 – Intel i5 | 8GB RAM | Windows 11", {
      categoryPath: "/Computers/Components",
      categoryNumber: "0002-0359",
    }),
    "desktops",
  );
});

test("battery and ink titles stay out of laptops", () => {
  assert.equal(
    kind('Compatible Laptop Battery for HP 240 245 255 G4 – HS04 | "B4"'),
    "batteries",
  );
  assert.equal(kind("Compatible Laptop Charger for Dell 65W USB-C"), "cables");
  assert.equal(
    kind('Compatible Brother LC233 Ink Cartridges – 4 Colour Value Pack | "I1"'),
    "ink",
  );
  assert.equal(
    kind("Refurbished HP 11-k009tu Laptop – Windows 10 – Includes Charger – Warranty"),
    "laptops",
  );
});

test("monitors, cables and gift cards use their own stamps", () => {
  assert.equal(kind('Dell 24" Full HD Monitor | "M0"'), "monitors");
  assert.equal(kind("HDMI Cable 2m | \"C4\""), "cables");
  assert.equal(kind("Looters Computas Gift Card | \"G1\""), "gift-cards");
  assert.equal(kind("Windows 11 Home digital key | \"D1\""), "digital");
  assert.equal(kind("Cat6 Ethernet Cable 2m"), "cables");
  assert.equal(kind("Dell 24 inch Monitor"), "monitors");
  assert.equal(
    kind("Refurbished HP 11-k009tu Laptop – Windows 10 – Includes Charger – Warranty"),
    "laptops",
  );
});

test("Afterpay splits the price into four instalments", () => {
  assert.equal(afterpayEach(199.95), 49.99);
  assert.equal(afterpayLabel(199.95), "Pay 4 instalments of $49.99");
});
