/* Shared millimetre geometry for the NZ standard plate (360 x 124 mm).
   Canonical source for on-screen preview, print CSS and both PDF exports.

   Bolt holes follow the labelled dimensions on Kiwi Plates' official
   Plate Sizing & Hole Positioning Guide for Standard Size 360 x 124 mm:
   https://www.kiwiplates.nz/plate-hole-guide/
   Centres are 13 mm from the top and bottom edges and 74.5 mm from the
   left and right edges (13 mm + 61.5 mm), so the horizontal pitch is
   211 mm and the vertical pitch is 98 mm. Hole diameter is 6 mm, taken
   from the same guide's 1:1 drawing (r = 3 mm circles). The four holes
   sit in the unlettered top and bottom margins and clear 78 mm cap-height
   characters. The 13 mm marks at the extreme corners of the guide are
   the outer corner-radius centres, not extra holes.
*/
(function (global) {
  var G = {
    widthMm: 360,
    heightMm: 124,
    capHeightMm: 78,
    boltDiameterMm: 6,
    boltInsetXMm: 74.5,
    boltInsetYMm: 13,
    boltSpacingXMm: 211,
    boltSpacingYMm: 98
  };
  global.PLATE_GEOMETRY = G;

  if (typeof document !== "undefined" && document.documentElement) {
    var s = document.documentElement.style;
    s.setProperty("--plate-w", G.widthMm + "mm");
    s.setProperty("--plate-h", G.heightMm + "mm");
    s.setProperty("--bolt-d", G.boltDiameterMm + "mm");
    s.setProperty("--bolt-cx", G.boltInsetXMm + "mm");
    s.setProperty("--bolt-cy", G.boltInsetYMm + "mm");
  }
})(typeof window !== "undefined" ? window : globalThis);
