import { markedUp } from "@/lib/charm";
import { nzd, type Product, type ShippingOption } from "@/lib/products";

const SHIP: ShippingOption[] = [
  { id: "north", label: "North Island courier", price: 13 },
  { id: "south", label: "South Island courier", price: 18 },
];

type Kind = "batteries" | "ink" | "components" | "cables" | "monitors" | "digital";

type Row = {
  id: string;
  kind: Kind;
  cost: number;
  title: string;
  photo: string;
  brand: string;
  fit: string;
  genuine?: boolean;
  shipping?: ShippingOption[];
  /** Fixed shelf price. Digital keys use this so we keep the spread over the key site. */
  shelf?: number;
};

const PHOTO = {
  hpBat: "/artwork/sourced/hp-battery.jpg",
  dellBat: "/artwork/sourced/dell-battery.jpg",
  hpCharger: "/artwork/sourced/hp-charger.jpg",
  dellCharger: "/artwork/sourced/dell-charger.jpg",
  lenovoCharger: "/artwork/sourced/lenovo-charger.jpg",
  hp67: "/artwork/sourced/hp-67xl.jpg",
  canon: "/artwork/sourced/canon-ink.jpg",
  lc38: "/artwork/sourced/lc38.jpg",
  lc67: "/artwork/sourced/lc67.jpg",
  lc233: "/artwork/sourced/lc233.jpg",
  lc73: "/artwork/sourced/lc73.jpg",
  lc133: "/artwork/sourced/lc133.jpg",
  lc431bk: "/artwork/sourced/lc431bk.jpg",
  lc431y: "/artwork/sourced/lc431y.jpg",
  lc3319: "/artwork/sourced/lc3319.jpg",
  lc3313: "/artwork/sourced/lc3313.jpg",
  gt710: "/artwork/sourced/gt710.jpg",
  rtx3050: "/artwork/sourced/rtx3050.jpg",
  b570: "/artwork/sourced/b570.jpg",
  rx9060: "/artwork/sourced/rx9060.jpg",
  hdmi: "/artwork/sourced/hdmi.jpg",
  displayport: "/artwork/sourced/displayport.jpg",
  usbcDp: "/artwork/sourced/usbc-dp.jpg",
  usbcCharger: "/artwork/sourced/usbc-charger.jpg",
  usbcCable: "/artwork/sourced/usbc-cable.jpg",
  jug: "/artwork/sourced/jug-cord.jpg",
  clover: "/artwork/sourced/clover.jpg",
  figure8: "/artwork/sourced/figure8.jpg",
  ethernet: "/artwork/sourced/ethernet.jpg",
  sata: "/artwork/sourced/sata.jpg",
  ties: "/artwork/sourced/cable-ties.jpg",
  vga: "/artwork/sourced/vga.jpg",
  dell24: "/artwork/sourced/dell-monitor.jpg",
  attackMouse: "/artwork/sourced/attack-mouse.jpg",
  attackKeyboard: "/artwork/sourced/attack-keyboard.jpg",
  wdSn580: "/artwork/sourced/wd-sn580.jpg",
  logiG305: "/artwork/sourced/logitech-g305.jpg",
  rogGladius: "/artwork/sourced/rog-gladius.jpg",
  ryzen5600: "/artwork/sourced/ryzen-5600.jpg",
  kingstonFury: "/artwork/sourced/kingston-fury.jpg",
  msiB550: "/artwork/sourced/msi-b550.jpg",
  winHome: "/artwork/sourced/digital-windows-home.svg",
  winPro: "/artwork/sourced/digital-windows-pro.svg",
  officeKey: "/artwork/sourced/digital-office.svg",
} as const;

const GPU_SHIP: ShippingOption[] = [
  { id: "north", label: "North Island courier", price: 18 },
  { id: "south", label: "South Island courier", price: 26 },
];

const EMAIL: ShippingOption[] = [
  { id: "email", label: "Emailed after payment — no courier", price: 0 },
];

const MON_SHIP: ShippingOption[] = [
  { id: "north", label: "North Island courier", price: 45 },
  { id: "south", label: "South Island courier", price: 125 },
];

/**
 * Cheap NZ lines we can reorder (Sunny Way Tech batteries/chargers, Good Egg ink).
 * Costs are their advertised inc-GST prices. Shelf is $1 clear after PayPal, charm-rounded up.
 */
