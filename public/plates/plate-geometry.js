/* Shared millimetre geometry for the NZ standard plate (360 x 124 mm).
   Canonical source for on-screen preview, print CSS and both PDF exports.

   Style is taken from a classic NZ plate (AUY359) photographed as the
   user's reference, scaled to 360 x 124 mm with perspective correction,
   then reconciled with the labelled Kiwi Plates hole guide:
   https://www.kiwiplates.nz/plate-hole-guide/

   EIGHT 6 mm holes, four along the top and four along the bottom:
     corners  13 mm from the adjacent edges
     inner    74.5 mm from the left/right edges, 13 mm from top/bottom
              (211 mm horizontal pitch, 98 mm vertical pitch)

   Photo measurements (AUY359, outer metal silhouette warped to 360x124;
   residual perspective ~0.8% aspect error, worn/rusted holes):
     top    (11.43, 12.01), (75.04, 11.56), (288.40, 12.08), (347.88, 12.85)
     bottom (BL rusted/noisy), (77.89, 114.22), (289.36, 111.72), (348.12, 111.35)
     inner pitch ~213 mm; diameters ~5.8–7.6 mm (elongated by wear)
   Those sit on the official 13 / 74.5 / 13 pattern within photo uncertainty,
   so the adopted values below are the Kiwi Plates labelled figures.

   Border, measured from mid-edge luminance profiles on the same warp
   (bottom shows the metal lip clearly; top lip was partly clipped):
     outer metal lip 1.0 mm, black raised rim 4.0 mm, light inner
     highlight 1.5 mm (field starts 6.5 mm in). Outer corner radius 13 mm
     (Kiwi Plates 1:1 drawing, and consistent with the photo corners).
*/
(function (global) {
  var G = {
    widthMm: 360,
    heightMm: 124,
    capHeightMm: 78,
    boltDiameterMm: 6,
    boltCornerInsetMm: 13,
    boltInnerInsetXMm: 74.5,
    boltInsetYMm: 13,
    boltSpacingXMm: 211,
    boltSpacingYMm: 98,
    /* [x, y] centres in mm from the top-left of the 360 x 124 mm plate. */
    boltCentresMm: [
      [13, 13], [74.5, 13], [285.5, 13], [347, 13],
      [13, 111], [74.5, 111], [285.5, 111], [347, 111]
    ],
    outerLipMm: 1.0,
    blackRimMm: 4.0,
    innerHighlightMm: 1.5,
    cornerRadiusMm: 13,
    metalColour: "#c5c5c0",
    highlightColour: "#e6e6e0"
  };
  global.PLATE_GEOMETRY = G;

  if (typeof document !== "undefined" && document.documentElement) {
    var s = document.documentElement.style;
    s.setProperty("--plate-w", G.widthMm + "mm");
    s.setProperty("--plate-h", G.heightMm + "mm");
    s.setProperty("--bolt-d", G.boltDiameterMm + "mm");
    s.setProperty("--bolt-inner-x", G.boltInnerInsetXMm + "mm");
    s.setProperty("--bolt-corner-x", G.boltCornerInsetMm + "mm");
    s.setProperty("--bolt-cy", G.boltInsetYMm + "mm");
    s.setProperty("--lip", G.outerLipMm + "mm");
    s.setProperty("--black-rim", G.blackRimMm + "mm");
    s.setProperty("--highlight-w", G.innerHighlightMm + "mm");
    s.setProperty("--corner-r", G.cornerRadiusMm + "mm");
    s.setProperty("--metal", G.metalColour);
    s.setProperty("--rim-highlight", G.highlightColour);
  }
})(typeof window !== "undefined" ? window : globalThis);
