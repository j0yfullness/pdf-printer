/* app.js — UI state, orkestrasi preview & cetak */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const els = {
    dropzone: $("dropzone"),
    fileInput: $("fileInput"),
    fileList: $("fileList"),
    fileCount: $("fileCount"),
    fileEmpty: $("fileEmpty"),
    sortBtn: $("sortBtn"),
    clearBtn: $("clearBtn"),
    pageSize: $("pageSize"),
    orientation: $("orientation"),
    scale: $("scale"),
    scaleVal: $("scaleVal"),
    margin: $("margin"),
    fitShrink: $("fitShrink"),
    printBtn: $("printBtn"),
    printLabel: $("printLabel"),
    downloadBtn: $("downloadBtn"),
    previewHeading: $("previewHeading"),
    previewSub: $("previewSub"),
    previewBody: $("previewBody"),
    previewEmpty: $("previewEmpty"),
    pages: $("pages"),
    zoomIn: $("zoomIn"),
    zoomOut: $("zoomOut"),
    zoomVal: $("zoomVal"),
    refreshBtn: $("refreshBtn"),
    themeToggle: $("themeToggle"),
    overlay: $("overlay"),
    ovIcon: $("ovIcon"),
    ovTitle: $("ovTitle"),
    ovText: $("ovText"),
    ovBar: $("ovBar"),
    ovActions: $("ovActions"),
    toastWrap: $("toastWrap"),
    printFrame: $("printFrame"),
  };

  const state = {
    files: [],
    mode: "merge",
    settings: { pageSize: "a4", orientation: "auto", scale: 100, margin: 8, fitShrink: true },
    zoom: 1,
    busy: false,
    outputs: [], // [{ bytes, name }]
    advance: null,
    cancelled: false,
  };

  let uid = 1;
  let previewTimer = null;
  let previewToken = 0;

  const bytesOf = (u8) => new Uint8Array(u8); // salin aman untuk pdf-lib/pdf.js

  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  const fmtSize = (b) => {
    if (b < 1024) return b + " B";
    if (b < 1024 * 1024) return (b / 1024).toFixed(0) + " KB";
    return (b / 1024 / 1024).toFixed(2) + " MB";
  };

  /* ----------------------------- Toast ----------------------------- */
  function toast(msg, kind) {
    const el = document.createElement("div");
    el.className = "toast" + (kind ? " " + kind : "");
    el.textContent = msg;
    els.toastWrap.appendChild(el);
    setTimeout(() => {
      el.classList.add("out");
      setTimeout(() => el.remove(), 220);
    }, kind === "err" ? 4200 : 2600);
  }

  /* --------------------------- Overlay ----------------------------- */
  function showOverlay({ icon, title, text, progress, actions, spinner }) {
    els.ovIcon.innerHTML = spinner ? '<div class="spinner"></div>' : icon || "";
    els.ovTitle.textContent = title || "";
    els.ovText.textContent = text || "";
    els.ovBar.style.width = progress == null ? "0%" : Math.round(progress * 100) + "%";
    els.ovActions.innerHTML = "";
    (actions || []).forEach((a) => {
      const b = document.createElement("button");
      b.className = a.primary ? "ghost-btn" : "ghost-btn";
      b.textContent = a.label;
      if (a.primary) {
        b.style.background = "var(--accent)";
        b.style.color = "#fff";
        b.style.borderColor = "var(--accent)";
      }
      b.onclick = a.onClick;
      els.ovActions.appendChild(b);
    });
    els.overlay.hidden = false;
  }
  function hideOverlay() {
    els.overlay.hidden = true;
  }

  /* --------------------------- Settings ---------------------------- */
  function bindSettings() {
    els.pageSize.onchange = () => { state.settings.pageSize = els.pageSize.value; schedulePreview(); };
    els.orientation.onchange = () => { state.settings.orientation = els.orientation.value; schedulePreview(); };
    els.scale.oninput = () => {
      state.settings.scale = Number(els.scale.value);
      els.scaleVal.textContent = state.settings.scale + "%";
      schedulePreview();
    };
    els.margin.oninput = () => { state.settings.margin = Number(els.margin.value) || 0; schedulePreview(); };
    els.fitShrink.onchange = () => { state.settings.fitShrink = els.fitShrink.checked; schedulePreview(); };
  }

  /* --------------------------- Add files --------------------------- */
  async function addFiles(list) {
    const incoming = Array.from(list || []).filter(
      (f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name)
    );
    if (!incoming.length) {
      toast("Hanya file PDF yang didukung", "err");
      return;
    }

    for (const f of incoming) {
      try {
        const buf = await f.arrayBuffer();
        const bytes = new Uint8Array(buf);
        const doc = await PdfEngine.loadSource(bytes);
        const pageCount = doc.getPageCount();
        state.files.push({
          id: uid++,
          name: f.name,
          size: f.size,
          bytes,
          pageCount,
          pageRange: "",
        });
      } catch (err) {
        toast(`${f.name}: ${err.message}`, "err");
      }
    }

    renderFileList();
    schedulePreview();
  }

  /* --------------------------- File list --------------------------- */
  function renderFileList() {
    els.fileCount.textContent = state.files.length;
    els.fileEmpty.style.display = state.files.length ? "none" : "block";
    els.fileList.innerHTML = "";

    state.files.forEach((f, idx) => {
      const li = document.createElement("li");
      li.className = "file-item";
      li.draggable = true;
      li.dataset.id = f.id;
      li.dataset.index = idx;
      li.innerHTML = `
        <span class="drag-handle" title="Tarik untuk ubah urutan">
          <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>
        </span>
        <div class="file-thumb"><span class="ph">PDF</span></div>
        <div class="file-meta">
          <div class="file-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</div>
          <div class="file-sub">
            <span>${f.pageCount} hal</span><span class="sep">•</span><span>${fmtSize(f.size)}</span>
          </div>
          <div class="range-row">
            <input class="range-input" type="text" placeholder="Semua halaman (mis. 1-3,5)"
              value="${escapeHtml(f.pageRange)}" />
          </div>
        </div>
        <div class="file-controls">
          <button class="mini-btn up" title="Naik" ${idx === 0 ? "disabled" : ""}>▲</button>
          <button class="mini-btn down" title="Turun" ${idx === state.files.length - 1 ? "disabled" : ""}>▼</button>
          <button class="mini-btn rm" title="Hapus">✕</button>
        </div>`;

      // thumbnail
      const canvas = document.createElement("canvas");
      const thumbWrap = li.querySelector(".file-thumb");
      thumbWrap.innerHTML = "";
      thumbWrap.appendChild(canvas);
      Preview.renderThumbnail(bytesOf(f.bytes), canvas);

      // rentang halaman
      const rangeInput = li.querySelector(".range-input");
      rangeInput.addEventListener("input", () => {
        f.pageRange = rangeInput.value;
        validateRange(f, rangeInput);
        schedulePreview();
      });
      validateRange(f, rangeInput);

      // kontrol
      li.querySelector(".up").onclick = () => moveFile(idx, idx - 1);
      li.querySelector(".down").onclick = () => moveFile(idx, idx + 1);
      li.querySelector(".rm").onclick = () => {
        state.files = state.files.filter((x) => x.id !== f.id);
        renderFileList();
        schedulePreview();
      };

      // drag & drop reorder
      li.addEventListener("dragstart", (e) => {
        li.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(f.id));
      });
      li.addEventListener("dragend", () => li.classList.remove("dragging"));
      li.addEventListener("dragover", (e) => {
        e.preventDefault();
        li.classList.add("drop-target");
      });
      li.addEventListener("dragleave", () => li.classList.remove("drop-target"));
      li.addEventListener("drop", (e) => {
        e.preventDefault();
        li.classList.remove("drop-target");
        const from = Number(e.dataTransfer.getData("text/plain"));
        const fromIdx = state.files.findIndex((x) => x.id === from);
        if (fromIdx < 0 || fromIdx === idx) return;
        moveFile(fromIdx, idx);
      });

      els.fileList.appendChild(li);
    });

    updateButtons();
  }

  function validateRange(f, inputEl) {
    try {
      PdfEngine.parsePageRanges(f.pageRange, f.pageCount);
      inputEl.classList.remove("err");
      return true;
    } catch (err) {
      inputEl.classList.add("err");
      return false;
    }
  }

  function moveFile(from, to) {
    if (to < 0 || to >= state.files.length) return;
    const [item] = state.files.splice(from, 1);
    state.files.splice(to, 0, item);
    renderFileList();
    schedulePreview();
  }

  function updateButtons() {
    const has = state.files.length > 0;
    els.printBtn.disabled = !has || state.busy;
    els.downloadBtn.disabled = !has || state.busy;
    const labels = {
      merge: "Cetak gabungan",
      perfile: "Cetak per file",
      both: "Cetak…",
    };
    els.printLabel.textContent = labels[state.mode] || "Cetak";
  }

  function allRangesValid() {
    return state.files.every((f) => {
      try { PdfEngine.parsePageRanges(f.pageRange, f.pageCount); return true; }
      catch { return false; }
    });
  }

  /* --------------------------- Preview ----------------------------- */
  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => renderPreview(true), 350);
  }

  function setPreviewSub(text) {
    els.previewSub.textContent = text;
  }

  async function renderPreview(build) {
    const token = ++previewToken;

    if (!state.files.length) {
      els.pages.innerHTML = "";
      els.previewEmpty.style.display = "flex";
      els.previewHeading.textContent = "Pratinjau";
      setPreviewSub("Belum ada output");
      return;
    }
    if (!allRangesValid()) {
      setPreviewSub("Perbaiki rentang halaman yang merah");
      return;
    }

    if (build) {
      setPreviewSub("Menyiapkan…");
      try {
        if (state.mode === "perfile") {
          const outs = [];
          for (const f of state.files) {
            const idxs = PdfEngine.parsePageRanges(f.pageRange, f.pageCount);
            const bytes = await PdfEngine.buildDocument(
              [{ bytes: bytesOf(f.bytes), pageIndices: idxs, pageCount: f.pageCount }],
              state.settings
            );
            outs.push({ bytes, name: f.name, pageCount: idxs.length });
          }
          state.outputs = outs;
        } else {
          const sources = state.files.map((f) => ({
            bytes: bytesOf(f.bytes),
            pageIndices: PdfEngine.parsePageRanges(f.pageRange, f.pageCount),
            pageCount: f.pageCount,
          }));
          const bytes = await PdfEngine.buildDocument(sources, state.settings);
          state.outputs = [{ bytes, name: "gabungan", pageCount: null }];
        }
      } catch (err) {
        setPreviewSub("Gagal menyiapkan pratinjau");
        toast(err.message, "err");
        return;
      }
    }

    if (token !== previewToken) return;

    els.previewEmpty.style.display = "none";
    els.pages.innerHTML = "";

    const total = state.outputs.length;
    if (state.mode === "perfile") {
      els.previewHeading.textContent = "Pratinjau per file";
      setPreviewSub(`${total} dokumen hasil`);
      for (const out of state.outputs) {
        const group = document.createElement("div");
        group.className = "page-group";
        const head = document.createElement("div");
        head.className = "group-head";
        head.textContent = out.name;
        group.appendChild(head);
        els.pages.appendChild(group);
        Preview.renderDocument(bytesOf(out.bytes), group, { zoom: state.zoom });
      }
    } else {
      els.previewHeading.textContent = "Pratinjau gabungan";
      setPreviewSub(`1 dokumen hasil`);
      Preview.renderDocument(bytesOf(state.outputs[0].bytes), els.pages, { zoom: state.zoom });
    }
    updateButtons();
  }

  /* -------------------------- Zoom -------------------------------- */
  function setZoom(z) {
    state.zoom = Math.min(2.5, Math.max(0.4, Math.round(z * 10) / 10));
    els.zoomVal.textContent = Math.round(state.zoom * 100) + "%";
    renderPreview(false);
  }

  /* -------------------------- Print -------------------------------- */
  function blobUrl(bytes) {
    return URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  }

  function printBlobAndWait(bytes, name) {
    return new Promise((resolve) => {
      const frame = els.printFrame;
      const url = blobUrl(bytes);
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        state.advance = null;
        frame.onload = null;
        try {
          frame.contentWindow.removeEventListener("afterprint", finish);
        } catch (e) {}
        frame.src = "about:blank";
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        resolve();
      };
      const timer = setTimeout(finish, 120000);

      frame.onload = () => {
        try {
          frame.contentWindow.focus();
          const w = frame.contentWindow;
          w.addEventListener("afterprint", finish);
          setTimeout(() => {
            try { w.print(); } catch (e) { finish(); }
          }, 350);
        } catch (e) {
          finish();
        }
      };
      state.advance = finish;
      frame.src = url;
    });
  }

  async function doMergePrint() {
    if (!state.outputs.length || state.mode === "perfile") {
      await renderPreview(true);
      if (!state.outputs.length) return;
    }
    const out = state.outputs[0];
    state.busy = true;
    updateButtons();
    showOverlay({
      icon: "🖨️",
      title: "Membuka dialog cetak",
      text: "Pilih printer pada dialog yang muncul.",
      actions: [{ label: "Tutup", onClick: hideOverlay }],
    });
    await printBlobAndWait(out.bytes, "gabungan");
    state.busy = false;
    updateButtons();
    hideOverlay();
    toast("Dokumen gabungan dikirim ke printer", "ok");
  }

  async function doPerFilePrint() {
    if (state.mode !== "perfile") await renderPreview(true);
    if (!state.outputs.length) return;

    const outs = state.outputs.slice();
    state.cancelled = false;
    state.busy = true;
    updateButtons();

    for (let i = 0; i < outs.length; i++) {
      if (state.cancelled) break;
      const out = outs[i];
      showOverlay({
        icon: "🖨️",
        title: `Cetak ${i + 1} dari ${outs.length}`,
        text: `${out.name} — atur lalu tekan Cetak pada dialog. Klik "Lanjut" bila dialog sudah selesai.`,
        progress: i / outs.length,
        actions: [
          { label: "Lanjut", primary: true, onClick: () => state.advance && state.advance() },
          { label: "Batalkan sisa", onClick: () => { state.cancelled = true; if (state.advance) state.advance(); } },
        ],
      });
      await printBlobAndWait(out.bytes, out.name);
    }

    els.ovBar.style.width = "100%";
    state.busy = false;
    updateButtons();
    hideOverlay();
    if (state.cancelled) toast("Antrean cetak dibatalkan", "");
    else toast(`${outs.length} dokumen diproses cetak`, "ok");
  }

  function doPrint() {
    if (state.busy) return;
    if (state.mode === "merge") return doMergePrint();
    if (state.mode === "perfile") return doPerFilePrint();
    // mode "both" -> pilih
    showOverlay({
      icon: "🖨️",
      title: "Pilih cara cetak",
      text: "Gabung jadi satu dokumen, atau cetak tiap file terpisah?",
      actions: [
        { label: "Gabung jadi 1", primary: true, onClick: () => { hideOverlay(); doMergePrint(); } },
        { label: "Per file", onClick: () => { hideOverlay(); doPerFilePrint(); } },
        { label: "Batal", onClick: hideOverlay },
      ],
    });
  }

  /* ------------------------- Download ----------------------------- */
  async function doDownload() {
    if (!state.outputs.length) await renderPreview(true);
    if (!state.outputs.length) return;

    if (state.outputs.length === 1) {
      saveBytes(state.outputs[0].bytes, downloadName(state.outputs[0].name));
    } else {
      for (const out of state.outputs) {
        saveBytes(out.bytes, downloadName(out.name));
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    toast("Unduhan dimulai", "ok");
  }

  function downloadName(name) {
    if (name === "gabungan") return "pdf-gabungan.pdf";
    return /\.pdf$/i.test(name) ? name : name + ".pdf";
  }

  function saveBytes(bytes, filename) {
    const url = blobUrl(bytes);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  /* --------------------------- Theme ------------------------------ */
  function initTheme() {
    const saved = localStorage.getItem("pdfprinter.theme");
    const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved || (prefersDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
    els.themeToggle.onclick = () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("pdfprinter.theme", next);
    };
  }

  /* --------------------------- Events ----------------------------- */
  function bindEvents() {
    els.dropzone.onclick = () => els.fileInput.click();
    els.dropzone.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); els.fileInput.click(); }
    };
    els.fileInput.onchange = (e) => {
      addFiles(e.target.files);
      e.target.value = "";
    };

    ["dragenter", "dragover"].forEach((ev) =>
      els.dropzone.addEventListener(ev, (e) => { e.preventDefault(); els.dropzone.classList.add("is-drag"); })
    );
    ["dragleave", "drop"].forEach((ev) =>
      els.dropzone.addEventListener(ev, (e) => { e.preventDefault(); els.dropzone.classList.remove("is-drag"); })
    );
    els.dropzone.addEventListener("drop", (e) => {
      if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    });

    document.querySelectorAll(".seg-btn").forEach((btn) => {
      btn.onclick = () => {
        document.querySelectorAll(".seg-btn").forEach((b) => {
          b.classList.remove("is-active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("is-active");
        btn.setAttribute("aria-selected", "true");
        state.mode = btn.dataset.mode;
        state.outputs = [];
        updateButtons();
        renderPreview(true);
      };
    });

    els.sortBtn.onclick = () => {
      state.files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      renderFileList();
      schedulePreview();
      toast("Diurutkan A→Z");
    };

    els.clearBtn.onclick = () => {
      if (!state.files.length) return;
      state.files = [];
      state.outputs = [];
      renderFileList();
      renderPreview(true);
    };

    els.printBtn.onclick = doPrint;
    els.downloadBtn.onclick = doDownload;
    els.refreshBtn.onclick = () => renderPreview(false);
    els.zoomIn.onclick = () => setZoom(state.zoom + 0.2);
    els.zoomOut.onclick = () => setZoom(state.zoom - 0.2);

    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        if (!els.printBtn.disabled) doPrint();
      }
    });
  }

  /* --------------------------- Init ------------------------------- */
  function init() {
    initTheme();
    bindSettings();
    bindEvents();
    updateButtons();
    if (!window.pdfjsLib) {
      toast("Gagal memuat pdf.js (cek koneksi internet)", "err");
    }
    if (!window.PDFLib) {
      toast("Gagal memuat pdf-lib (cek koneksi internet)", "err");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
