/* Siftah Media Gen v3 — text/image → image + text/image → video */
(function () {
  "use strict";

  var IMAGE_MODELS = [
    { id: "Qwen/Qwen-Image", label: "Qwen Image - recommended default (T2I)", mode: "t2i" },
    { id: "black-forest-labs/FLUX.1-Krea-dev", label: "FLUX.1 Krea Dev - non-commercial licence (T2I)", mode: "t2i" },
    { id: "black-forest-labs/FLUX.1-dev", label: "FLUX.1 Dev (T2I)", mode: "t2i" },
    { id: "black-forest-labs/FLUX.1-schnell", label: "FLUX.1 Schnell - fast (T2I)", mode: "t2i" },
    { id: "stabilityai/stable-diffusion-xl-base-1.0", label: "SDXL 1.0 (T2I / I2I)", mode: "both" }
  ];

  var VIDEO_MODELS = [
    { id: "Wan-AI/Wan2.1-T2V-1.3B", label: "Wan 2.1 T2V 1.3B (text→video)", mode: "t2v", provider: "fal-ai" },
    { id: "Wan-AI/Wan2.1-I2V-14B-480P", label: "Wan 2.1 I2V 14B (image→video)", mode: "i2v", provider: "wavespeed" },
    { id: "tencent/HunyuanVideo", label: "HunyuanVideo (text→video)", mode: "t2v", provider: "fal-ai" },
    { id: "Wan-AI/Wan2.1-T2V-14B", label: "Wan 2.1 T2V 14B (text→video)", mode: "t2v", provider: "fal-ai" }
  ];

  var FAL_I2V_ENDPOINTS = [
    "fal-ai/wan/v2.1/i2v-480p",
    "fal-ai/wan-i2v",
    "fal-ai/minimax/video-01-live",
    "fal-ai/ltx-video/image-to-video"
  ];

  var hfClient = null;
  var hfClientLoading = null;
  var imgUploadBlob = null;
  var vidUploadBlob = null;
  var lastImgBlob = null;
  var lastVidBlob = null;
  var lastVidUrl = null;

  function token() {
    try {
      var flux = (localStorage.getItem("siftah_flux_token") || "").trim();
      if (flux) {
        if (token._last !== flux) { hfClient = null; hfClientLoading = null; token._last = flux; }
        return flux;
      }
      if (typeof loadSettings === "function") {
        var s = loadSettings();
        if (s && s.token) {
          if (token._last !== s.token) { hfClient = null; hfClientLoading = null; token._last = s.token; }
          return s.token;
        }
      }
    } catch (e) {}
    var el = document.getElementById("token");
    var fallback = (el && el.value) || "";
    if (token._last !== fallback) { hfClient = null; hfClientLoading = null; token._last = fallback; }
    return fallback;
  }

  function loadHFClient() {
    if (hfClient) return Promise.resolve(hfClient);
    if (hfClientLoading) return hfClientLoading;
    hfClientLoading = import("https://cdn.jsdelivr.net/npm/@huggingface/inference@3/+esm")
      .then(function (mod) {
        var InferenceClient = mod.InferenceClient || mod.HfInference || mod.default;
        if (!InferenceClient) throw new Error("InferenceClient not found in SDK");
        var t = token();
        if (!t) throw new Error("No HF token — open Settings and paste your token");
        hfClient = new InferenceClient(t);
        return hfClient;
      })
      .catch(function (err) {
        hfClientLoading = null;
        throw err;
      });
    return hfClientLoading;
  }

  function refreshClient() {
    hfClient = null;
    hfClientLoading = null;
    return loadHFClient();
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  function ensureUI() {
    if (document.getElementById("imgOverlay")) return;

    var nav = document.querySelector(".menu-nav");
    if (nav && !document.getElementById("menuImage")) {
      var b1 = document.createElement("button");
      b1.type = "button";
      b1.className = "menu-item";
      b1.id = "menuImage";
      b1.innerHTML = "🎨 Image / Video";
      var b2 = document.createElement("button");
      b2.type = "button";
      b2.className = "menu-item";
      b2.id = "menuVideo";
      b2.innerHTML = "🎬 Video Generator";
      var settings = document.getElementById("menuSettings");
      if (settings && settings.nextSibling) {
        nav.insertBefore(b1, settings.nextSibling);
        nav.insertBefore(b2, b1.nextSibling);
      } else {
        nav.appendChild(b1);
        nav.appendChild(b2);
      }
      b1.onclick = function () {
        if (typeof closeMenu === "function") closeMenu();
        openImg();
      };
      b2.onclick = function () {
        if (typeof closeMenu === "function") closeMenu();
        openVid();
      };
    }

    var img = document.createElement("div");
    img.id = "imgOverlay";
    img.className = "media-overlay";
    img.innerHTML =
      '<div class="media-sheet">' +
      '<div class="media-sheet-head"><h2>🎨 Da Vinci Image Generator</h2><button type="button" id="imgClose">✕</button></div>' +
      '<div class="media-sheet-body">' +
      "<label>Prompt</label>" +
      '<textarea id="imgPrompt" placeholder="Describe the image (or how to edit the upload)..."></textarea>' +
      '<p class="media-hint">Optional upload = image-to-image. No upload = text-to-image. Uses Hugging Face Inference Providers. Qwen Image is the recommended default. FLUX.1 Krea Dev and FLUX.1 Dev are non-commercial models; switch models if a provider is unavailable.</p>' +
      "<label>Reference image (optional)</label>" +
      '<div class="media-upload-row">' +
      '<input type="file" id="imgFile" accept="image/*" style="display:none">' +
      '<button type="button" class="media-upload-btn" id="imgPick">📷 Upload image</button>' +
      '<button type="button" class="media-upload-btn secondary" id="imgClear" style="display:none">Clear</button>' +
      "</div>" +
      '<div class="media-upload-preview" id="imgUploadPreview" style="display:none"></div>' +
      '<div class="media-row"><div><label>Model</label><select id="imgModel"></select></div></div>' +
      '<button type="button" class="media-gen-btn" id="imgGen">Generate image</button>' +
      '<div class="media-status" id="imgStatus"></div>' +
      '<div class="media-result" id="imgResult"><div class="placeholder">Result will appear here</div></div>' +
      '<div class="media-actions" id="imgActions" style="display:none">' +
      '<button type="button" id="imgDl">⬇ Download</button>' +
      '<button type="button" id="imgCopy">Copy image</button>' +
      '<button type="button" id="imgToProject">+ Project</button>' +
      "</div></div></div>";
    document.body.appendChild(img);

    var vid = document.createElement("div");
    vid.id = "vidOverlay";
    vid.className = "media-overlay";
    vid.innerHTML =
      '<div class="media-sheet">' +
      '<div class="media-sheet-head"><h2>🎬 Video Generator</h2><button type="button" id="vidClose">✕</button></div>' +
      '<div class="media-sheet-body">' +
      "<label>Prompt</label>" +
      '<textarea id="vidPrompt" placeholder="Describe the video / motion..."></textarea>' +
      '<p class="media-hint">Upload an image for <strong>image→video</strong>. Leave empty for <strong>text→video</strong>. Needs HF credits + Inference Providers.</p>' +
      "<label>Start frame (optional — enables image→video)</label>" +
      '<div class="media-upload-row">' +
      '<input type="file" id="vidFile" accept="image/*" style="display:none">' +
      '<button type="button" class="media-upload-btn" id="vidPick">📷 Upload image</button>' +
      '<button type="button" class="media-upload-btn secondary" id="vidClear" style="display:none">Clear</button>' +
      "</div>" +
      '<div class="media-upload-preview" id="vidUploadPreview" style="display:none"></div>' +
      '<div class="media-row"><div><label>Model</label><select id="vidModel"></select></div></div>' +
      '<button type="button" class="media-gen-btn" id="vidGen">Generate video</button>' +
      '<div class="media-status" id="vidStatus"></div>' +
      '<div class="media-result" id="vidResult"><div class="placeholder">Video will appear here</div></div>' +
      '<div class="media-actions" id="vidActions" style="display:none">' +
      '<button type="button" id="vidDl">⬇ Download</button>' +
      "</div></div></div>";
    document.body.appendChild(vid);

    var isel = document.getElementById("imgModel");
    IMAGE_MODELS.forEach(function (m) {
      var o = document.createElement("option");
      o.value = m.id;
      o.textContent = m.label;
      isel.appendChild(o);
    });
    var vsel = document.getElementById("vidModel");
    VIDEO_MODELS.forEach(function (m) {
      var o = document.createElement("option");
      o.value = m.id;
      o.textContent = m.label;
      vsel.appendChild(o);
    });

    document.getElementById("imgClose").onclick = closeImg;
    document.getElementById("vidClose").onclick = closeVid;
    img.addEventListener("click", function (e) { if (e.target === img) closeImg(); });
    vid.addEventListener("click", function (e) { if (e.target === vid) closeVid(); });
    document.getElementById("imgGen").onclick = generateImage;
    document.getElementById("vidGen").onclick = generateVideo;
    document.getElementById("imgDl").onclick = downloadImg;
    document.getElementById("imgCopy").onclick = copyImg;
    document.getElementById("imgToProject").onclick = addImgToProject;
    document.getElementById("vidDl").onclick = downloadVid;

    document.getElementById("imgPick").onclick = function () {
      document.getElementById("imgFile").click();
    };
    document.getElementById("vidPick").onclick = function () {
      document.getElementById("vidFile").click();
    };
    document.getElementById("imgFile").onchange = function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      imgUploadBlob = f;
      showPreview("imgUploadPreview", f);
      document.getElementById("imgClear").style.display = "";
      var sel = document.getElementById("imgModel");
      for (var i = 0; i < IMAGE_MODELS.length; i++) {
        if (IMAGE_MODELS[i].mode === "both" || IMAGE_MODELS[i].mode === "i2i") {
          sel.value = IMAGE_MODELS[i].id;
          break;
        }
      }
    };
    document.getElementById("vidFile").onchange = function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      vidUploadBlob = f;
      showPreview("vidUploadPreview", f);
      document.getElementById("vidClear").style.display = "";
      var sel = document.getElementById("vidModel");
      for (var i = 0; i < VIDEO_MODELS.length; i++) {
        if (VIDEO_MODELS[i].mode === "i2v") {
          sel.value = VIDEO_MODELS[i].id;
          break;
        }
      }
    };
    document.getElementById("imgClear").onclick = function () {
      imgUploadBlob = null;
      document.getElementById("imgFile").value = "";
      document.getElementById("imgUploadPreview").style.display = "none";
      document.getElementById("imgUploadPreview").innerHTML = "";
      document.getElementById("imgClear").style.display = "none";
    };
    document.getElementById("vidClear").onclick = function () {
      vidUploadBlob = null;
      document.getElementById("vidFile").value = "";
      document.getElementById("vidUploadPreview").style.display = "none";
      document.getElementById("vidUploadPreview").innerHTML = "";
      document.getElementById("vidClear").style.display = "none";
    };
  }

  function showPreview(id, file) {
    var el = document.getElementById(id);
    if (!el) return;
    var url = URL.createObjectURL(file);
    el.style.display = "block";
    el.innerHTML = '<img src="' + url + '" alt="upload">';
  }

  function openImg() {
    ensureUI();
    document.getElementById("imgOverlay").classList.add("show");
  }
  function closeImg() {
    var o = document.getElementById("imgOverlay");
    if (o) o.classList.remove("show");
  }
  function openVid() {
    ensureUI();
    document.getElementById("vidOverlay").classList.add("show");
  }
  function closeVid() {
    var o = document.getElementById("vidOverlay");
    if (o) o.classList.remove("show");
  }

  function friendlyErr(err) {
    var msg = (err && err.message) || String(err || "unknown error");
    if (/403|401|unauthorized|authentication/i.test(msg))
      return "Auth failed — token needs Inference Providers permission.";
    if (/402|payment|credit|billing|quota|exceeded|rate limit/i.test(msg))
      return "Out of Inference credits. Check huggingface.co/settings/billing";
    if (/not support|no provider|not been able to find|404/i.test(msg))
      return "Model/route not available. Try another model or upload mode.";
    if (/Failed to fetch|NetworkError|CORS/i.test(msg))
      return "Network error. Check connection / ad blockers.";
    return msg.slice(0, 300);
  }

  function normalizeImageOut(out) {
    return Promise.resolve().then(async function () {
      if (out instanceof Blob) return out;
      if (out && out.arrayBuffer) return new Blob([await out.arrayBuffer()], { type: "image/png" });
      if (out instanceof ArrayBuffer) return new Blob([out], { type: "image/png" });
      if (typeof out === "string" && out.indexOf("http") === 0) {
        var r = await fetch(out);
        return r.blob();
      }
      return new Blob([out], { type: "image/png" });
    });
  }

  async function generateImage() {
    var t = token();
    if (!t) {
      if (typeof showToast === "function") showToast("Add HF token in Settings first");
      if (typeof openSettings === "function") openSettings();
      return;
    }
    var prompt = (document.getElementById("imgPrompt").value || "").trim();
    if (!prompt && !imgUploadBlob) {
      if (typeof showToast === "function") showToast("Enter a prompt or upload an image");
      return;
    }
    var model = document.getElementById("imgModel").value;
    var btn = document.getElementById("imgGen");
    var status = document.getElementById("imgStatus");
    var result = document.getElementById("imgResult");
    btn.disabled = true;
    status.textContent = imgUploadBlob ? "Image-to-image via Hugging Face… (20–90s)" : "Generating via Hugging Face Inference Providers…";
    result.innerHTML = '<div class="placeholder">Working…</div>';
    document.getElementById("imgActions").style.display = "none";
    lastImgBlob = null;

    try {
      var client = await refreshClient();
      var out;
      if (imgUploadBlob) {
        try {
          out = await client.imageToImage({
            model: model,
            inputs: imgUploadBlob,
            parameters: { prompt: prompt || "enhance this image", strength: 0.75 }
          });
        } catch (e1) {
          try {
            out = await client.textToImage({
              model: model,
              inputs: prompt || "enhance this image",
              provider: "auto"
            });
            status.textContent = "Note: provider fell back to text-only for this model";
          } catch (e2) {
            throw e1;
          }
        }
      } else {
        out = await client.textToImage({
          model: model,
          inputs: prompt,
          provider: "auto"
        });
      }
      lastImgBlob = await normalizeImageOut(out);
      var url = URL.createObjectURL(lastImgBlob);
      result.innerHTML = '<img src="' + url + '" alt="generated">';
      document.getElementById("imgActions").style.display = "flex";
      if (!status.textContent || status.textContent.indexOf("Note") !== 0) status.textContent = "Done — saved to your Gallery for 30 days";
      if (window.siftahVault) {
        window.siftahVault.add(lastImgBlob, {
          kind: imgUploadBlob ? "i2i" : "t2i",
          prompt: prompt || "",
          name: "siftah-" + Date.now() + ".png",
          mime: lastImgBlob.type || "image/png"
        });
      }
    } catch (err) {
      console.error(err);
      result.innerHTML = '<div class="err">' + friendlyErr(err) + "</div>";
      status.textContent = "Failed";
    }
    btn.disabled = false;
  }

  function downloadImg() {
    if (!lastImgBlob) return;
    var url = URL.createObjectURL(lastImgBlob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "siftah-image-" + Date.now() + ".png";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
  }

  async function copyImg() {
    if (!lastImgBlob) return;
    if (!navigator.clipboard || !window.ClipboardItem || typeof createImageBitmap !== "function") {
      if (typeof showToast === "function") showToast("Image clipboard is unavailable here — use Download");
      return;
    }
    try {
      var bitmap = await createImageBitmap(lastImgBlob);
      var canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext("2d").drawImage(bitmap, 0, 0);
      if (bitmap.close) bitmap.close();
      var png = await new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) { if (blob) resolve(blob); else reject(new Error("Could not prepare image")); }, "image/png");
      });
      await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
      if (typeof showToast === "function") showToast("Image copied to clipboard");
    } catch (err) {
      if (typeof showToast === "function") showToast((err && err.message) || "Could not copy image — use Download");
    }
  }

  function addImgToProject() {
    if (!lastImgBlob) return;
    var reader = new FileReader();
    reader.onload = function () {
      if (typeof putFile === "function") {
        putFile("image-" + Date.now() + ".png.txt", reader.result, true);
        if (typeof showToast === "function") showToast("Added image data URL to Project");
      }
    };
    reader.readAsDataURL(lastImgBlob);
  }

  async function tryFalI2V(prompt, imageBlob, statusEl) {
    var t = token();
    var dataUrl = await blobToDataUrl(imageBlob);
    var lastErr = null;
    for (var i = 0; i < FAL_I2V_ENDPOINTS.length; i++) {
      var ep = FAL_I2V_ENDPOINTS[i];
      statusEl.textContent = "I2V via fal: " + ep + "…";
      try {
        var url = "https://router.huggingface.co/fal-ai/" + ep;
        var res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: "Bearer " + t,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            prompt: prompt || "animate this image",
            image_url: dataUrl,
            image_url_input: dataUrl
          })
        });
        if (!res.ok) {
          var txt = await res.text();
          lastErr = new Error(txt.slice(0, 200) || ("HTTP " + res.status));
          continue;
        }
        var ct = (res.headers.get("content-type") || "").toLowerCase();
        if (ct.indexOf("video/") >= 0) {
          return { blob: await res.blob() };
        }
        var data = await res.json();
        if (data.request_id || data.status_url || data.response_url) {
          var pollUrl = data.response_url || data.status_url;
          if (pollUrl) {
            for (var p = 0; p < 60; p++) {
              statusEl.textContent = "Queued… poll " + (p + 1);
              await new Promise(function (r) { setTimeout(r, 3000); });
              var pr = await fetch(pollUrl, { headers: { Authorization: "Bearer " + t } });
              if (!pr.ok) continue;
              var pd = await pr.json();
              if (pd.status === "COMPLETED" || pd.video || (pd.video && pd.video.url)) {
                data = pd;
                break;
              }
              if (pd.status === "FAILED") throw new Error(pd.error || "Queue failed");
            }
          }
        }
        var vurl =
          (data.video && data.video.url) ||
          data.video_url ||
          data.url ||
          data.output ||
          (data.videos && data.videos[0]);
        if (typeof vurl === "string") return { url: vurl };
        if (data.video && typeof data.video === "string") return { url: data.video };
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("All I2V endpoints failed");
  }

  function rememberVideo(prompt) {
    var job = Promise.resolve(lastVidBlob || null);
    if (!lastVidBlob && lastVidUrl) {
      job = fetch(lastVidUrl).then(function (r) {
        if (!r.ok) throw new Error("no blob");
        return r.blob();
      }).catch(function () { return null; });
    }
    job.then(function (blob) {
      if (!blob || !window.siftahVault) return;
      window.siftahVault.add(blob, {
        kind: "video",
        prompt: prompt || "",
        name: "siftah-" + Date.now() + ".mp4",
        mime: blob.type || "video/mp4"
      });
    });
  }

  async function generateVideo() {
    var t = token();
    if (!t) {
      if (typeof showToast === "function") showToast("Add HF token in Settings first");
      if (typeof openSettings === "function") openSettings();
      return;
    }
    var prompt = (document.getElementById("vidPrompt").value || "").trim();
    if (!prompt && !vidUploadBlob) {
      if (typeof showToast === "function") showToast("Enter a prompt or upload a start image");
      return;
    }
    var model = document.getElementById("vidModel").value;
    var meta = VIDEO_MODELS.find(function (m) { return m.id === model; }) || { provider: "fal-ai", mode: "t2v" };
    var btn = document.getElementById("vidGen");
    var status = document.getElementById("vidStatus");
    var result = document.getElementById("vidResult");
    btn.disabled = true;
    status.textContent = vidUploadBlob ? "Image→video… 1–3 min" : "Text→video… 1–3 min";
    result.innerHTML = '<div class="placeholder">Generating… stay on this screen</div>';
    document.getElementById("vidActions").style.display = "none";
    lastVidBlob = null;
    lastVidUrl = null;

    try {
      if (vidUploadBlob) {
        try {
          var i2v = await tryFalI2V(prompt, vidUploadBlob, status);
          if (i2v.blob) {
            lastVidBlob = i2v.blob;
            lastVidUrl = URL.createObjectURL(i2v.blob);
          } else if (i2v.url) {
            lastVidUrl = i2v.url;
          }
          result.innerHTML = '<video src="' + lastVidUrl + '" controls autoplay loop playsinline></video>';
          document.getElementById("vidActions").style.display = "flex";
          status.textContent = "Done (image→video) — saved in Files for 24 hours";
          rememberVideo(prompt);
          btn.disabled = false;
          return;
        } catch (i2vErr) {
          console.warn("I2V fal path failed, trying HF client", i2vErr);
        }
      }

      var providers = [meta.provider || "fal-ai", "fal-ai", "replicate", "novita", "auto"];
      providers = providers.filter(function (p, i, a) { return a.indexOf(p) === i; });
      var lastErr = null;
      for (var i = 0; i < providers.length; i++) {
        try {
          status.textContent = "Trying " + providers[i] + "…";
          var client = await refreshClient();
          var out = await client.textToVideo({
            model: model,
            inputs: prompt || "cinematic motion",
            provider: providers[i]
          });
          if (typeof out === "string" && out.indexOf("http") === 0) {
            lastVidUrl = out;
          } else if (out instanceof Blob) {
            lastVidBlob = out;
            lastVidUrl = URL.createObjectURL(out);
          } else if (out && out.url) {
            lastVidUrl = out.url;
          } else if (out && out.arrayBuffer) {
            lastVidBlob = new Blob([await out.arrayBuffer()], { type: "video/mp4" });
            lastVidUrl = URL.createObjectURL(lastVidBlob);
          } else {
            throw new Error("Unexpected video response");
          }
          result.innerHTML = '<video src="' + lastVidUrl + '" controls autoplay loop playsinline></video>';
          document.getElementById("vidActions").style.display = "flex";
          status.textContent = "Done (" + providers[i] + ") — saved in Files for 24 hours";
          rememberVideo(prompt);
          btn.disabled = false;
          return;
        } catch (err) {
          console.error(err);
          lastErr = err;
        }
      }
      throw lastErr || new Error("All providers failed");
    } catch (err) {
      result.innerHTML =
        '<div class="err">' +
        friendlyErr(err) +
        "<br><br>Tips: enable fal-ai in HF inference-providers settings; use Wan I2V model when uploading an image; ensure billing credits remain.</div>";
      status.textContent = "Failed";
    }
    btn.disabled = false;
  }

  function downloadVid() {
    if (lastVidBlob) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(lastVidBlob);
      a.download = "siftah-video-" + Date.now() + ".mp4";
      a.click();
      return;
    }
    if (lastVidUrl) {
      var a2 = document.createElement("a");
      a2.href = lastVidUrl;
      a2.download = "siftah-video-" + Date.now() + ".mp4";
      a2.target = "_blank";
      a2.click();
    }
  }

  function boot() {
    ensureUI();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 100); });
  else setTimeout(boot, 100);
})();
