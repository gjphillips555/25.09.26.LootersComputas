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
  async function checkMediaAccess() {
    if (window.siftahAccess && window.siftahAccess.ready) await window.siftahAccess.ready;
    var response = await fetch("/api/siftah/chat", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status" })
    });
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(data.error || "Sign in or start a guest trial to continue.");
    if (data.isAdmin) return data;
    var usage = data.usage || {};
    if (data.mode === "guest") {
      var used = Number(usage.superSaiyanUsed || 0) + Number(usage.siftahUsed || 0);
      var limit = Number.isFinite(Number(data.trialLimit)) ? Number(data.trialLimit) : 10;
      if ((usage.cooldownUntil && Date.parse(usage.cooldownUntil) > Date.now()) || used >= limit) {
        throw new Error("Your guest trial is used. It resets after a five-hour cooldown.");
      }
    } else if (data.mode === "account" && Number(usage.creditsBalance || 0) < 2) {
      throw new Error("Add Credits through PayPal to continue with image or video requests.");
    }
    return data;
  }
  async function consumeMedia() {
    var response = await fetch("/api/siftah/chat", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "media_access" })
    });
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(data.error || "Siftah access is unavailable.");
    if (window.siftahAccess) void window.siftahAccess.refresh();
    return data;
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
    if (!t) return Promise.reject(new Error("The image service is not available right now."));
    if (hfClientPromise && hfClientToken === t) return hfClientPromise;
    hfClientToken = t;
    hfClientPromise = import("https://cdn.jsdelivr.net/npm/@huggingface/inference@3/+esm")
      .then(function (mod) {
        var Client = mod.InferenceClient || mod.HfInference || mod.default;
        if (!Client) throw new Error("The image service is temporarily unavailable.");
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
        if (!r.ok || !j.id) throw new Error(j.message || ("image queue " + r.status));
        return j.id;
      });
    }).then(function (id) {
      var started = Date.now();
      function poll() {
        if (Date.now() - started > 180000) throw new Error("The image queue timed out. Please try again.");
        return fetch("https://stablehorde.net/api/v2/generate/check/" + id, { headers: headers }).then(function (r) {
          return r.json();
        }).then(function (c) {
          if (c.faulted) throw new Error(c.message || "Image worker failed");
          if (onStatus) onStatus(c);
          if (!c.done) return new Promise(function (res) { setTimeout(res, 3000); }).then(poll);
          return fetch("https://stablehorde.net/api/v2/generate/status/" + id, { headers: headers }).then(function (r) {
            return r.json();
          }).then(function (st) {
            var g = st && st.generations && st.generations[0];
            if (!g || !g.img) throw new Error((st && st.message) || "No image was returned");
            if (g.censored) throw new Error("This image request could not be completed.");
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
      "<label>Style</label><select id=\"studioCreateModel\">" +
      '<option value="Qwen/Qwen-Image">Default</option>' +
      '<option value="black-forest-labs/FLUX.1-Krea-dev">Creative</option>' +
      '<option value="black-forest-labs/FLUX.1-dev">High detail</option>' +
      '<option value="black-forest-labs/FLUX.1-schnell">Fast</option>' +
      '<option value="stabilityai/stable-diffusion-xl-base-1.0">Standard</option>' +
      '<option value="horde:stable_diffusion">Queue option A</option>' +
      '<option value="horde:Deliberate">Queue option B</option>' +
      '<option value="horde:AlbedoBase XL (SDXL)">Queue option C</option></select>' +
      '<p class="studio-status">Prompts and uploaded images may be processed by external AI services. Read the Terms and Conditions before uploading private or sensitive material.</p>' +
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
      "<label>Style</label><select id=\"studioEditModel\">" +
      '<option value="stabilityai/stable-diffusion-xl-base-1.0">Standard edit</option>' +
      '<option value="black-forest-labs/FLUX.1-dev">Detailed</option></select>' +
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
      "<label>Style</label><select id=\"studioVidModel\">" +
      '<option value="Wan-AI/Wan2.1-T2V-1.3B">Fast video</option>' +
      '<option value="Wan-AI/Wan2.1-T2V-14B">Detailed video</option>' +
      '<option value="tencent/Cinematic video">Cinematic video</option></select>' +
      '<p class="studio-status">Video creation uses external services and may take a few minutes. Results are saved privately in this browser for 30 days.</p>' +
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
        studio.querySelectorAll(".studio-tabs button").forEach(function (b) { b.classList.toggle("on", b === btn); });
        studio.querySelectorAll(".studio-pane").forEach(function (p) { p.classList.remove("on"); });
        var pane = document.getElementById("pane" + btn.getAttribute("data-pane").charAt(0).toUpperCase() + btn.getAttribute("data-pane").slice(1));
        if (pane) pane.classList.add("on");
        if (btn.getAttribute("data-pane") === "gallery") renderGallery();
      };
    });

    document.getElementById("studioCreateBtn").onclick = async function () {
      var prompt = document.getElementById("studioCreatePrompt").value.trim();
      if (!prompt) { toast("Enter a prompt"); return; }
      var status = document.getElementById("studioCreateStatus");
      var preview = document.getElementById("studioCreatePreview");
      var actions = document.getElementById("studioCreateActions");
      status.textContent = "Checking access…";
      try {
        await checkMediaAccess();
        await consumeMedia();
        status.textContent = "Generating…";
        var model = document.getElementById("studioCreateModel").value;
        var blob;
        if (model.indexOf("horde:") === 0) {
          blob = await generateHorde(prompt, model.slice(6), function (c) {
            status.textContent = "Queue: " + (c.queue_position != null ? "#" + c.queue_position : "working") + (c.wait_time ? " · ~" + c.wait_time + "s" : "");
          });
        } else {
          var client = await loadHFClient(token());
          var out = await client.textToImage({ model: model, inputs: prompt });
          blob = await normalizeOut(out);
        }
        lastCreateBlob = blob;
        showPreview(preview, blob);
        actions.style.display = "flex";
        status.textContent = "Done";
        if (window.siftahModes) {
          blobToDataUrl(blob).then(function (url) {
            window.siftahModes.addToGallery(url, prompt, "t2i");
          });
        }
      } catch (err) {
        status.textContent = err && err.message ? err.message : "Generate failed";
        toast(status.textContent);
      }
    };

    document.getElementById("studioCreateDl").onclick = function () {
      if (!lastCreateBlob) return;
      var a = document.createElement("a");
      a.href = URL.createObjectURL(lastCreateBlob);
      a.download = "siftah-create-" + Date.now() + ".png";
      a.click();
    };
    document.getElementById("studioCreateCopy").onclick = function () {
      if (!lastCreateBlob) return;
      copyImageBlob(lastCreateBlob).catch(function (e) { toast(e.message || String(e)); });
    };
    document.getElementById("studioCreatePromptCopy").onclick = function () {
      copyPromptText(document.getElementById("studioCreatePrompt").value).catch(function (e) { toast(e.message || String(e)); });
    };
    document.getElementById("studioCreateEdit").onclick = function () {
      if (!lastCreateBlob) return;
      editSourceBlob = lastCreateBlob;
      var thumb = document.getElementById("studioEditThumb");
      thumb.src = URL.createObjectURL(lastCreateBlob);
      thumb.style.display = "block";
      document.querySelectorAll(".studio-tabs button").forEach(function (b) {
        b.classList.toggle("on", b.getAttribute("data-pane") === "edit");
      });
      document.querySelectorAll(".studio-pane").forEach(function (p) { p.classList.remove("on"); });
      document.getElementById("paneEdit").classList.add("on");
    };

    document.getElementById("studioEditPick").onclick = function () { document.getElementById("studioEditFile").click(); };
    document.getElementById("studioEditFile").onchange = function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      editSourceBlob = f;
      var thumb = document.getElementById("studioEditThumb");
      thumb.src = URL.createObjectURL(f);
      thumb.style.display = "block";
    };
    document.getElementById("studioEditClear").onclick = function () {
      editSourceBlob = null;
      var thumb = document.getElementById("studioEditThumb");
      thumb.removeAttribute("src");
      thumb.style.display = "none";
      document.getElementById("studioEditFile").value = "";
    };
    document.getElementById("studioEditBtn").onclick = async function () {
      var instruction = document.getElementById("studioEditPrompt").value.trim();
      if (!instruction) { toast("Enter an edit instruction"); return; }
      if (!editSourceBlob) { toast("Upload or select a source image"); return; }
      var status = document.getElementById("studioEditStatus");
      var preview = document.getElementById("studioEditPreview");
      var actions = document.getElementById("studioEditActions");
      status.textContent = "Checking access…";
      try {
        await checkMediaAccess();
        await consumeMedia();
        status.textContent = "Editing…";
        var client = await loadHFClient(token());
        var model = document.getElementById("studioEditModel").value;
        var out = await client.imageToImage({
          model: model,
          inputs: editSourceBlob,
          parameters: { prompt: instruction }
        });
        var blob = await normalizeOut(out);
        lastEditBlob = blob;
        showPreview(preview, blob);
        actions.style.display = "flex";
        status.textContent = "Done";
        if (window.siftahModes) {
          blobToDataUrl(blob).then(function (url) {
            window.siftahModes.addToGallery(url, instruction, "edit");
          });
        }
      } catch (err) {
        status.textContent = err && err.message ? err.message : "Edit failed";
        toast(status.textContent);
      }
    };
    document.getElementById("studioEditDl").onclick = function () {
      if (!lastEditBlob) return;
      var a = document.createElement("a");
      a.href = URL.createObjectURL(lastEditBlob);
      a.download = "siftah-edit-" + Date.now() + ".png";
      a.click();
    };
    document.getElementById("studioEditCopy").onclick = function () {
      if (!lastEditBlob) return;
      copyImageBlob(lastEditBlob).catch(function (e) { toast(e.message || String(e)); });
    };
    document.getElementById("studioEditPromptCopy").onclick = function () {
      copyPromptText(document.getElementById("studioEditPrompt").value).catch(function (e) { toast(e.message || String(e)); });
    };
    document.getElementById("studioEditReedit").onclick = function () {
      if (!lastEditBlob) return;
      editSourceBlob = lastEditBlob;
      var thumb = document.getElementById("studioEditThumb");
      thumb.src = URL.createObjectURL(lastEditBlob);
      thumb.style.display = "block";
      toast("Loaded last edit as source");
    };

    document.getElementById("studioVidBtn").onclick = async function () {
      var prompt = document.getElementById("studioVidPrompt").value.trim();
      if (!prompt) { toast("Enter a video prompt"); return; }
      var status = document.getElementById("studioVidStatus");
      var preview = document.getElementById("studioVidPreview");
      var actions = document.getElementById("studioVidActions");
      status.textContent = "Checking access…";
      try {
        await checkMediaAccess();
        await consumeMedia();
        status.textContent = "Generating video (this can take a few minutes)…";
        var client = await loadHFClient(token());
        var model = document.getElementById("studioVidModel").value;
        var out = await client.textToVideo({ model: model, inputs: prompt });
        var blob = await normalizeVideo(out);
        lastVidBlob = blob;
        var url = URL.createObjectURL(blob);
        preview.innerHTML = '<video src="' + url + '" controls autoplay playsinline></video>';
        actions.style.display = "flex";
        status.textContent = "Done";
        if (window.siftahVault) {
          window.siftahVault.add(blob, {
            kind: "video",
            prompt: prompt,
            name: "siftah-video-" + Date.now() + ".mp4",
            mime: blob.type || "video/mp4"
          }).then(function () { if (window.siftahModesStudio) window.siftahModesStudio.renderGallery(); });
        }
      } catch (err) {
        status.textContent = err && err.message ? err.message : "Video failed";
        toast(status.textContent);
      }
    };
    document.getElementById("studioVidDl").onclick = function () {
      if (!lastVidBlob) return;
      var a = document.createElement("a");
      a.href = URL.createObjectURL(lastVidBlob);
      a.download = "siftah-video-" + Date.now() + ".mp4";
      a.click();
    };

    document.getElementById("vaultUploadBtn").onclick = function () { document.getElementById("vaultUpload").click(); };
    document.getElementById("vaultUpload").onchange = function (e) {
      var files = e.target.files;
      if (!files || !files.length || !window.siftahVault) return;
      Array.prototype.forEach.call(files, function (f) {
        window.siftahVault.add(f, {
          kind: f.type.indexOf("video") === 0 ? "video" : f.type.indexOf("image") === 0 ? "image" : "file",
          prompt: "",
          name: f.name,
          mime: f.type
        }).then(function () { renderGallery(); });
      });
      e.target.value = "";
    };
    document.getElementById("galleryRefresh").onclick = function () { renderGallery(); };
    document.getElementById("galleryClear").onclick = function () {
      if (!confirm("Clear all saved gallery items in this browser?")) return;
      if (window.siftahVault) window.siftahVault.clear();
      else if (window.siftahModes) window.siftahModes.saveGallery([]);
      renderGallery();
    };
    document.getElementById("vaultDownloadAll").onclick = function () {
      if (window.siftahVault && window.siftahVault.downloadAll) window.siftahVault.downloadAll();
      else toast("Vault download not available");
    };
    var search = document.getElementById("gallerySearch");
    if (search) search.oninput = function () { renderGallery(); };
    document.getElementById("vaultFilters").querySelectorAll("button").forEach(function (btn) {
      btn.onclick = function () {
        document.getElementById("vaultFilters").querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b === btn); });
        renderGallery();
      };
    });
  }

  function renderGallery() {
    var grid = document.getElementById("galleryGrid");
    if (!grid) return;
    var usingVault = !!(window.siftahVault);
    var items = usingVault ? (window.siftahVault.list ? window.siftahVault.list() : []) : (window.siftahModes ? window.siftahModes.loadGallery() : []);
    var filterBtn = document.querySelector("#vaultFilters button.on");
    var filter = filterBtn ? filterBtn.getAttribute("data-f") : "all";
    var q = (document.getElementById("gallerySearch") && document.getElementById("gallerySearch").value || "").toLowerCase().trim();
    if (filter && filter !== "all") {
      items = items.filter(function (it) {
        if (filter === "soon") {
          var created = it.created || it.ts;
          if (!created) return false;
          var age = Date.now() - new Date(created).getTime();
          return age > 29 * 24 * 3600 * 1000;
        }
        var k = groupOf(it.kind || "image");
        return k === filter;
      });
    }
    if (q) {
      items = items.filter(function (it) {
        return String(it.prompt || "").toLowerCase().indexOf(q) !== -1 || String(it.name || "").toLowerCase().indexOf(q) !== -1;
      });
    }
    var countEl = document.getElementById("studioGalleryCount");
    if (countEl) countEl.textContent = items.length + " saved";
    grid.innerHTML = "";
    if (!items.length) {
      grid.innerHTML = '<div class="gallery-empty">No items yet. Generate an image or add files.</div>';
      return;
    }
    items.forEach(function (item) {
      var card = document.createElement("div");
      card.className = "gallery-card";
      var ageClass = "";
      var created = item.created || item.ts;
      if (created) {
        var age = Date.now() - new Date(created).getTime();
        if (age > 29 * 24 * 3600 * 1000) ageClass = "age-red";
        else if (age > 15 * 24 * 3600 * 1000) ageClass = "age-orange";
        else ageClass = "age-green";
        card.className += " " + ageClass;
      }
      var thumb = item.thumb || item.dataUrl || "";
      var mediaHtml = item.kind === "video"
        ? '<div class="thumb-wrap"><video src="' + esc(thumb) + '" muted></video><div class="wash"></div></div>'
        : '<div class="thumb-wrap"><img src="' + esc(thumb) + '" alt=""><div class="wash"></div></div>';
      card.innerHTML = mediaHtml +
        '<div class="meta">' + esc((item.prompt || item.name || "").slice(0, 80)) + '</div>' +
        '<div class="g-actions">' +
        '<button type="button" data-act="open">Open</button>' +
        '<button type="button" data-act="copy">Copy</button>' +
        '<button type="button" data-act="edit">Edit</button>' +
        '<button type="button" data-act="dl">⬇</button>' +
        '<button type="button" data-act="del">🗑</button></div>';
      card.querySelector('[data-act="open"]').onclick = function (e) {
        e.stopPropagation();
        openVault(item);
      };
      card.querySelector('[data-act="copy"]').onclick = function (e) {
        e.stopPropagation();
        if (item.kind === "video") { toast("Use Download for video"); return; }
        getGalleryBlob(item, usingVault).then(copyImageBlob).catch(function (err) { toast(err.message || String(err)); });
      };
      var copyPromptBtn = card.querySelector('[data-act="copy"]');
      // prompt copy is via long-press or separate if needed
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
