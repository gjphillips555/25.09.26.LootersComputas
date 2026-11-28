var colours = { font: "#0a0a0a", border: "#111111", bg: "#ffffff" };

function currentText() {
  var clean = document.getElementById("plateInput").value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return clean || "ABC123";
}

function updatePlate() {
  document.getElementById("plateText").textContent = currentText();
}

function highlightFor(bg) {
  var h = String(bg || "#ffffff").replace("#", "");
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  var r = parseInt(h.slice(0,2), 16), g = parseInt(h.slice(2,4), 16), b = parseInt(h.slice(4,6), 16);
  var luma = (0.3*r + 0.59*g + 0.11*b) / 255;
  if (luma > 0.6) return "#e6e6e0";
  var f = 0.22;
  function ch(v) { return Math.max(0, Math.min(255, Math.round(v + (255-v)*f))); }
  return "#" + [ch(r),ch(g),ch(b)].map(function(v){ return v.toString(16).padStart(2,"0"); }).join("");
}

function applyColours() {
  var plate = document.getElementById("plate");
  var showFrame = document.getElementById("toggleFrame").checked;
  plate.classList.toggle("no-frame", !showFrame);
  plate.style.backgroundColor = colours.bg;
  plate.style.borderColor = showFrame ? (window.PLATE_GEOMETRY && window.PLATE_GEOMETRY.metalColour) || "#c5c5c0" : "#bbbbbb";
  var rim = document.getElementById("plateRim");
  var hi = document.getElementById("plateHighlight");
  if (rim) rim.style.borderColor = colours.border;
  if (hi) hi.style.borderColor = highlightFor(colours.bg);
  ["plateText","nzBadge"].forEach(function(id) {
    var el = document.getElementById(id);
    el.style.setProperty("color", colours.font, "important");
    el.style.setProperty("-webkit-text-fill-color", colours.font, "important");
  });
}

var BOLT_IDS = ["boltTcl","boltTil","boltTir","boltTcr","boltBcl","boltBil","boltBir","boltBcr"];

function updateOptions() {
  applyColours();
  var showBolts = document.getElementById("toggleBolts").checked;
  var showNz = document.getElementById("toggleNz").checked;
  BOLT_IDS.forEach(function(id) {
    document.getElementById(id).classList.toggle("hidden", !showBolts);
  });
  document.getElementById("nzBadge").classList.toggle("hidden", !showNz);
}

function onSelectColour(which, selectId, pickerId) {
  var val = document.getElementById(selectId).value;
  if (val) {
    colours[which] = val;
    document.getElementById(pickerId).value = val.length === 7 ? val : colours[which];
    applyColours();
  }
}

function onPickerColour(which, pickerId) {
  var hex = document.getElementById(pickerId).value;
  if (hex && hex.length === 7) {
    colours[which] = hex;
    applyColours();
  }
}

function clearPlate() {
  document.getElementById("plateInput").value = "";
  updatePlate();
  document.getElementById("plateInput").focus();
}

function plateOpts(paper) {
  return {
    paper: paper,
    text: currentText(),
    fontCol: colours.font,
    borderCol: colours.border,
    bgCol: colours.bg,
    showFrame: document.getElementById("toggleFrame").checked,
    showBolts: document.getElementById("toggleBolts").checked,
    showNz: document.getElementById("toggleNz").checked
  };
}

async function handlePdf(paper, filename, button) {
  if (typeof downloadPlatePdf !== "function") {
    alert("PDF tools did not load. Check your network and try again, or use Print sticker.");
    return;
  }
  button.disabled = true;
  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    await downloadPlatePdf(plateOpts(paper), filename);
  } catch (err) {
    console.error(err);
    alert("Could not build the PDF: " + (err && err.message ? err.message : err));
  } finally {
    button.disabled = false;
  }
}

document.getElementById("plateInput").addEventListener("input", updatePlate);
document.getElementById("plateInput").addEventListener("keypress", function(e) {
  if (e.key === "Enter") window.print();
});
document.getElementById("btnPrint").addEventListener("click", function() { window.print(); });
document.getElementById("btnClear").addEventListener("click", clearPlate);
document.getElementById("btnPdfPlate").addEventListener("click", function() {
  handlePdf("plate", "siftah-plate-360x124mm.pdf", this);
});
document.getElementById("btnPdfA3").addEventListener("click", function() {
  handlePdf("a3", "siftah-plate-A3-crop-marks.pdf", this);
});
document.getElementById("btnPdfA4").addEventListener("click", function() {
  handlePdf("a4", "siftah-plate-A4-two-halves.pdf", this);
});
document.getElementById("toggleFrame").addEventListener("change", updateOptions);
document.getElementById("toggleBolts").addEventListener("change", updateOptions);
document.getElementById("toggleNz").addEventListener("change", updateOptions);
document.getElementById("fontColour").addEventListener("change", function() {
  onSelectColour("font", "fontColour", "fontColourCustom");
});
document.getElementById("borderColour").addEventListener("change", function() {
  onSelectColour("border", "borderColour", "borderColourCustom");
});
document.getElementById("bgColour").addEventListener("change", function() {
  onSelectColour("bg", "bgColour", "bgColourCustom");
});
document.getElementById("fontColourCustom").addEventListener("input", function() {
  onPickerColour("font", "fontColourCustom");
});
document.getElementById("borderColourCustom").addEventListener("input", function() {
  onPickerColour("border", "borderColourCustom");
});
document.getElementById("bgColourCustom").addEventListener("input", function() {
  onPickerColour("bg", "bgColourCustom");
});

function scalePreview() {
  var plate = document.getElementById("plate");
  var box = document.getElementById("plate-container");
  if (!plate || !box) return;
  plate.style.transform = "none";
  plate.style.marginBottom = "0";
  var avail = box.clientWidth - 8;
  var pw = plate.offsetWidth || 1;
  var s = Math.min(1, avail / pw);
  if (s < 0.999) {
    plate.style.transformOrigin = "top center";
    plate.style.transform = "scale(" + s + ")";
    plate.style.marginBottom = ((s - 1) * plate.offsetHeight) + "px";
  }
}
window.addEventListener("resize", scalePreview);

updatePlate();
updateOptions();
scalePreview();
