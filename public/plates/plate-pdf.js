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
  var BORDER = 4.5;
  var BORDER_THIN = 1.2;
  var BOLT_D = geo.boltDiameterMm || 6;
  var BOLT_INSET_X = geo.boltInsetXMm || 74.5;
  var BOLT_INSET_Y = geo.boltInsetYMm || 13;
  var NZ_SIZE = 11;
  var NZ_BOTTOM = 4.5;
  var NZ_RIGHT = 10;
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

  function drawPlate(page, badgeFont, opts, ox, oy) {
    var borderW = opts.showFrame ? BORDER : BORDER_THIN;
    var bw = mm(borderW);
    var w = mm(PLATE_W);
    var h = mm(PLATE_H);
    page.drawRectangle({ x: ox, y: oy, width: w, height: h, color: hexRgb(opts.borderCol) });
    page.drawRectangle({
      x: ox + bw, y: oy + bw, width: w - 2 * bw, height: h - 2 * bw,
      color: hexRgb(opts.bgCol)
    });

    if (opts.showBolts) {
      /* Centres are measured from the plate's outer edges, not the inner border. */
      var d = mm(BOLT_D);
      var cxs = [ox + mm(BOLT_INSET_X), ox + w - mm(BOLT_INSET_X)];
      var cys = [oy + h - mm(BOLT_INSET_Y), oy + mm(BOLT_INSET_Y)];
      for (var i = 0; i < cxs.length; i++) {
        for (var j = 0; j < cys.length; j++) {
          page.drawCircle({ x: cxs[i], y: cys[j], size: d / 2, color: PDFLib.rgb(0, 0, 0) });
        }
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
        x: ox + w - bw - mm(NZ_RIGHT) - nzW,
        y: oy + bw + mm(NZ_BOTTOM),
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
