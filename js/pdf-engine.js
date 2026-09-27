/* pdf-engine.js — PDF load, page-range, transform & merge (pdf-lib) */
(function (global) {
  "use strict";

  const MM_TO_PT = 72 / 25.4;

  // Ukuran halaman dalam point (72 pt = 1 inch)
  const PAGE_SIZES = {
    a4: [595.28, 841.89],
    letter: [612, 792],
    legal: [612, 1008],
    f4: [595.28, 935.43], // 210 x 330 mm
  };

  const mmToPt = (mm) => Number(mm || 0) * MM_TO_PT;

  /** Hitung jumlah halaman dari byte PDF. */
  async function getPageCount(bytes) {
    const doc = await PDFLib.PDFDocument.load(new Uint8Array(bytes), {
      updateMetadata: false,
    });
    return doc.getPageCount();
  }

  /**
   * Parse string rentang halaman ("1-3,5") -> array index 0-based unik & terurut.
   * String kosong / kosong spasi = semua halaman.
   */
  function parsePageRanges(input, pageCount) {
    const s = String(input == null ? "" : input).trim();
    if (!s) return Array.from({ length: pageCount }, (_, i) => i);

    const set = new Set();
    const addPage = (n) => {
      if (!Number.isInteger(n) || n < 1 || n > pageCount) {
        throw new Error(`Halaman ${n} di luar jangkauan (1–${pageCount})`);
      }
      set.add(n - 1);
    };

    for (const raw of s.split(",")) {
      const part = raw.trim();
      if (!part) continue;
      let m;
      if ((m = part.match(/^(\d+)$/))) {
        addPage(parseInt(m[1], 10));
      } else if ((m = part.match(/^(\d+)\s*-\s*(\d+)$/))) {
        let a = parseInt(m[1], 10);
        let b = parseInt(m[2], 10);
        if (a > b) [a, b] = [b, a];
        for (let i = a; i <= b; i++) addPage(i);
      } else {
        throw new Error(`Rentang tidak valid: "${part}"`);
      }
    }
    return Array.from(set).sort((a, b) => a - b);
  }

  /** Cek apakah halaman punya content stream (halaman kosong tidak bisa di-embed). */
  function pageHasContent(doc, idx) {
    try {
      const node = doc.getPage(idx).node;
      const contents = typeof node.Contents === "function" ? node.Contents() : null;
      if (!contents) return false;
      if (Array.isArray(contents)) return contents.length > 0;
      return true;
    } catch (err) {
      return false;
    }
  }

  /** Load dokumen sumber; lempar error ramah bila terenkripsi/rusak. */
  async function loadSource(bytes) {
    try {
      return await PDFLib.PDFDocument.load(new Uint8Array(bytes), {
        updateMetadata: false,
      });
    } catch (err) {
      const msg = String(err && err.message || err);
      if (/encrypt/i.test(msg)) {
        throw new Error("PDF terenkripsi / berkata sandi tidak didukung");
      }
      throw new Error("Gagal membaca PDF (file rusak?)");
    }
  }

  /**
   * Bangun satu PDF hasil dari daftar sumber.
   * @param {Array<{bytes:Uint8Array, pageIndices:number[]}>} sources
   * @param {Object} settings {pageSize, orientation, scale, margin, fitShrink}
   * @returns {Promise<Uint8Array>}
   */
  async function buildDocument(sources, settings) {
    const out = await PDFLib.PDFDocument.create();
    const marginPt = mmToPt(settings.margin);
    const sizeKey = settings.pageSize;
    const orient = settings.orientation || "auto";
    const scaleFactor = Number(settings.scale || 100) / 100;
    const fitShrink = settings.fitShrink !== false;

    let total = 0;

    for (const src of sources) {
      const indices = src.pageIndices && src.pageIndices.length
        ? src.pageIndices
        : Array.from({ length: src.pageCount || 0 }, (_, i) => i);
      if (!indices.length) continue;

      const srcDoc = await loadSource(src.bytes);

      for (const idx of indices) {
        // Embed per halaman: halaman kosong (tanpa Contents) tidak boleh
        // menggagalkan seluruh dokumen.
        let ep = null;
        if (pageHasContent(srcDoc, idx)) {
          try {
            const embedded = await out.embedPdf(srcDoc, [idx]);
            ep = embedded[0] || null;
          } catch (err) {
            ep = null;
          }
        }

        const ew = ep ? ep.width : 0;
        const eh = ep ? ep.height : 0;
        const fb = PAGE_SIZES.a4;
        let pw, ph;

        if (sizeKey === "fit" && ep) {
          pw = ew + marginPt * 2;
          ph = eh + marginPt * 2;
        } else {
          const size = PAGE_SIZES[sizeKey] || fb;
          pw = size[0];
          ph = size[1];
          const landscape = orient === "auto" ? ew > eh : orient === "landscape";
          if (landscape && pw < ph) [pw, ph] = [ph, pw];
          if (!landscape && pw > ph) [pw, ph] = [ph, pw];
        }

        const page = out.addPage([pw, ph]);

        if (ep) {
          const availW = Math.max(1, pw - marginPt * 2);
          const availH = Math.max(1, ph - marginPt * 2);
          let s = scaleFactor;
          if (fitShrink) s = Math.min(s, availW / ew, availH / eh);
          const dw = ew * s;
          const dh = eh * s;
          try {
            page.drawPage(ep, { x: (pw - dw) / 2, y: (ph - dh) / 2, xScale: s, yScale: s });
          } catch (err) {
            // pdf-lib menanam halaman secara lazy; bila gagal, sisakan
            // halaman kosong ketimbang membatalkan seluruh dokumen.
          }
        }
        total++;
      }
    }

    if (total === 0) throw new Error("Tidak ada halaman untuk dicetak");

    out.setProducer("PDF Printer");
    out.setCreator("PDF Printer");
    return out.save();
  }

  global.PdfEngine = {
    MM_TO_PT,
    PAGE_SIZES,
    mmToPt,
    getPageCount,
    parsePageRanges,
    buildDocument,
    loadSource,
  };
})(window);