const ROWS: Row[] = [
  { id: "src-9401", kind: "batteries", cost: 36, photo: "hpBat", brand: "HP", fit: "HP 240 / 245 / 255 G4", title: "Compatible Laptop Battery for HP 240 245 255 G4 – HS04 HSTNN-LB6V" },
  { id: "src-9402", kind: "batteries", cost: 33.6, photo: "hpBat", brand: "HP", fit: "HP Pavilion 14 / 15", title: "Compatible Laptop Battery for HP Pavilion 14/15 – HT03XL L1119-855" },
  { id: "src-9403", kind: "batteries", cost: 38.4, photo: "hpBat", brand: "HP", fit: "HP RI06XL", title: "Compatible Laptop Battery for HP – RI06XL" },
  { id: "src-9404", kind: "batteries", cost: 45.6, photo: "hpBat", brand: "HP", fit: "HP CA06", title: "Compatible Laptop Battery for HP – CA06" },
  { id: "src-9405", kind: "batteries", cost: 54, photo: "hpBat", brand: "HP", fit: "HP EliteBook", title: "Compatible Laptop Battery for HP EliteBook – HSTNN-IB6Y" },
  { id: "src-9406", kind: "batteries", cost: 50.4, photo: "hpBat", brand: "HP", fit: "HP EliteBook", title: "Compatible Laptop Battery for HP EliteBook – HSTNN-IB3Z" },
  { id: "src-9407", kind: "batteries", cost: 57.6, photo: "hpBat", brand: "HP", fit: "HP KC04XL", title: "Compatible Laptop Battery for HP – KC04XL" },
  { id: "src-9408", kind: "batteries", cost: 57.6, photo: "hpBat", brand: "HP", fit: "HP Pavilion Gaming 15-dk", title: "Compatible Laptop Battery for HP Pavilion Gaming 15 – PG03XL 52.5Wh" },
  { id: "src-9409", kind: "batteries", cost: 62.4, photo: "hpBat", brand: "HP", fit: "HP VR03XL", title: "Compatible Laptop Battery for HP – VR03XL" },
  { id: "src-9410", kind: "batteries", cost: 48, photo: "hpBat", brand: "HP", fit: "HP SS03XL", title: "Compatible Laptop Battery for HP – SS03XL" },
  { id: "src-9411", kind: "cables", cost: 25.2, photo: "hpCharger", brand: "HP", fit: "HP 45W 4.5×3.0mm", title: "Compatible Laptop Charger for HP 45W 19.5V 4.5×3.0mm" },
  { id: "src-9412", kind: "cables", cost: 25.2, photo: "hpCharger", brand: "HP", fit: "HP 65W 4.5×3.0mm", title: "Compatible Laptop Charger for HP 65W 19.5V 4.5×3.0mm" },
  { id: "src-9413", kind: "batteries", cost: 46.8, photo: "dellBat", brand: "Dell", fit: "Dell H5CKD", title: "Compatible Laptop Battery for Dell – H5CKD" },
  { id: "src-9414", kind: "batteries", cost: 45.6, photo: "dellBat", brand: "Dell", fit: "Dell YRDD6 / 1VX1H", title: "Compatible Laptop Battery for Dell – YRDD6 1VX1H" },
  { id: "src-9415", kind: "batteries", cost: 48, photo: "dellBat", brand: "Dell", fit: "Dell JK6Y6", title: "Compatible Laptop Battery for Dell – JK6Y6" },
  { id: "src-9416", kind: "batteries", cost: 54, photo: "dellBat", brand: "Dell", fit: "Dell Latitude 12", title: "Compatible Laptop Battery for Dell Latitude 12 – DJ1J0" },
  { id: "src-9417", kind: "batteries", cost: 51.6, photo: "dellBat", brand: "Dell", fit: "Dell JHT2H", title: "Compatible Laptop Battery for Dell – JHT2H" },
  { id: "src-9418", kind: "cables", cost: 25.2, photo: "dellCharger", brand: "Dell", fit: "Dell 90W 7.4×5.0mm", title: "Compatible Laptop Charger for Dell 90W 19.5V 7.4×5.0mm" },
  { id: "src-9419", kind: "cables", cost: 33.6, photo: "dellCharger", brand: "Dell", fit: "Dell 45W USB-C", title: "Compatible Laptop Charger for Dell 45W USB-C" },
  { id: "src-9420", kind: "cables", cost: 36, photo: "dellCharger", brand: "Dell", fit: "Dell 65W USB-C", title: "Compatible Laptop Charger for Dell 65W USB-C" },
  { id: "src-9421", kind: "cables", cost: 25.2, photo: "lenovoCharger", brand: "Lenovo", fit: "Lenovo 45W 4.0×1.7mm", title: "Compatible Laptop Charger for Lenovo 45W 20V 4.0×1.7mm" },
  { id: "src-9422", kind: "cables", cost: 25.2, photo: "lenovoCharger", brand: "Lenovo", fit: "Lenovo 65W 4.0×1.7mm", title: "Compatible Laptop Charger for Lenovo 65W 20V 4.0×1.7mm" },

  { id: "src-9601", kind: "components", cost: 113.85, photo: "gt710", brand: "Gigabyte", fit: "Extra monitor or an old PC", title: "Gigabyte GeForce GT 710 2GB Graphics Card", shipping: GPU_SHIP },
  { id: "src-9602", kind: "components", cost: 504.85, photo: "rtx3050", brand: "MSI", fit: "1080p", title: "MSI GeForce RTX 3050 Ventus 2X OC 6GB Graphics Card", shipping: GPU_SHIP },
  { id: "src-9603", kind: "components", cost: 550.85, photo: "b570", brand: "ASRock", fit: "1080p and 1440p", title: "ASRock Intel Arc B570 Challenger OC 10GB Graphics Card", shipping: GPU_SHIP },
  { id: "src-9604", kind: "components", cost: 884.35, photo: "rx9060", brand: "XFX", fit: "1440p", title: "XFX Swift AMD Radeon RX 9060 XT 16GB Graphics Card", shipping: GPU_SHIP },

  { id: "src-9501", kind: "ink", cost: 6.56, photo: "lc38", brand: "Brother", fit: "Brother LC38 / LC67", title: "Compatible Brother LC38 LC67 Black Ink Cartridge" },
  { id: "src-9502", kind: "ink", cost: 9.06, photo: "lc233", brand: "Brother", fit: "Brother LC233", title: "Compatible Brother LC233 Black Ink Cartridge" },
  { id: "src-9503", kind: "ink", cost: 14.95, photo: "lc73", brand: "Brother", fit: "Brother LC73", title: "Compatible Brother LC73 Ink Cartridges – 4 Colour Value Pack" },
  { id: "src-9504", kind: "ink", cost: 19.95, photo: "lc133", brand: "Brother", fit: "Brother LC133", title: "Compatible Brother LC133 Ink Cartridges – 4 Colour High Yield Pack" },
  { id: "src-9505", kind: "ink", cost: 21.95, photo: "lc431bk", brand: "Brother", fit: "Brother LC431XL", title: "Compatible Brother LC431XL Black Ink Cartridge" },
  { id: "src-9506", kind: "ink", cost: 21.95, photo: "lc431y", brand: "Brother", fit: "Brother LC431XL", title: "Compatible Brother LC431XL Yellow Ink Cartridge" },
  { id: "src-9507", kind: "ink", cost: 22.95, photo: "lc233", brand: "Brother", fit: "Brother LC233", title: "Compatible Brother LC233 Ink Cartridges – 4 Colour Value Pack" },
  { id: "src-9508", kind: "ink", cost: 56.95, photo: "lc3319", brand: "Brother", fit: "Brother LC3319XL", title: "Compatible Brother LC3319XL Ink Cartridges – 4 Colour High Yield Pack" },
  { id: "src-9509", kind: "ink", cost: 53.95, photo: "lc3313", brand: "Brother", fit: "Brother LC3313BK", title: "Genuine Brother LC3313BK Black Ink Cartridge", genuine: true },
  { id: "src-9510", kind: "ink", cost: 15.95, photo: "canon", brand: "Canon", fit: "Canon MegaTank", title: "Canon MC-G02 MegaTank Maintenance Cartridge", genuine: true },
  { id: "src-9511", kind: "ink", cost: 56.9, photo: "canon", brand: "Canon", fit: "Canon PG-645XL", title: "Genuine Canon PG-645XL Black Ink Cartridge", genuine: true },
  { id: "src-9512", kind: "ink", cost: 58.93, photo: "canon", brand: "Canon", fit: "Canon CL-646XL", title: "Genuine Canon CL-646XL Colour Ink Cartridge", genuine: true },
  { id: "src-9513", kind: "ink", cost: 37.95, photo: "hp67", brand: "HP", fit: "HP 67", title: "Genuine HP 67 Black Ink Cartridge", genuine: true },
  { id: "src-9514", kind: "ink", cost: 57.95, photo: "hp67", brand: "HP", fit: "HP 67XL", title: "Genuine HP 67XL Black Ink Cartridge", genuine: true },
  { id: "src-9515", kind: "ink", cost: 45.95, photo: "hp67", brand: "HP", fit: "HP 63XL", title: "Remanufactured HP 63XL Black Ink Cartridge" },

  { id: "src-9701", kind: "cables", cost: 28, photo: "hdmi", brand: "Belkin", fit: "HDMI 2m", title: "HDMI Cable 2m – 4K High Speed" },
  { id: "src-9702", kind: "cables", cost: 28, photo: "displayport", brand: "C2G", fit: "DisplayPort 2m", title: "DisplayPort Cable 2m" },
  { id: "src-9703", kind: "cables", cost: 36, photo: "usbcDp", brand: "StarTech", fit: "USB-C to DisplayPort", title: "USB-C to DisplayPort Cable" },
  { id: "src-9704", kind: "cables", cost: 22, photo: "usbcCharger", brand: "Generic", fit: "20W cellphone charger", title: "USB-C 20W Cellphone Wall Charger" },
  { id: "src-9705", kind: "cables", cost: 16, photo: "usbcCable", brand: "Generic", fit: "USB-C cable 1m", title: "USB-C to USB-C Cellphone Charging Cable 1m" },
  { id: "src-9706", kind: "cables", cost: 16, photo: "jug", brand: "Generic", fit: "IEC C13 jug cord 1.8m", title: "Jug Cord Power Cable – NZ 3-Pin to IEC C13 1.8m" },
  { id: "src-9707", kind: "cables", cost: 16, photo: "clover", brand: "Generic", fit: "IEC C5 clover lead", title: "Clover Style Power Cable – NZ 3-Pin to IEC C5" },
  { id: "src-9708", kind: "cables", cost: 16, photo: "figure8", brand: "Generic", fit: "IEC C7 figure-8", title: "Figure-8 Power Cable – NZ 3-Pin to IEC C7" },
  { id: "src-9709", kind: "cables", cost: 16, photo: "ethernet", brand: "Generic", fit: "Cat6 2m", title: "Cat6 Ethernet Cable 2m" },
  { id: "src-9710", kind: "cables", cost: 10, photo: "sata", brand: "Generic", fit: "SATA III data", title: "SATA Data Cable" },
  { id: "src-9711", kind: "cables", cost: 10, photo: "ties", brand: "Generic", fit: "Pack of 100", title: "Cable Ties – Black Nylon Pack of 100" },
  { id: "src-9712", kind: "cables", cost: 16, photo: "vga", brand: "Generic", fit: "VGA cable", title: "VGA Monitor Cable" },

  { id: "src-9801", kind: "monitors", cost: 289, photo: "dell24", brand: "Dell", fit: "24 inch 1080p HDMI and DisplayPort", title: 'Dell 24" Full HD Monitor', shipping: MON_SHIP },

  { id: "src-9901", kind: "components", cost: 128.85, photo: "attackMouse", brand: "Attack Shark", fit: "wireless mouse", title: "Attack Shark X3 Wireless Gaming Mouse" },
  { id: "src-9902", kind: "components", cost: 174.85, photo: "attackKeyboard", brand: "Attack Shark", fit: "magnetic keyboard", title: "Attack Shark X68 HE Rapid Trigger Keyboard" },
  { id: "src-9903", kind: "components", cost: 358.75, photo: "wdSn580", brand: "Western Digital", fit: "2TB NVMe SSD", title: "WD Blue SN580 2TB NVMe SSD" },
  { id: "src-9904", kind: "components", cost: 94.99, photo: "logiG305", brand: "Logitech", fit: "wireless mouse", title: "Logitech G305 LIGHTSPEED Wireless Gaming Mouse" },
  { id: "src-9905", kind: "components", cost: 175, photo: "rogGladius", brand: "ASUS ROG", fit: "wireless mouse", title: "ASUS ROG Gladius III Wireless Gaming Mouse" },
  { id: "src-9906", kind: "components", cost: 263.35, photo: "ryzen5600", brand: "AMD", fit: "AM4 CPU", title: "AMD Ryzen 5 5600 Processor" },
  { id: "src-9907", kind: "components", cost: 290, photo: "kingstonFury", brand: "Kingston", fit: "16GB DDR4 kit", title: "Kingston Fury Beast 16GB DDR4 RGB Memory" },
  { id: "src-9908", kind: "components", cost: 205.85, photo: "msiB550", brand: "MSI", fit: "AM4 motherboard", title: "MSI B550M PRO-VDH WIFI Motherboard" },

  { id: "src-9301", kind: "digital", cost: 25, shelf: 49.95, photo: "winHome", brand: "Microsoft", fit: "1 PC", title: "Windows 11 Home digital key", shipping: EMAIL },
  { id: "src-9302", kind: "digital", cost: 30, shelf: 64.95, photo: "winPro", brand: "Microsoft", fit: "1 PC", title: "Windows 11 Pro digital key", shipping: EMAIL },
  { id: "src-9303", kind: "digital", cost: 40, shelf: 79.95, photo: "officeKey", brand: "Microsoft", fit: "Word, Excel and PowerPoint on 1 PC", title: "Office apps digital key — Word, Excel and PowerPoint", shipping: EMAIL },
];

