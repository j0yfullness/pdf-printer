# PDF Printer

[![Live Demo](https://img.shields.io/badge/Live_Demo-j0yfullness.github.io%2Fpdf--printer-brightgreen?style=flat-square)](https://j0yfullness.github.io/pdf-printer/)
[![GitHub Pages](https://img.shields.io/badge/Hosted_on-GitHub_Pages-222?style=flat-square&logo=github)](https://j0yfullness.github.io/pdf-printer/)
![HTML](https://img.shields.io/badge/HTML-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
[![pdf-lib](https://img.shields.io/badge/pdf--lib-1.17-4f46e5?style=flat-square)](https://pdf-lib.js.org/)
[![pdf.js](https://img.shields.io/badge/pdf.js-3.11-c84b2f?style=flat-square)](https://mozilla.github.io/pdf.js/)

A static web app for printing PDFs — one file at a time or many in bulk. Everything runs in the browser; no file is ever uploaded to a server.

**Live demo:** https://j0yfullness.github.io/pdf-printer/

## Screenshots

**Merge mode (light theme)**

![Merge mode preview](screenshots/preview-merge.png)

**Per-file mode**

![Per-file mode preview](screenshots/preview-per-file.png)

**Dark theme**

![Dark theme preview](screenshots/preview-dark.png)

## Features

- Add multiple PDFs via drag & drop or the file picker.
- Print modes:
  - **Merge** — all PDFs are combined into a single document, then one print dialog.
  - **Per-file** — each PDF is printed separately, queued with a progress indicator.
  - **Both** — choose the method when you hit Print.
- Print settings: page size (A4/Letter/Legal/F4/fit to content), orientation (auto/portrait/landscape), scale 25–200%, margin (mm), and automatic shrinking so nothing gets clipped.
- Per-file page ranges (e.g. `1-3,5`).
- Reorder files (drag or ▲▼ buttons), remove files.
- Per-page preview of the result (lazy rendered), zoom, light/dark theme.
- Download the result as a PDF, or print it directly.

## Running

**Easiest:** open the [live demo](https://j0yfullness.github.io/pdf-printer/) — no install required.

**Locally:** a static server is required (not `file://`) because pdf.js uses a Web Worker from a CDN.

```powershell
python -m http.server 8777
# then open http://127.0.0.1:8777/
```

On Windows you can also just double-click `start.bat` — it starts the server and opens your browser.

## Tech stack

- [pdf-lib](https://pdf-lib.js.org/) — loads, merges, and resizes/reflows pages.
- [pdf.js](https://mozilla.github.io/pdf.js/) — renders the preview to canvas.
- Both are loaded from a CDN (cdnjs), so an internet connection is required on first load.

## Limitations

- Encrypted / password-protected PDFs are not supported (rejected with a message).
- Annotations, form fields, and hyperlinks are not preserved in the merged output (only the page appearance is printed).
- Direct printing uses the browser's print dialog; the number of consecutive dialogs in per-file mode depends on your browser's permissions.
- For lighter previews on large documents, use a smaller zoom level.

## License

No license specified.
