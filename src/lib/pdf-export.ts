/**
 * pdf-export.ts — Generates a professional PDF from the AI report panel content.
 *
 * Uses the browser's native print functionality with a dedicated print stylesheet.
 * This approach is lightweight (no external deps) and produces high-quality output.
 */

export async function generateReportPDF(
  contentElement: HTMLElement,
  filename: string = "Portfolio_Report",
): Promise<void> {
  const content = contentElement.innerHTML;
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Print from a hidden iframe rather than a popup: popup blockers can't stop it, and the
  // browser's own print engine renders the colours, so no canvas capture is needed (the old
  // html2pdf/html2canvas path crashed on oklch() colours and froze the page on large reports).
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(frame);

  const printWindow = frame.contentWindow;
  if (!printWindow) {
    frame.remove();
    throw new Error("Could not open the print view for the PDF report.");
  }

  const cleanup = () => {
    if (frame.parentNode) frame.parentNode.removeChild(frame);
  };
  printWindow.addEventListener("afterprint", cleanup);
  // Safety net in case afterprint never fires (e.g. the user closes the dialog on some browsers).
  window.setTimeout(cleanup, 5 * 60 * 1000);

  printWindow.document.open();
  printWindow.document.write(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${filename}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    @page {
      size: A4;
      margin: 20mm 18mm 24mm 18mm;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #1a1f36;
      font-size: 11pt;
      line-height: 1.65;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* ── Cover Page ── */
    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      text-align: center;
      page-break-after: always;
      background: linear-gradient(135deg, #f8f9fe 0%, #eef1f8 100%);
      padding: 40px;
    }
    .cover-logo {
      font-size: 48pt;
      font-weight: 700;
      color: #3b5998;
      margin-bottom: 8px;
      letter-spacing: -2px;
    }
    .cover-subtitle {
      font-size: 14pt;
      color: #6b7280;
      margin-bottom: 48px;
    }
    .cover-title {
      font-size: 28pt;
      font-weight: 700;
      color: #1a1f36;
      margin-bottom: 16px;
      letter-spacing: -1px;
    }
    .cover-date {
      font-size: 12pt;
      color: #6b7280;
    }
    .cover-disclaimer {
      position: absolute;
      bottom: 40px;
      left: 40px;
      right: 40px;
      font-size: 8pt;
      color: #9ca3af;
      text-align: center;
    }

    /* ── Content ── */
    .report-content {
      padding: 0;
    }
    h1 {
      font-size: 20pt;
      font-weight: 700;
      color: #1a1f36;
      margin: 32px 0 12px;
      letter-spacing: -0.5px;
    }
    h2 {
      font-size: 16pt;
      font-weight: 600;
      color: #1a1f36;
      margin: 28px 0 10px;
      letter-spacing: -0.3px;
    }
    h3 {
      font-size: 13pt;
      font-weight: 600;
      color: #1a1f36;
      margin: 24px 0 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e5e7eb;
    }
    h4 {
      font-size: 11pt;
      font-weight: 600;
      color: #374151;
      margin: 16px 0 6px;
    }
    p {
      margin: 0 0 10px;
      color: #374151;
    }
    ul, ol {
      margin: 0 0 12px 20px;
      padding: 0;
    }
    li {
      margin: 0 0 4px;
      color: #374151;
    }
    strong {
      color: #1a1f36;
      font-weight: 600;
    }
    em {
      color: #6b7280;
    }
    hr {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 20px 0;
    }
    blockquote {
      border-left: 3px solid #3b5998;
      padding-left: 12px;
      margin: 12px 0;
      color: #6b7280;
      font-style: italic;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 10pt;
    }
    th {
      background: #f3f4f6;
      font-weight: 600;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #e5e7eb;
      color: #1a1f36;
    }
    td {
      padding: 6px 10px;
      border: 1px solid #e5e7eb;
      color: #374151;
    }

    /* ── Dashboard Grid Layout & Cards ── */
    .grid {
      display: grid !important;
      grid-gap: 12px;
      margin-bottom: 16px;
    }
    .grid-cols-2 {
      grid-template-columns: repeat(2, 1fr) !important;
    }
    .md\:grid-cols-5 {
      grid-template-columns: repeat(5, 1fr) !important;
    }
    .md\:grid-cols-4 {
      grid-template-columns: repeat(4, 1fr) !important;
    }
    .gap-3 {
      grid-gap: 12px !important;
    }
    .gap-4 {
      grid-gap: 16px !important;
    }
    .mb-6 {
      margin-bottom: 24px !important;
    }
    .mb-3 {
      margin-bottom: 12px !important;
    }
    .my-6 {
      margin: 24px 0 !important;
    }
    
    /* Card Styles */
    .bg-secondary\/40, .bg-secondary\/30 {
      background: #f8f9fa !important;
      border: 1px solid #e9ecef !important;
      padding: 12px !important;
      border-radius: 8px !important;
      box-shadow: 0 1px 2px rgba(0,0,0,0.02) !important;
    }
    .p-3 {
      padding: 12px !important;
    }
    .rounded-xl {
      border-radius: 8px !important;
    }
    
    /* Text Styles */
    .text-\[10px\] {
      font-size: 8pt !important;
      text-transform: uppercase !important;
      font-weight: 600 !important;
      color: #6c757d !important;
      letter-spacing: 0.5px !important;
    }
    .text-sm {
      font-size: 10pt !important;
    }
    .font-bold {
      font-weight: 700 !important;
    }
    .text-navy {
      color: #1a1f36 !important;
    }
    .text-primary {
      color: #3b5998 !important;
    }
    
    /* Health Scores & Progress Bars */
    .h-2 {
      height: 6px !important;
    }
    .h-2\.5 {
      height: 8px !important;
    }
    .bg-secondary {
      background: #e9ecef !important;
    }
    .rounded-full {
      border-radius: 9999px !important;
    }
    .overflow-hidden {
      overflow: hidden !important;
    }
    .h-full {
      height: 100% !important;
    }
    .bg-emerald-500 {
      background: #10b981 !important;
    }
    .bg-amber-500 {
      background: #f59e0b !important;
    }
    .bg-red-500 {
      background: #ef4444 !important;
    }
    
    /* Star Rating Box */
    .bg-primary\/5 {
      background: rgba(59, 89, 152, 0.05) !important;
      border: 1px solid rgba(59, 89, 152, 0.2) !important;
    }
    
    /* Badges */
    .px-2 {
      padding-left: 8px !important;
      padding-right: 8px !important;
    }
    .py-0\.5 {
      padding-top: 2px !important;
      padding-bottom: 2px !important;
    }
    .rounded {
      border-radius: 4px !important;
    }
    .text-xs {
      font-size: 8pt !important;
    }
    .bg-red-50 {
      background: #fef2f2 !important;
    }
    .text-red-600 {
      color: #dc2626 !important;
    }
    .border-red-100 {
      border-color: #fee2e2 !important;
    }
    
    /* Charts Container */
    .charts-print-container {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      grid-gap: 16px;
      margin: 20px 0;
      page-break-inside: avoid;
    }
    .print-chart-card {
      background: #fff;
      border: 1px solid #e5e7eb;
      padding: 12px;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    
    /* Page Break Rules */
    h3 {
      page-break-after: avoid;
    }
    table, blockquote, .grid {
      page-break-inside: avoid;
    }

    /* ── Footer ── */
    .page-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 8px 18mm;
      font-size: 8pt;
      color: #9ca3af;
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #e5e7eb;
    }

    /* ── Print-specific ── */
    @media print {
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>

  <!-- Cover Page -->
  <div class="cover-page">
    <div class="cover-logo">Folio</div>
    <div class="cover-subtitle">Portfolio Analytics Platform</div>
    <div class="cover-title">AI Portfolio Analysis Report</div>
    <div class="cover-date">${dateStr} · ${timeStr}</div>
    <div class="cover-disclaimer">
      This report is generated by AI for educational purposes only. It does not constitute financial advice.
      Always consult a qualified financial advisor before making investment decisions.
    </div>
  </div>

  <!-- Report Content -->
  <div class="report-content">
    ${content}
  </div>

  <div class="page-footer">
    <span>Folio — AI Portfolio Report</span>
    <span>${dateStr}</span>
  </div>

  <script>
    // Auto-trigger print dialog once fonts and layout are ready
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 300);
    };
  </script>
</body>
</html>
  `);

  printWindow.document.close();
}
