/* preview.js — render halaman PDF ke canvas via pdf.js (lazy) */
(function (global) {
  "use strict";

  const WORKER_SRC =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  if (global.pdfjsLib) {
    global.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_SRC;
  }

  const BASE_K = 0.62; // px CSS per point pada zoom 100%
  const DPR = () => Math.min(global.devicePixelRatio || 1, 2);

  let observer = null;

  function getObserver() {
    if (observer) return observer;
    observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            observer.unobserve(e.target);
            const job = e.target.__renderJob;
            if (job) job();
          }
        }
      },
      { root: null, rootMargin: "400px 0px" }
    );
    return observer;
  }

  /** Salinan byte — pdf.js men-transfer/mendetach buffer masukan. */
  const copy = (bytes) => new Uint8Array(bytes).slice();

  async function openDocument(bytes) {
    return global.pdfjsLib.getDocument({ data: copy(bytes), disableAutoFetch: true })
      .promise;
  }

  async function drawPageTo(canvas, page, cssWidth) {
    const base = page.getViewport({ scale: 1 });
    const scale = (cssWidth * DPR()) / base.width;
    const viewport = page.getViewport({ scale });
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    canvas.style.width = Math.round(cssWidth) + "px";
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    await page.render({ canvasContext: ctx, viewport }).promise;
    return scale;
  }

  /**
   * Render satu dokumen ke container sebagai kartu halaman (lazy saat terlihat).
   * @param {Uint8Array} bytes
   * @param {HTMLElement} container
   * @param {{zoom?:number}} opts
   */
  async function renderDocument(bytes, container, opts) {
    const zoom = opts && opts.zoom ? opts.zoom : 1;
    let pdf;
    try {
      pdf = await openDocument(bytes);
    } catch (err) {
      const wrap = document.createElement("div");
      wrap.className = "page-card";
      wrap.innerHTML = `<div class="page-label"><span>Gagal render pratinjau</span></div>`;
      container.appendChild(wrap);
      return;
    }

    const obs = getObserver();

    for (let i = 1; i <= pdf.numPages; i++) {
      const card = document.createElement("div");
      card.className = "page-card loading";
      const label = document.createElement("div");
      label.className = "page-label";
      label.innerHTML = `<span>Hal ${i}</span><span>${pdf.numPages}</span>`;
      const wrap = document.createElement("div");
      wrap.className = "page-canvas-wrap";
      const canvas = document.createElement("canvas");
      wrap.appendChild(canvas);
      card.appendChild(label);
      card.appendChild(wrap);
      container.appendChild(card);

      card.__renderJob = async () => {
        try {
          const page = await pdf.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const cssWidth = base.width * BASE_K * zoom;
          await drawPageTo(canvas, page, cssWidth);
          card.classList.remove("loading");
        } catch (err) {
          card.classList.remove("loading");
        }
      };
      obs.observe(card);
    }
  }

  /** Render halaman ke-1 sebagai thumbnail kecil ke canvas yang sudah ada. */
  async function renderThumbnail(bytes, canvas) {
    try {
      const pdf = await openDocument(bytes);
      const page = await pdf.getPage(1);
      const base = page.getViewport({ scale: 1 });
      const cssWidth = 42;
      const scale = (cssWidth * DPR()) / base.width;
      const viewport = page.getViewport({ scale });
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (err) {
      canvas.parentElement.querySelector(".ph")?.classList.remove("hidden");
    }
  }

  global.Preview = { renderDocument, renderThumbnail, BASE_K };
})(window);
