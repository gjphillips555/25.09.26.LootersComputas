/* Shared true-size plate PDF builder (pdf-lib + Licenz outline paths).
   Glyph paths in LICENZ_GLYPHS are y-flipped for drawSvgPath.
   Rectangles use PDF y-up via drawRectangle. */
(function (global) {
  var MM = 72 / 25.4;
  function mm(n) { return n * MM; }

  var geo = global.PLATE_GEOMETRY || {};
  var CAP_MM = geo.capHeightMm || 78;
  var CAP_UNITS = (global.LICENZ_METRICS && global.LICENZ_METRICS.capHeight) || 700;
  var PLATE_W = geo.widthMm || 360;
  var PLATE_H = geo.heightMm || 124;
  var LIP = geo.outerLipMm || 1;
  var BLACK_RIM = geo.blackRimMm || 4;
  var HIGHLIGHT_W = geo.innerHighlightMm || 1.5;
  var CORNER_R = geo.cornerRadiusMm || 13;
  var METAL = geo.metalColour || "#c5c5c0";
  var HIGHLIGHT = geo.highlightColour || "#e6e6e0";
  var BOLT_D = geo.boltDiameterMm || 6;
  var BOLT_CENTRES = geo.boltCentresMm || [
    [13, 13], [74.5, 13], [285.5, 13], [347, 13],
    [13, 111], [74.5, 111], [285.5, 111], [347, 111]
  ];
  var NZ_SIZE = 11;
  var NZ_BOTTOM = 8;
  var NZ_RIGHT = 22;
  var UNIT = mm(CAP_MM) / CAP_UNITS;

  function hexRgb(hex) {
    var h = String(hex || "#000000").replace("#", "");
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var n = parseInt(h, 16);
    return PDFLib.rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
  }

  function textWidth(text) {
    var glyphs = global.LICENZ_GLYPHS || {};
    var w = 0;
    for (var i = 0; i < text.length; i++) {
      var g = glyphs[text[i]];
      if (g) w += g.advance * UNIT;
    }
    return w;
  }

  function drawText(page, text, x, y, color) {
    var glyphs = global.LICENZ_GLYPHS || {};
    var cx = x;
    for (var i = 0; i < text.length; i++) {
      var g = glyphs[text[i]];
      if (!g) continue;
      page.drawSvgPath(g.path, { x: cx, y: y, scale: UNIT, color: color, borderWidth: 0 });
      cx += g.advance * UNIT;
    }
  }

  function drawCropMarks(page, ox, oy, w, h) {
    var mark = mm(8), gap = mm(2), lw = mm(0.25);
    var black = PDFLib.rgb(0, 0, 0);
    var segs = [
      [ox - gap, oy, -mark, 0],
      [ox, oy - gap, 0, -mark],
      [ox + w + gap, oy, mark, 0],
      [ox + w, oy - gap, 0, -mark],
      [ox - gap, oy + h, -mark, 0],
      [ox, oy + h + gap, 0, mark],
      [ox + w + gap, oy + h, mark, 0],
      [ox + w, oy + h + gap, 0, mark]
    ];
    for (var i = 0; i < segs.length; i++) {
      var s = segs[i];
      page.drawLine({ start: { x: s[0], y: s[1] }, end: { x: s[0] + s[2], y: s[1] + s[3] }, thickness: lw, color: black });
    }
  }

  /* Rounded rect in PDF space (x,y = lower-left, y-up) via an SVG path
     whose local origin is the top-left (y-down). */
  function drawRoundedRect(page, x, y, w, h, r, color) {
    if (r <= 0) {
      page.drawRectangle({ x: x, y: y, width: w, height: h, color: color });
      return;
    }
    if (r > w / 2) r = w / 2;
    if (r > h / 2) r = h / 2;
    var k = 0.552284749831 * r;
    var d = [
      "M", r, 0,
      "H", w - r,
      "C", w - r + k, 0, w, r - k, w, r,
      "V", h - r,
      "C", w, h - r + k, w - r + k, h, w - r, h,
      "H", r,
      "C", r - k, h, 0, h - r + k, 0, h - r,
      "V", r,
      "C", 0, r - k, r - k, 0, r, 0,
      "Z"
    ].join(" ");
    page.drawSvgPath(d, { x: x, y: y + h, color: color, borderWidth: 0 });
  }

  function highlightFor(bg) {
    var hx = String(bg || "#ffffff").replace("#", "");
    if (hx.length === 3) hx = hx[0]+hx[0]+hx[1]+hx[1]+hx[2]+hx[2];
    var r = parseInt(hx.slice(0,2), 16), g = parseInt(hx.slice(2,4), 16), b = parseInt(hx.slice(4,6), 16);
    var luma = (0.3*r + 0.59*g + 0.11*b) / 255;
    if (luma > 0.6) return HIGHLIGHT;
    var f = 0.22;
    function ch(v) { return Math.max(0, Math.min(255, Math.round(v + (255-v)*f))); }
    return "#" + [ch(r),ch(g),ch(b)].map(function(v){ return v.toString(16).padStart(2,"0"); }).join("");
  }

  function drawPlate(page, badgeFont, opts, ox, oy) {
    var w = mm(PLATE_W);
    var h = mm(PLATE_H);
    var lip = mm(LIP);
    var rim = mm(BLACK_RIM);
    var hi = mm(HIGHLIGHT_W);
    var R = mm(CORNER_R);

    if (opts.showFrame) {
      drawRoundedRect(page, ox, oy, w, h, R, hexRgb(METAL));
      drawRoundedRect(page, ox + lip, oy + lip, w - 2 * lip, h - 2 * lip, Math.max(0, R - lip), hexRgb(opts.borderCol));
      drawRoundedRect(page, ox + lip + rim, oy + lip + rim, w - 2 * (lip + rim), h - 2 * (lip + rim), Math.max(0, R - lip - rim), hexRgb(highlightFor(opts.bgCol)));
      var inn = lip + rim + hi;
      drawRoundedRect(page, ox + inn, oy + inn, w - 2 * inn, h - 2 * inn, Math.max(0, R - inn), hexRgb(opts.bgCol));
    } else {
      var thin = mm(0.6);
      drawRoundedRect(page, ox, oy, w, h, R, hexRgb("#bbbbbb"));
      drawRoundedRect(page, ox + thin, oy + thin, w - 2 * thin, h - 2 * thin, Math.max(0, R - thin), hexRgb(opts.bgCol));
    }

    if (opts.showBolts) {
      var d = mm(BOLT_D);
      for (var i = 0; i < BOLT_CENTRES.length; i++) {
        var cx = ox + mm(BOLT_CENTRES[i][0]);
        var cy = oy + h - mm(BOLT_CENTRES[i][1]); /* y-up: 0 is the bottom edge */
        page.drawCircle({ x: cx, y: cy, size: d / 2, color: PDFLib.rgb(0, 0, 0) });
      }
    }

    var text = opts.text || "ABC123";
    var tw = textWidth(text);
    var x = ox + (w - tw) / 2;
    var y = oy + mm((PLATE_H - CAP_MM) / 2);
    drawText(page, text, x, y, hexRgb(opts.fontCol));

    if (opts.showNz) {
      var nz = "NZ";
      var nzSize = mm(NZ_SIZE);
      var nzW = badgeFont.widthOfTextAtSize(nz, nzSize);
      page.drawText(nz, {
        x: ox + w - mm(NZ_RIGHT) - nzW,
        y: oy + mm(NZ_BOTTOM),
        size: nzSize,
        font: badgeFont,
        color: hexRgb(opts.fontCol)
      });
    }
  }

  async function buildPlatePdf(opts) {
    if (typeof PDFLib === "undefined") throw new Error("pdf-lib failed to load");
    if (!global.LICENZ_GLYPHS) throw new Error("Licenz outlines failed to load");
    var pdf = await PDFLib.PDFDocument.create();
    var badgeFont = await pdf.embedFont(PDFLib.StandardFonts.HelveticaBold);

    if (opts.paper === "a3") {
      var page = pdf.addPage([mm(420), mm(297)]);
      var ox = (mm(420) - mm(PLATE_W)) / 2;
      var oy = (mm(297) - mm(PLATE_H)) / 2;
      drawCropMarks(page, ox, oy, mm(PLATE_W), mm(PLATE_H));
      drawPlate(page, badgeFont, opts, ox, oy);

      var lineY = oy - mm(15);
      var lineW = mm(100);
      var lineX = ox + (mm(PLATE_W) - lineW) / 2;
      var black = PDFLib.rgb(0, 0, 0);
      page.drawLine({ start: { x: lineX, y: lineY }, end: { x: lineX + lineW, y: lineY }, thickness: mm(0.4), color: black });
      [lineX, lineX + lineW].forEach(function (tx) {
        page.drawLine({ start: { x: tx, y: lineY - mm(3) }, end: { x: tx, y: lineY + mm(3) }, thickness: mm(0.3), color: black });
      });
      var label = "100 mm";
      var ls = 9;
      var lw = badgeFont.widthOfTextAtSize(label, ls);
      page.drawText(label, { x: lineX + (lineW - lw) / 2, y: lineY - mm(9), size: ls, font: badgeFont, color: black });
    } else {
      var p2 = pdf.addPage([mm(PLATE_W), mm(PLATE_H)]);
      drawPlate(p2, badgeFont, opts, 0, 0);
    }
    return pdf.save();
  }

  function downloadBytes(bytes, filename) {
    var blob = new Blob([bytes], { type: "application/pdf" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  global.buildPlatePdf = buildPlatePdf;
  global.downloadPlatePdf = async function (opts, filename) {
    var bytes = await buildPlatePdf(opts);
    downloadBytes(bytes, filename);
  };
})(window);