const PATH = {
  batteries: {
    path: "/Computers/Laptop-Batteries",
    number: "0002-bat",
    name: "Batteries",
    stamp: "B4",
  },
  ink: {
    path: "/Computers/Printer-Ink",
    number: "0002-ink",
    name: "Ink",
    stamp: "I1",
  },
  components: {
    path: "/Computers/Components",
    number: "0002-gpu",
    name: "Components",
    stamp: "C0",
  },
  cables: {
    path: "/Computers/Cables",
    number: "0002-cables",
    name: "Cables & Plugs",
    stamp: "C4",
  },
  monitors: {
    path: "/Computers/Monitors",
    number: "0002-mon",
    name: "Monitors",
    stamp: "M0",
  },
  digital: {
    path: "/Computers/Software",
    number: "0002-digital",
    name: "Digital",
    stamp: "D1",
  },
} as const;

function toProduct(row: Row): Product {
  const cat = PATH[row.kind];
  // Batteries and chargers: NZ seller price did not include the courier to us.
  // Ink is a small mailer. GPUs are a small box from another island if the Wellington shop is out.
  // Cables, the monitor and the branded gear already include that freight in cost.
  const inbound = row.kind === "digital" || row.id.startsWith("src-97") || row.id.startsWith("src-98") || row.id.startsWith("src-99")
    ? 0
    : row.id.startsWith("src-95")
      ? 6
      : row.id.startsWith("src-96")
        ? 13
        : 12;
  const amount = row.shelf ?? markedUp(row.cost + inbound);
  const genuine = Boolean(row.genuine);
  return {
    id: row.id,
    title: `${row.title} | "${cat.stamp}"`,
    categoryPath: cat.path,
    categoryNumber: cat.number,
    categoryName: cat.name,
    priceLabel: nzd(amount),
    amount,
    buyNow: true,
    photo: PHOTO[row.photo as keyof typeof PHOTO],
    photos: [PHOTO[row.photo as keyof typeof PHOTO]],
    region: null,
    suburb: null,
    listingUrl: "",
    isNew: false,
    shipping: row.shipping ?? SHIP,
    maxQty: row.kind === "digital" ? 5 : row.kind === "ink" ? 12 : row.kind === "cables" ? 10 : row.kind === "monitors" ? 2 : 4,
    description:
      row.kind === "digital"
        ? `Digital key for ${row.fit}. We buy it in after you pay and email the key to the address on the order. This is a third-party digital licence, not a boxed Microsoft shop copy and not a Microsoft 365 subscription. The shelf price is what you pay us. If the key will not activate, you get a full refund.`
        : row.kind === "components" && /graphics card/i.test(row.title)
        ? `New ${row.brand} card, bought in from a New Zealand shop when you order and posted from Wellington. ${row.id === "src-9601" ? "This is a basic display card for an extra screen or an old PC, not for modern games. " : ""}If that exact card has already sold there, you get a full refund before it ships.`
        : row.kind === "components"
          ? `New ${row.brand} ${row.fit}. Ordered in when you buy and posted from Wellington. If we cannot get this exact item, you get a full refund before it ships.`
          : row.kind === "monitors"
          ? `New ${row.brand} monitor, ${row.fit}. Bought in from a New Zealand shop when you order and posted from Wellington. If that exact model has already sold there, you get a full refund before it ships.`
          : row.kind === "cables"
            ? `New ${row.fit}. Ordered in when you buy and posted from Wellington. If we cannot get this exact item, you get a full refund before it ships.`
            : genuine
          ? `Genuine ${row.brand} ${row.fit}. Ordered in when you buy and posted from Wellington. If we cannot get this exact item, you get a full refund before it ships.`
          : `Compatible ${row.brand} replacement for ${row.fit}. Not a genuine OEM part. Ordered in when you buy and posted from Wellington. If we cannot get this exact part, you get a full refund before it ships.`,
    attributes: [
      { name: "Brand", value: row.brand },
      { name: "Fits", value: row.fit },
      { name: "Type", value: row.kind === "digital" ? "Digital key" : row.kind === "components" || row.kind === "monitors" || (row.kind === "cables" && !/charger/i.test(row.title)) ? "New" : genuine ? "Genuine" : "Compatible" },
    ],
    viewCount: null,
    soldOut: false,
  };
}

export const SOURCED_STOCK: Product[] = ROWS.map(toProduct);
