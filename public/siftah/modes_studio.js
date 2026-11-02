/* Siftah modes studio v2.2 — Create / Edit / Gallery */
(function () {
  "use strict";
  var lastCreateBlob = null, lastEditBlob = null, editSourceBlob = null, lastVidBlob = null;

  function toast(m) { if (window.siftahModes) window.siftahModes.toast(m); else if (typeof showToast === "function") showToast(m); }
  function token() {
    try {
      var flux = (localStorage.getItem("siftah_flux_token") || "").trim();
      if (flux) return flux;
      var s = typeof loadSettings === "function" ? loadSettings() : {};
      return (s.token || localStorage.getItem("siftah_token") || "").trim();
    } catch (e) { return ""; }
  }
  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader(); r.onload = function () { resolve(r.result); }; r.onerror = reject; r.readAsDataURL(blob);
    });
  }
  function normalizeOut(out) {
    return Promise.resolve().then(async function () {
      if (out instanceof Blob) return out;
      if (out && out.arrayBuffer) return new Blob([await out.arrayBuffer()], { type: "image/png" });
      if (out instanceof ArrayBuffer) return new Blob([out], { type: "image/png" });
      if (typeof out === "string" && out.indexOf("data:") === 0) return (await fetch(out)).blob();
      if (out && out.image) return normalizeOut(out.image);
      throw new Error("Unexpected image output");
    });
  }
  function normalizeVideo(out) {
    return Promise.resolve().then(async function () {
      if (out instanceof Blob) return out;
      if (out && out.arrayBuffer) return new Blob([await out.arrayBuffer()], { type: "video/mp4" });
      if (out instanceof ArrayBuffer) return new Blob([out], { type: "video/mp4" });
      if (typeof out === "string") return (await fetch(out)).blob();
      if (out && out.url) return (await fetch(out.url)).blob();
      if (out && out.video && out.video.url) return (await fetch(out.video.url)).blob();
      throw new Error("Unexpected video output");
    });
  }
  function esc(s) {
    return String(s || "").replace(/[&<>"]/g, function (c) {
      if (c === "&") return "\u0026amp;";
      if (c === "<") return "\u0026lt;";
      if (c === ">") return "\u0026gt;";
      return "\u0026quot;";
    });
  }
  function groupOf(kind) {
    if (kind === "video") return "video";
    if (kind === "file") return "file";
    return "image";
  }
  function downloadVault(item) {
    if (!window.siftahVault) return;
    window.siftahVault.get(item.id).then(function (blob) {
      if (!blob) { toast("Already deleted"); return; }
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = window.siftahVault.extOf(item.name || ("siftah-" + item.id), item.mime || blob.type);
      document.body.appendChild(a);
      a.click();
      a.remove();
    }).catch(function () { toast("Download failed"); });
  }
  function openVault(item) {
    var lb = document.getElementById("siftahLightbox");
    var box = document.getElementById("lbMedia");
    if (!lb || !box) return;
    function show(url) {
      if (item.kind === "video") box.innerHTML = '<video src="' + url + '" controls autoplay playsinline></video>';
      else if (groupOf(item.kind) === "file") box.innerHTML = '<div class="placeholder">' + esc(item.name) + "</div>";
      else box.innerHTML = '<img id="lbImg" src="' + url + '" alt="">';
      lb.classList.add("on");
    }
    if (!window.siftahVault) { if (item.dataUrl) show(item.dataUrl); return; }
    window.siftahVault.get(item.id).then(function (blob) {
      show(blob ? URL.createObjectURL(blob) : (item.thumb || item.dataUrl || ""));
    }).catch(function () { if (item.thumb) show(item.thumb); });
  }
  function showPreview(el, blob) {
    blobToDataUrl(blob).then(function (url) { el.innerHTML = '<img src="' + url + '" alt="result">'; });
  }
  var hfClientPromise = null, hfClientToken = null;
  function loadHFClient(t) {
    if (!t) return Promise.reject(new Error("Add a Hugging Face token with Inference Providers permission."));
    if (hfClientPromise && hfClientToken === t) return hfClientPromise;
    hfClientToken = t;
    hfClientPromise = import("https://cdn.jsdelivr.net/npm/@huggingface/inference@3/+esm")
      .then(function (mod) {
        var Client = mod.InferenceClient || mod.HfInference || mod.default;
        if (!Client) throw new Error("Hugging Face InferenceClient could not be loaded.");
        return new Client(t);
      })
      .catch(function (err) {
        hfClientPromise = null;
        hfClientToken = null;
        throw err;
      });
    return hfClientPromise;
  }

  async function imageBlobAsPng(blob) {
    if (!blob) throw new Error("No image to copy.");
    if (blob.type === "image/png") return blob;
    if (typeof createImageBitmap !== "function") throw new Error("Image clipboard is unavailable. Use Download instead.");
    var bitmap = await createImageBitmap(blob);
    var canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0);
    if (bitmap.close) bitmap.close();
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (png) { if (png) resolve(png); else reject(new Error("Could not prepare image for clipboard.")); }, "image/png");
    });
  }
  async function copyImageBlob(blob) {
    if (!navigator.clipboard || !window.ClipboardItem) throw new Error("Image clipboard needs a secure browser context. Use Download instead.");
    await navigator.clipboard.write([new window.ClipboardItem({ "image/png": await imageBlobAsPng(blob) })]);
    toast("Image copied");
  }
  async function copyPromptText(prompt) {
    if (!prompt) throw new Error("No prompt saved for this item.");
    if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error("Clipboard access is unavailable in this browser.");
    await navigator.clipboard.writeText(prompt);
    toast("Prompt copied");
  }
  function getGalleryBlob(item, usingVault) {
    if (usingVault && window.siftahVault) return window.siftahVault.get(item.id);
    if (item.dataUrl) return fetch(item.dataUrl).then(function (r) { return r.blob(); });
    return Promise.resolve(null);
  }

  function hordeKey() {
    try {
      var k = (localStorage.getItem("siftah_horde_key") || "").trim();
      return k || "0000000000";
    } catch (e) { return "0000000000"; }
  }
  function sniffImage(bytes) {
    if (bytes.length > 3 && bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
    if (bytes.length > 2 && bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
    if (bytes.length > 12 && bytes[0] === 0x52 && bytes[1] === 0x49) return "image/webp";
    return "image/webp";
  }
  function b64ToBlob(b64) {
    var bin = atob(b64.replace(/\s/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: sniffImage(bytes) });
  }
  function generateHorde(prompt, modelName, onStatus) {
    var headers = {
      "Content-Type": "application/json",
      "apikey": hordeKey(),
      "Client-Agent": "Siftah:1.0:looterscomputas.online"
    };
    return fetch("https://stablehorde.net/api/v2/generate/async", {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        prompt: prompt,
        params: { sampler_name: "k_euler", cfg_scale: 7, width: 512, height: 512, steps: 20, n: 1 },
        nsfw: true,
        censor_nsfw: false,
        models: [modelName],
        r2: false,
        shared: false
      })
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok || !j.id) throw new Error(j.message || ("AI Horde " + r.status));
        return j.id;
      });
    }).then(function (id) {
      var started = Date.now();
      function poll() {
        if (Date.now() - started > 180000) throw new Error("AI Horde timed out. Try again, or paste a personal key under Advanced.");
        return fetch("https://stablehorde.net/api/v2/generate/check/" + id, { headers: headers }).then(function (r) {
          return r.json();
        }).then(function (c) {
          if (c.faulted) throw new Error(c.message || "AI Horde worker failed");
          if (onStatus) onStatus(c);
          if (!c.done) return new Promise(function (res) { setTimeout(res, 3000); }).then(poll);
          return fetch("https://stablehorde.net/api/v2/generate/status/" + id, { headers: headers }).then(function (r) {
            return r.json();
          }).then(function (st) {
            var g = st && st.generations && st.generations[0];
            if (!g || !g.img) throw new Error((st && st.message) || "AI Horde returned no image");
            if (g.censored) throw new Error("AI Horde censored this one. A personal key helps.");
            if (g.img.indexOf("http") === 0) return fetch(g.img).then(function (r) { return r.blob(); });
            return b64ToBlob(g.img);
          });
        });
      }
      return poll();
    });
  }

  function ensureStudio() {
    if (document.getElementById("imageStudio")) return;
    var chatCol = document.querySelector(".chat-col");
    if (!chatCol) return;
    var studio = document.createElement("div");
    studio.id = "imageStudio";
    studio.innerHTML =
      '<div class="studio-heading" style="padding:10px 12px 4px;font-size:13px;font-weight:700;color:#f2f2f2">Da Vinci · Image Studio</div><div class="studio-tabs">' +
      '<button type="button" data-pane="create" class="on">Create</button>' +
      '<button type="button" data-pane="video">Video</button>' +
      '<button type="button" data-pane="edit">Edit</button>' +
      '<button type="button" data-pane="gallery">Gallery</button></div>' +
      '<div class="studio-pane on" id="paneCreate">' +
      "<label>Prompt</label><textarea id=\"studioCreatePrompt\" placeholder=\"Describe the image: subject, style, lighting, mood\u2026\"></textarea>" +
      "<label>Model</label><select id=\"studioCreateModel\">" +
      '<option value="Qwen/Qwen-Image">Qwen Image ★ recommended default</option>' +
      '<option value="black-forest-labs/FLUX.1-Krea-dev">FLUX.1 Krea Dev (non-commercial licence)</option>' +
      '<option value="black-forest-labs/FLUX.1-dev">FLUX.1 Dev (non-commercial licence)</option>' +
      '<option value="black-forest-labs/FLUX.1-schnell">FLUX.1 Schnell (fast)</option>' +
      '<option value="stabilityai/stable-diffusion-xl-base-1.0">SDXL 1.0</option>' +
      '<option value="horde:stable_diffusion">AI Horde · Stable Diffusion (free)</option>' +
      '<option value="horde:Deliberate">AI Horde · Deliberate (free)</option>' +
      '<option value="horde:AlbedoBase XL (SDXL)">AI Horde · AlbedoBase XL (free)</option></select>' +
      "<label>Hugging Face token</label>" +
      '<input id="studioFluxToken" type="password" placeholder="hf_... leave blank to use the chat token" autocomplete="off" style="width:100%;box-sizing:border-box;background:#12151c;border:1px solid var(--border,#2a2e38);color:#eee;border-radius:8px;padding:10px;font-size:13px">' +
      '<p class="studio-status">Uses Hugging Face Inference Providers with an HF token that has Make calls to Inference Providers permission. Qwen Image is the recommended default (Apache 2.0). FLUX.1 Krea Dev and FLUX.1 Dev are non-commercial models. AI Horde models are free: leave the key blank for the slow anonymous queue, or paste a personal key under Settings → Advanced.</p>' +
      '<div class="studio-actions"><button type="button" class="primary" id="studioCreateBtn">Generate</button></div>' +
      '<div class="studio-status" id="studioCreateStatus"></div>' +
      '<div class="studio-preview" id="studioCreatePreview"><div class="placeholder">Your image will appear here</div></div>' +
      '<div class="studio-actions" id="studioCreateActions" style="display:none">' +
      '<button type="button" id="studioCreateDl">⬇ Download</button>' +
      '<button type="button" id="studioCreateCopy">Copy image</button>' +
      '<button type="button" id="studioCreatePromptCopy">Copy prompt</button>' +
      '<button type="button" id="studioCreateEdit">Use in Edit</button></div></div>' +
      '<div class="studio-pane" id="paneEdit">' +
      "<label>Edit instruction</label><textarea id=\"studioEditPrompt\" placeholder=\"How should the image change?\"></textarea>" +
      "<label>Source image</label><div class=\"upload-row\">" +
      '<input type="file" id="studioEditFile" accept="image/*" style="display:none">' +
      '<button type="button" id="studioEditPick">Upload image</button>' +
      '<button type="button" id="studioEditClear">Clear</button>' +
      '<img class="upload-thumb" id="studioEditThumb" alt=""></div>' +
      "<label>Model</label><select id=\"studioEditModel\">" +
      '<option value="stabilityai/stable-diffusion-xl-base-1.0">SDXL 1.0 (I2I)</option>' +
      '<option value="black-forest-labs/FLUX.1-dev">FLUX.1 Dev</option></select>' +
      '<div class="studio-actions"><button type="button" class="primary" id="studioEditBtn">Apply edit</button></div>' +
      '<div class="studio-status" id="studioEditStatus"></div>' +
      '<div class="studio-preview" id="studioEditPreview"><div class="placeholder">Edited image will appear here</div></div>' +
      '<div class="studio-actions" id="studioEditActions" style="display:none">' +
      '<button type="button" id="studioEditDl">⬇ Download</button>' +
      '<button type="button" id="studioEditCopy">Copy image</button>' +
      '<button type="button" id="studioEditPromptCopy">Copy prompt</button>' +
      '<button type="button" id="studioEditReedit">Edit again</button></div></div>' +
      '<div class="studio-pane" id="paneVideo">' +
      "<label>Prompt</label><textarea id=\"studioVidPrompt\" placeholder=\"What should the video show? Subject, motion, camera, mood\u2026\"></textarea>" +
      "<label>Model</label><select id=\"studioVidModel\">" +
      '<option value="Wan-AI/Wan2.1-T2V-1.3B">Wan 2.1 1.3B (faster)</option>' +
      '<option value="Wan-AI/Wan2.1-T2V-14B">Wan 2.1 14B</option>' +
      '<option value="tencent/HunyuanVideo">HunyuanVideo</option></select>' +
      '<p class="studio-status">Video uses the FLUX token if you set one, otherwise the chat token. It is saved in your on-device Gallery for 30 days.</p>' +
      '<div class="studio-actions"><button type="button" class="primary" id="studioVidBtn">Generate video</button></div>' +
      '<div class="studio-status" id="studioVidStatus"></div>' +
      '<div class="studio-preview" id="studioVidPreview"><div class="placeholder">Your video will appear here</div></div>' +
      '<div class="studio-actions" id="studioVidActions" style="display:none">' +
      '<button type="button" id="studioVidDl">Download</button></div></div>' +
      '<div class="studio-pane" id="paneGallery">' +
      '<p class="vault-legend" id="vaultLegend">Saved privately in this browser for 30 days. Nothing is uploaded to a Siftah gallery server. <span class="dot g"></span>recent <span class="dot o"></span>older than 15 days <span class="dot r"></span>less than 24 hours left. Download anything you want to keep.</p>' +
      '<div class="gallery-toolbar">' +
      '<span id="studioGalleryCount" class="gallery-count">0 saved</span>' +
      '<input type="search" id="gallerySearch" placeholder="Search gallery…">' +
      '<div class="gallery-filters" id="vaultFilters">' +
      '<button type="button" data-f="all" class="on">All</button>' +
      '<button type="button" data-f="image">Images</button>' +
      '<button type="button" data-f="video">Videos</button>' +
      '<button type="button" data-f="file">Files</button>' +
      '<button type="button" data-f="soon">Deleting soon</button></div></div>' +
      '<div class="studio-actions" style="margin-top:0">' +
      '<button type="button" id="vaultUploadBtn">Add files</button>' +
      '<input type="file" id="vaultUpload" multiple style="display:none">' +
      '<button type="button" id="vaultDownloadAll">Download all</button>' +
      '<button type="button" id="galleryRefresh">Refresh</button>' +
      '<button type="button" id="galleryClear">Clear</button></div>' +
      '<div class="gallery-grid" id="galleryGrid"></div></div>';
    chatCol.appendChild(studio);

    if (!document.getElementById("siftahLightbox")) {
      var lb = document.createElement("div");
      lb.id = "siftahLightbox"; lb.className = "lightbox";
      lb.innerHTML = '<button type="button" class="lb-close" id="lbClose">\u2715</button><div id="lbMedia"></div>';
      document.body.appendChild(lb);
      lb.onclick = function (e) { if (e.target === lb || e.target.id === "lbClose") lb.classList.remove("on"); };
    }

    studio.querySelectorAll(".studio-tabs button").forEach(function (btn) {
      btn.onclick = function () {
        studio.querySelectorAll(".studio-tabs button").forEach(function (b) { b.classList.remove("on"); });
        studio.querySelectorAll(".studio-pane").forEach(function (p) { p.classList.remove("on"); });
        btn.classList.add("on");
        var pane = btn.getAttribute("data-pane");
        var id = pane === "create" ? "paneCreate" : pane === "edit" ? "paneEdit" : pane === "video" ? "paneVideo" : "paneGallery";
        document.getElementById(id).classList.add("on");
        if (btn.getAttribute("data-pane") === "gallery") renderGallery();
      };
    });
    wireLogic();
  }

  function wireLogic() {
    if (document.getElementById("studioCreateBtn").__wired) return;
    document.getElementById("studioCreateBtn").__wired = true;
    var fluxIn = document.getElementById("studioFluxToken");
    if (fluxIn) {
      try { fluxIn.value = localStorage.getItem("siftah_flux_token") || ""; } catch (e) {}
      function saveStudioFlux() {
        try { localStorage.setItem("siftah_flux_token", fluxIn.value.trim()); } catch (e) {}
        var settingsFlux = document.getElementById("fluxToken");
        if (settingsFlux && settingsFlux.value !== fluxIn.value) settingsFlux.value = fluxIn.value;
      }
      fluxIn.addEventListener("change", saveStudioFlux);
      fluxIn.addEventListener("blur", saveStudioFlux);
    }

    document.getElementById("studioCreateBtn").onclick = async function () {
      var prompt = (document.getElementById("studioCreatePrompt").value || "").trim();
      if (!prompt) { toast("Enter a prompt"); return; }
      var model = document.getElementById("studioCreateModel").value;
      var isHorde = model.indexOf("horde:") === 0;
      var t = token();
      if (!isHorde && !t) {
        toast("Add a FLUX token in the box above, or a chat token under Advanced");
        if (typeof openSettings === "function") {
          openSettings();
          var sheet = document.querySelector(".sheet-body");
          if (sheet) sheet.classList.add("show-advanced");
          var adv = document.getElementById("toggleAdvanced");
          if (adv) adv.textContent = "Hide advanced";
        }
        return;
      }
      var btn = document.getElementById("studioCreateBtn");
      var status = document.getElementById("studioCreateStatus");
      var preview = document.getElementById("studioCreatePreview");
      btn.disabled = true;
      status.textContent = isHorde ? "Queued on AI Horde\u2026 free, so it can take a minute" : "Generating\u2026 (10\u201360s)";
      preview.innerHTML = '<div class="placeholder">Working\u2026</div>';
      document.getElementById("studioCreateActions").style.display = "none";
      try {
        if (isHorde) {
          lastCreateBlob = await generateHorde(prompt, model.slice(6), function (c) {
            var pos = c && c.queue_position ? " \u00b7 position " + c.queue_position : "";
            status.textContent = (c && c.processing) ? "A free worker is drawing\u2026" : ("Waiting in the free queue" + pos);
          });
        } else {
          var client = await loadHFClient(t);
          var out = await client.textToImage({ model: model, inputs: prompt, provider: "auto" });
          lastCreateBlob = await normalizeOut(out);
        }
        showPreview(preview, lastCreateBlob);
        document.getElementById("studioCreateActions").style.display = "flex";
        status.textContent = "Done · saved to Gallery for 30 days";
        var url = await blobToDataUrl(lastCreateBlob);
        if (window.siftahModes) window.siftahModes.addToGallery(url, prompt, "t2i");
      } catch (e) {
        status.textContent = e.message || String(e);
        preview.innerHTML = '<div class="placeholder">Failed</div>';
        toast(status.textContent);
      } finally { btn.disabled = false; }
    };

    document.getElementById("studioCreateDl").onclick = function () {
      if (!lastCreateBlob) return;
      var url = URL.createObjectURL(lastCreateBlob);
      var a = document.createElement("a"); a.href = url;
      a.download = "siftah-" + Date.now() + ".png"; a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
    };
    document.getElementById("studioCreateCopy").onclick = async function () {
      try { await copyImageBlob(lastCreateBlob); } catch (e) { toast(e.message || String(e)); }
    };
    document.getElementById("studioCreatePromptCopy").onclick = async function () {
      try { await copyPromptText(document.getElementById("studioCreatePrompt").value.trim()); } catch (e) { toast(e.message || String(e)); }
    };
    document.getElementById("studioCreateEdit").onclick = function () {
      if (!lastCreateBlob) return;
      editSourceBlob = lastCreateBlob;
      var thumb = document.getElementById("studioEditThumb");
      blobToDataUrl(lastCreateBlob).then(function (u) { thumb.src = u; thumb.style.display = "block"; });
      document.querySelectorAll(".studio-tabs button").forEach(function (b) {
        b.classList.toggle("on", b.getAttribute("data-pane") === "edit");
      });
      document.querySelectorAll(".studio-pane").forEach(function (p) { p.classList.remove("on"); });
      document.getElementById("paneEdit").classList.add("on");
      toast("Loaded into Edit");
    };

    document.getElementById("studioEditPick").onclick = function () { document.getElementById("studioEditFile").click(); };
    document.getElementById("studioEditFile").onchange = function (e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      editSourceBlob = f;
      var thumb = document.getElementById("studioEditThumb");
      blobToDataUrl(f).then(function (u) { thumb.src = u; thumb.style.display = "block"; });
    };
    document.getElementById("studioEditClear").onclick = function () {
      editSourceBlob = null; document.getElementById("studioEditFile").value = "";
      var thumb = document.getElementById("studioEditThumb"); thumb.removeAttribute("src"); thumb.style.display = "none";
    };

    document.getElementById("studioEditBtn").onclick = async function () {
      var t = token();
      if (!t) { toast("Add HF token in Settings"); if (typeof openSettings === "function") openSettings(); return; }
      if (!editSourceBlob) { toast("Upload or load a source image"); return; }
      var prompt = (document.getElementById("studioEditPrompt").value || "").trim() || "enhance details, high quality";
      var model = document.getElementById("studioEditModel").value;
      var btn = document.getElementById("studioEditBtn");
      var status = document.getElementById("studioEditStatus");
      var preview = document.getElementById("studioEditPreview");
      btn.disabled = true; status.textContent = "Editing\u2026 (20\u201390s)";
      preview.innerHTML = '<div class="placeholder">Working\u2026</div>';
      document.getElementById("studioEditActions").style.display = "none";
      try {
        var client = await loadHFClient(t);
        var out = await client.imageToImage({ model: model, inputs: editSourceBlob, parameters: { prompt: prompt } });
        lastEditBlob = await normalizeOut(out);
        showPreview(preview, lastEditBlob);
        document.getElementById("studioEditActions").style.display = "flex";
        status.textContent = "Done · saved to Gallery for 30 days";
        var url = await blobToDataUrl(lastEditBlob);
        if (window.siftahModes) window.siftahModes.addToGallery(url, prompt, "i2i");
      } catch (e) {
        status.textContent = e.message || String(e);
        preview.innerHTML = '<div class="placeholder">Failed \u2014 try SDXL</div>';
        toast(status.textContent);
      } finally { btn.disabled = false; }
    };

    document.getElementById("studioEditDl").onclick = function () {
      if (!lastEditBlob) return;
      var url = URL.createObjectURL(lastEditBlob);
      var a = document.createElement("a"); a.href = url;
      a.download = "siftah-edit-" + Date.now() + ".png"; a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
    };
    document.getElementById("studioEditCopy").onclick = async function () {
      try { await copyImageBlob(lastEditBlob); } catch (e) { toast(e.message || String(e)); }
    };
    document.getElementById("studioEditPromptCopy").onclick = async function () {
      try { await copyPromptText(document.getElementById("studioEditPrompt").value.trim()); } catch (e) { toast(e.message || String(e)); }
    };
    document.getElementById("studioEditReedit").onclick = function () {
      if (!lastEditBlob) return;
      editSourceBlob = lastEditBlob;
      var thumb = document.getElementById("studioEditThumb");
      blobToDataUrl(lastEditBlob).then(function (u) { thumb.src = u; thumb.style.display = "block"; });
      toast("Output set as new source");
    };

    document.getElementById("studioVidBtn").onclick = async function () {
      var t = token();
      if (!t) { toast("Add a token under Create, or a chat token under Advanced"); return; }
      var prompt = (document.getElementById("studioVidPrompt").value || "").trim();
      if (!prompt) { toast("Enter a prompt"); return; }
      var model = document.getElementById("studioVidModel").value;
      var btn = document.getElementById("studioVidBtn");
      var status = document.getElementById("studioVidStatus");
      var preview = document.getElementById("studioVidPreview");
      btn.disabled = true;
      status.textContent = "Generating video\u2026 this can take a few minutes";
      preview.innerHTML = '<div class="placeholder">Working\u2026 stay on this screen</div>';
      document.getElementById("studioVidActions").style.display = "none";
      try {
        var client = await loadHFClient(t);
        var out = await client.textToVideo({ model: model, inputs: prompt, provider: "auto" });
        lastVidBlob = await normalizeVideo(out);
        var url = URL.createObjectURL(lastVidBlob);
        preview.innerHTML = '<video src="' + url + '" controls autoplay loop playsinline></video>';
        document.getElementById("studioVidActions").style.display = "flex";
        status.textContent = "Done \u2014 saved in Files for 24 hours";
        if (window.siftahVault) {
          window.siftahVault.add(lastVidBlob, { kind: "video", prompt: prompt, name: "siftah-" + Date.now() + ".mp4", mime: lastVidBlob.type || "video/mp4" });
        }
      } catch (e) {
        status.textContent = e.message || String(e);
        preview.innerHTML = '<div class="placeholder">Failed</div>';
        toast(status.textContent);
      } finally { btn.disabled = false; }
    };
    document.getElementById("studioVidDl").onclick = function () {
      if (!lastVidBlob) return;
      var a = document.createElement("a");
      a.href = URL.createObjectURL(lastVidBlob);
      a.download = "siftah-" + Date.now() + ".mp4";
      a.click();
    };

    var up = document.getElementById("vaultUpload");
    document.getElementById("vaultUploadBtn").onclick = function () { up.click(); };
    up.onchange = function (e) {
      var files = e.target.files ? Array.prototype.slice.call(e.target.files) : [];
      files.forEach(function (f) {
        var kind = (f.type || "").indexOf("video/") === 0 ? "video" : (f.type || "").indexOf("image/") === 0 ? "image" : "file";
        if (window.siftahVault) window.siftahVault.add(f, { kind: kind, prompt: f.name, name: f.name, mime: f.type });
      });
      up.value = "";
      toast(files.length ? "Saved on this device" : "No file");
    };
    document.getElementById("vaultDownloadAll").onclick = function () {
      var items = window.siftahVault ? window.siftahVault.list() : [];
      if (!items.length) { toast("Nothing saved"); return; }
      items.forEach(function (item, i) {
        setTimeout(function () { downloadVault(item); }, i * 400);
      });
    };
    var search = document.getElementById("gallerySearch");
    if (search) search.oninput = function () { renderGallery(); };
    var filters = document.getElementById("vaultFilters");
    if (filters) filters.querySelectorAll("button").forEach(function (b) {
      b.onclick = function () {
        filters.querySelectorAll("button").forEach(function (x) { x.classList.toggle("on", x === b); });
        window.__galFilter = b.getAttribute("data-f");
        renderGallery();
      };
    });
    if (window.siftahVault && !window.__vaultGalHook) {
      window.__vaultGalHook = true;
      window.siftahVault.onChange(function () { renderGallery(); });
    }

    document.getElementById("galleryRefresh").onclick = function () {
      if (window.siftahVault) window.siftahVault.refresh();
      renderGallery();
    };
    document.getElementById("galleryClear").onclick = function () {
      if (!confirm("Delete everything saved on this device?")) return;
      if (window.siftahModes) window.siftahModes.saveGallery([]);
      if (window.siftahVault) window.siftahVault.clear();
      else renderGallery();
    };
  }

  function renderGallery() {
    var grid = document.getElementById("galleryGrid");
    if (!grid) return;
    var usingVault = !!window.siftahVault;
    var items = usingVault ? window.siftahVault.list() : (window.siftahModes ? window.siftahModes.loadGallery() : []);
    var f = window.__galFilter || "all";
    var q = "";
    var search = document.getElementById("gallerySearch");
    if (search) q = (search.value || "").toLowerCase();
    else q = window.__galQuery || "";
    items = items.filter(function (item) {
      var g = groupOf(item.kind);
      if (f === "image" && g !== "image") return false;
      if (f === "video" && g !== "video") return false;
      if (f === "file" && g !== "file") return false;
      if (f === "t2i" && item.kind !== "t2i") return false;
      if (f === "i2i" && item.kind !== "i2i") return false;
      if (f === "fav" && !item.fav) return false;
      if (f === "soon" && usingVault && window.siftahVault.tone(item) !== "red") return false;
      if (q) {
        var hay = ((item.prompt || "") + " " + (item.name || "") + " " + (item.kind || "")).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    var count = document.getElementById("studioGalleryCount");
    if (count) {
      var n = usingVault ? window.siftahVault.list().length : items.length;
      count.textContent = n + " saved";
    }
    if (!items.length) {
      grid.innerHTML = '<div class="gallery-empty">Your gallery is ready. Generate an image or video, edit an upload, or add files to start building your collection. Items stay on this device for 30 days.</div>';
      return;
    }
    grid.innerHTML = "";
    var now = Date.now();
    items.forEach(function (item) {
      var age = usingVault ? window.siftahVault.tone(item, now) : "green";
      var label = usingVault ? window.siftahVault.badge(item, now) : "Just made";
      var g = groupOf(item.kind);
      var card = document.createElement("div");
      card.className = "gallery-card age-" + age;
      var thumb = item.thumb || item.dataUrl || "";
      var visual;
      if (thumb.indexOf("data:image") === 0) {
        visual = '<div class="thumb-wrap"><img src="' + thumb + '" alt=""><div class="wash"></div><div class="age-badge">' + esc(label) + "</div></div>";
      } else {
        var mark = g === "video" ? "VIDEO" : (g === "file" ? "FILE" : "IMG");
        visual = '<div class="thumb-wrap"><div class="file-tile">' + mark + "<span>" + esc(item.name || item.kind || "") + '</span></div><div class="wash"></div><div class="age-badge">' + esc(label) + "</div></div>";
      }
      var actions = '<button type="button" data-act="view">View</button><button type="button" data-act="dl">Download</button><button type="button" data-act="prompt">Copy prompt</button>';
      if (g === "image") actions += '<button type="button" data-act="copy">Copy image</button><button type="button" data-act="edit">Edit</button>';
      actions += '<button type="button" data-act="del">Delete</button>';
      card.innerHTML = visual + '<div class="meta">' + esc(item.prompt || item.name || item.kind || "file") + "</div>" + '<div class="g-actions">' + actions + "</div>";
      card.querySelector('[data-act="view"]').onclick = function (e) {
        e.stopPropagation();
        if (usingVault) openVault(item);
        else if (item.dataUrl) {
          var box = document.getElementById("lbMedia");
          if (box) box.innerHTML = '<img id="lbImg" src="' + item.dataUrl + '" alt="">';
          document.getElementById("siftahLightbox").classList.add("on");
        }
      };
      var promptBtn = card.querySelector('[data-act="prompt"]');
      if (promptBtn) promptBtn.onclick = function (e) {
        e.stopPropagation();
        copyPromptText(item.prompt || "").catch(function (err) { toast(err.message || String(err)); });
      };
      var copyBtn = card.querySelector('[data-act="copy"]');
      if (copyBtn) copyBtn.onclick = function (e) {
        e.stopPropagation();
        getGalleryBlob(item, usingVault).then(copyImageBlob).catch(function (err) { toast(err.message || String(err)); });
      };
      var editBtn = card.querySelector('[data-act="edit"]');
      if (editBtn) editBtn.onclick = function (e) {
        e.stopPropagation();
        var src = usingVault ? window.siftahVault.get(item.id) : fetch(item.dataUrl).then(function (r) { return r.blob(); });
        Promise.resolve(src).then(function (b) {
          if (!b) return;
          editSourceBlob = b;
          var thumbEl = document.getElementById("studioEditThumb");
          var u = URL.createObjectURL(b);
          thumbEl.src = u;
          thumbEl.style.display = "block";
          document.querySelectorAll(".studio-tabs button").forEach(function (btn) {
            btn.classList.toggle("on", btn.getAttribute("data-pane") === "edit");
          });
          document.querySelectorAll(".studio-pane").forEach(function (p) { p.classList.remove("on"); });
          document.getElementById("paneEdit").classList.add("on");
          toast("Loaded into Edit");
        });
      };
      card.querySelector('[data-act="dl"]').onclick = function (e) {
        e.stopPropagation();
        if (usingVault) downloadVault(item);
        else if (item.dataUrl) {
          var a = document.createElement("a");
          a.href = item.dataUrl;
          a.download = "siftah-" + item.id + ".png";
          a.click();
        }
      };
      card.querySelector('[data-act="del"]').onclick = function (e) {
        e.stopPropagation();
        if (usingVault) window.siftahVault.remove(item.id);
        else {
          var next = (window.siftahModes ? window.siftahModes.loadGallery() : []).filter(function (x) { return x.id !== item.id; });
          if (window.siftahModes) window.siftahModes.saveGallery(next);
          renderGallery();
        }
      };
      grid.appendChild(card);
    });
  }

  window.siftahModesStudio = { ensureStudio: ensureStudio, renderGallery: renderGallery };
  setTimeout(function () {
    if (document.body.classList.contains("mode-images")) {
      ensureStudio();
      renderGallery();
    }
  }, 300);
})();
