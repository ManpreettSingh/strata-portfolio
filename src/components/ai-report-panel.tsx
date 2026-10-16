/**
 * ai-report-panel.tsx — Slide-out panel for displaying AI-generated portfolio reports.
 * Includes markdown rendering, section navigation, and PDF export trigger.
 */

import { useEffect, useRef, useState } from "react";
import {
  X,
  Download,
  Loader2,
  FileText,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { generateReportPDF } from "@/lib/pdf-export";
import { toast } from "sonner";

interface AiReportPanelProps {
  isOpen: boolean;
  onClose: () => void;
  report: string | null;
  isLoading: boolean;
  error: string | null;
}

export function AiReportPanel({ isOpen, onClose, report, isLoading, error }: AiReportPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);



  const handleDownloadMarkdown = () => {
    if (!report) return;
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Folio_Portfolio_Report.md";
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStyledHtml = (htmlContent: string) => {
    return [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head>',
      '  <meta charset="UTF-8">',
      '  <title>Folio Portfolio Report</title>',
      '  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">',
      '  <style>',
      "    body { font-family: 'Inter', sans-serif; color: #1a1f36; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; }",
      '    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px; }',
      '    .bg-secondary\\/40, .bg-secondary\\/30 { background: #f8f9fa; border: 1px solid #e9ecef; padding: 12px; border-radius: 8px; }',
      '    .text-\\[10px\\] { font-size: 10px; text-transform: uppercase; font-weight: 600; color: #6c757d; }',
      '    .text-sm { font-size: 14px; }',
      '    .font-bold { font-weight: 700; }',
      '    .text-navy { color: #1a1f36; }',
      '    .text-primary { color: #3b5998; }',
      '    .h-2 { height: 8px; background: #e9ecef; border-radius: 9999px; overflow: hidden; margin-top: 4px; }',
      '    .h-full { height: 100%; border-radius: 9999px; }',
      '    .bg-emerald-500 { background: #10b981; }',
      '    .bg-amber-500 { background: #f59e0b; }',
      '    .bg-red-500 { background: #ef4444; }',
      '    .bg-primary { background: #3b5998; }',
      '    .bg-primary\\/5 { background: rgba(59, 89, 152, 0.05); border: 1px solid rgba(59, 89, 152, 0.2); padding: 12px; border-radius: 8px; }',
      '    table { width: 100%; border-collapse: collapse; margin: 20px 0; }',
      '    th { background: #f8f9fa; text-align: left; padding: 10px; border: 1px solid #e9ecef; }',
      '    td { padding: 10px; border: 1px solid #e9ecef; }',
      '    .px-2 { padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }',
      '    .bg-red-50 { background: #fef2f2; color: #dc2626; border: 1px solid #fee2e2; }',
      '    .bg-amber-50 { background: #fffbeb; color: #d97706; border: 1px solid #fef3c7; }',
      '    .bg-emerald-50 { background: #ecfdf5; color: #059669; border: 1px solid #d1fae5; }',
      '    blockquote { border-left: 4px solid #3b5998; padding-left: 16px; font-style: italic; color: #4a5568; margin: 20px 0; }',
      '    h1, h2, h3, h4 { color: #1a1f36; }',
      '    h3 { border-bottom: 1px solid #e9ecef; padding-bottom: 8px; margin-top: 32px; }',
      '    .no-print { display: none !important; }',
      '  </style>',
      '</head>',
      '<body>',
      '  <div style="text-align: center; margin-bottom: 40px; border-bottom: 2px solid #e9ecef; padding-bottom: 20px;">',
      '    <h1 style="margin: 0; color: #3b5998;">Folio</h1>',
      '    <p style="margin: 5px 0 0; color: #6c757d; font-size: 14px;">AI Portfolio Analysis Report</p>',
      '  </div>',
      `  <div id="report-content">${htmlContent}</div>`,
      '</body>',
      '</html>'
    ].join('\n');
  };

  const handleDownloadHTML = () => {
    if (!report || !contentRef.current) return;
    const styledHtml = getStyledHtml(contentRef.current.innerHTML);
    const blob = new Blob([styledHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Folio_Portfolio_Report.html";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = async () => {
    if (!report || !contentRef.current) return;

    try {
      // Opens the browser's print dialog with a styled A4 layout; choose "Save as PDF" as the printer.
      await generateReportPDF(contentRef.current, "Folio_Portfolio_Report");
      toast.info('In the print window choose "Save as PDF" to download the report.');
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      toast.error(`PDF generation failed: ${err.message || err}`);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        style={{ animation: "fadeIn 200ms ease" }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 z-50 h-full w-full max-w-[720px] bg-card border-l border-border shadow-2xl flex flex-col"
        style={{ animation: "slideInRight 300ms ease" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: "color-mix(in oklch, var(--color-primary) 12%, transparent)" }}>
              <FileText className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-navy">AI Portfolio Report</h2>
              <p className="text-xs text-muted-foreground">Powered by Google Gemini</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {report && (
              <>
                <button
                  onClick={handleDownloadPDF}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-primary-foreground hover:scale-[1.01] transition-all"
                  style={{
                    background: "linear-gradient(135deg, var(--color-primary), color-mix(in oklch, var(--color-primary) 80%, var(--color-chart-5)))"
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </button>
                <button
                  onClick={handleDownloadHTML}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-border bg-card hover:bg-secondary transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download HTML
                </button>
                <button
                  onClick={handleDownloadMarkdown}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-border bg-card hover:bg-secondary transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download Text
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin" style={{ color: "var(--color-primary)" }} />
              </div>
              <div className="text-center">
                <p className="text-navy font-medium">Generating your report...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Analyzing portfolio data and creating insights
                </p>
              </div>
              {/* Skeleton */}
              <div className="w-full max-w-[500px] space-y-3 mt-4">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-4 rounded-full animate-pulse"
                    style={{
                      background: "var(--color-secondary)",
                      width: `${80 - i * 8}%`,
                      animationDelay: `${i * 100}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="p-3 rounded-full" style={{ background: "color-mix(in oklch, var(--color-loss) 12%, transparent)" }}>
                <AlertCircle className="h-8 w-8" style={{ color: "var(--color-loss)" }} />
              </div>
              <div className="text-center max-w-[400px]">
                <p className="text-navy font-medium">Report generation failed</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          )}

          {report && !isLoading && !error && (
            <div ref={contentRef}>
              {/* Timestamp */}
              <div className="text-xs text-muted-foreground mb-6 flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                Generated on {new Date().toLocaleDateString("en-IN", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              {/* Markdown content */}
              <div
                className="prose prose-sm max-w-none text-foreground
                  [&_h1]:text-navy [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-8
                  [&_h2]:text-navy [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-6
                  [&_h3]:text-navy [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:border-b [&_h3]:border-border [&_h3]:pb-2
                  [&_h4]:text-navy [&_h4]:text-base [&_h4]:font-medium [&_h4]:mb-2 [&_h4]:mt-4
                  [&_p]:text-foreground [&_p]:leading-relaxed [&_p]:mb-3
                  [&_ul]:mb-3 [&_ul]:space-y-1
                  [&_li]:text-foreground [&_li]:leading-relaxed
                  [&_strong]:text-navy [&_strong]:font-semibold
                  [&_em]:text-muted-foreground
                  [&_hr]:border-border [&_hr]:my-6
                  [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground
                  [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm
                  [&_th]:bg-secondary [&_th]:text-navy [&_th]:font-medium [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:border [&_th]:border-border
                  [&_td]:px-3 [&_td]:py-2 [&_td]:border [&_td]:border-border
                "
                dangerouslySetInnerHTML={{ __html: renderMarkdown(report) }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

function parseMarkdownTables(md: string): string {
  const lines = md.split('\n');
  let inTable = false;
  let tableHtml = '';
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableHtml = '<table class="w-full border-collapse text-sm my-4">';
        const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        tableHtml += '<thead><tr>';
        cells.forEach(cell => {
          tableHtml += `<th class="bg-secondary/60 text-navy font-semibold px-3 py-2 text-left border border-border">${cell}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';
        if (i + 1 < lines.length && lines[i + 1].includes('---')) {
          i++;
        }
      } else {
        const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        tableHtml += '<tr class="hover:bg-secondary/20">';
        cells.forEach(cell => {
          let cellContent = cell;
          if (cell === 'High') {
            cellContent = '<span class="px-2 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-600 border border-red-200">High</span>';
          } else if (cell === 'Medium') {
            cellContent = '<span class="px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200">Medium</span>';
          } else if (cell === 'Low') {
            cellContent = '<span class="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">Low</span>';
          } else if (cell.startsWith('🟢')) {
            cellContent = `<span class="flex items-center gap-1 text-emerald-600 font-medium">${cell}</span>`;
          } else if (cell.startsWith('🔴')) {
            cellContent = `<span class="flex items-center gap-1 text-red-600 font-medium">${cell}</span>`;
          }
          tableHtml += `<td class="px-3 py-2 border border-border">${cellContent}</td>`;
        });
        tableHtml += '</tr>';
      }
    } else {
      if (inTable) {
        inTable = false;
        tableHtml += '</tbody></table>';
        result.push(tableHtml);
      }
      result.push(lines[i]);
    }
  }
  if (inTable) {
    tableHtml += '</tbody></table>';
    result.push(tableHtml);
  }
  return result.join('\n');
}
function renderMarkdown(md: string): string {
  let parsed = parseMarkdownTables(md);

  const kpiRegex = /- \*\*Portfolio Value:\*\* ([^\n]+)\n- \*\*Total Invested:\*\* ([^\n]+)\n- \*\*Overall P&L:\*\* ([^\n]+)\n- \*\*Today's Change:\*\* ([^\n]+)\n- \*\*Overall Rating:\*\* ([^\n]+)/g;
  parsed = parsed.replace(kpiRegex, `
<div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 no-print">
  <div class="bg-secondary/40 border border-border/80 p-3 rounded-xl">
    <div class="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Portfolio Value</div>
    <div class="text-sm font-bold text-navy mt-1">$1</div>
  </div>
  <div class="bg-secondary/40 border border-border/80 p-3 rounded-xl">
    <div class="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Total Invested</div>
    <div class="text-sm font-bold text-navy mt-1">$2</div>
  </div>
  <div class="bg-secondary/40 border border-border/80 p-3 rounded-xl">
    <div class="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Overall P&L</div>
    <div class="text-sm font-bold text-navy mt-1">$3</div>
  </div>
  <div class="bg-secondary/40 border border-border/80 p-3 rounded-xl">
    <div class="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Today's Change</div>
    <div class="text-sm font-bold text-navy mt-1">$4</div>
  </div>
  <div class="bg-secondary/40 border border-border/80 p-3 rounded-xl col-span-2 md:col-span-1">
    <div class="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Overall Rating</div>
    <div class="text-sm font-bold text-primary mt-1">$5</div>
  </div>
</div>
  `);

  const metricsRegex = /- \*\*Diversification Score:\*\* ([^\n]+)\n- \*\*Risk Level:\*\* ([^\n]+)\n- \*\*Largest Holding:\*\* ([^\n]+)\n- \*\*Number of Assets:\*\* ([^\n]+)\n- \*\*Best Performer:\*\* ([^\n]+)\n- \*\*Worst Performer:\*\* ([^\n]+)\n- \*\*Expected Volatility:\*\* ([^\n]+)\n- \*\*Dominant Asset Class:\*\* ([^\n]+)/g;
  parsed = parsed.replace(metricsRegex, `
<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
  <div class="bg-secondary/30 border border-border p-3 rounded-xl">
    <div class="text-[10px] uppercase font-semibold text-muted-foreground">Diversification</div>
    <div class="text-sm font-bold text-navy mt-0.5">$1</div>
  </div>
  <div class="bg-secondary/30 border border-border p-3 rounded-xl">
    <div class="text-[10px] uppercase font-semibold text-muted-foreground">Risk Level</div>
    <div class="text-sm font-bold text-navy mt-0.5">$2</div>
  </div>
  <div class="bg-secondary/30 border border-border p-3 rounded-xl">
    <div class="text-[10px] uppercase font-semibold text-muted-foreground">Largest Holding</div>
    <div class="text-sm font-bold text-navy mt-0.5">$3</div>
  </div>
  <div class="bg-secondary/30 border border-border p-3 rounded-xl">
    <div class="text-[10px] uppercase font-semibold text-muted-foreground">Number of Assets</div>
    <div class="text-sm font-bold text-navy mt-0.5">$4</div>
  </div>
  <div class="bg-secondary/30 border border-border p-3 rounded-xl">
    <div class="text-[10px] uppercase font-semibold text-muted-foreground">Best Performer</div>
    <div class="text-sm font-bold text-emerald-600 mt-0.5">$5</div>
  </div>
  <div class="bg-secondary/30 border border-border p-3 rounded-xl">
    <div class="text-[10px] uppercase font-semibold text-muted-foreground">Worst Performer</div>
    <div class="text-sm font-bold text-red-600 mt-0.5">$6</div>
  </div>
  <div class="bg-secondary/30 border border-border p-3 rounded-xl">
    <div class="text-[10px] uppercase font-semibold text-muted-foreground">Expected Volatility</div>
    <div class="text-sm font-bold text-navy mt-0.5">$7</div>
  </div>
  <div class="bg-secondary/30 border border-border p-3 rounded-xl">
    <div class="text-[10px] uppercase font-semibold text-muted-foreground">Dominant Asset Class</div>
    <div class="text-sm font-bold text-navy mt-0.5">$8</div>
  </div>
</div>
  `);

  // Parse health scores without emojis
  parsed = parsed
    .replace(/[-*] \*\*Performance:\*\* (\d+(?:\.\d+)?)\/10/g, `
      <div class="mb-3">
        <div class="flex justify-between items-center text-sm font-medium mb-1">
          <span class="text-navy font-semibold">Performance</span>
          <span class="text-navy font-bold">$1/10</span>
        </div>
        <div class="h-2 bg-secondary rounded-full overflow-hidden">
          <div class="h-full bg-emerald-500 rounded-full" style="width: calc($1 * 10%)"></div>
        </div>
      </div>
    `)
    .replace(/[-*] \*\*Diversification:\*\* (\d+(?:\.\d+)?)\/10/g, `
      <div class="mb-3">
        <div class="flex justify-between items-center text-sm font-medium mb-1">
          <span class="text-navy font-semibold">Diversification</span>
          <span class="text-navy font-bold">$1/10</span>
        </div>
        <div class="h-2 bg-secondary rounded-full overflow-hidden">
          <div class="h-full bg-amber-500 rounded-full" style="width: calc($1 * 10%)"></div>
        </div>
      </div>
    `)
    .replace(/[-*] \*\*Risk:\*\* ([^\n]+)/g, `
      <div class="mb-3">
        <div class="flex justify-between items-center text-sm font-medium mb-1">
          <span class="text-navy font-semibold">Risk</span>
          <span class="text-red-600 font-bold px-2 py-0.5 bg-red-50 rounded text-xs border border-red-100">$1</span>
        </div>
        <div class="h-2 bg-secondary rounded-full overflow-hidden">
          <div class="h-full bg-red-500 rounded-full" style="width: 100%"></div>
        </div>
      </div>
    `)
    .replace(/[-*] \*\*Overall Health:\*\* (\d+(?:\.\d+)?)\/10/g, `
      <div class="mb-3 bg-primary/5 border border-primary/20 p-3 rounded-xl mt-4">
        <div class="flex justify-between items-center text-sm font-semibold mb-1.5">
          <span class="text-primary font-bold">Overall Health</span>
          <span class="text-primary font-bold text-base">$1/10</span>
        </div>
        <div class="h-2.5 bg-primary/20 rounded-full overflow-hidden">
          <div class="h-full bg-primary rounded-full" style="width: calc($1 * 10%)"></div>
        </div>
      </div>
    `);

  let html = parsed
    .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^---$/gm, "<hr/>")
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>");

  html = html
    .split("\n\n")
    .map((block) => {
      block = block.trim();
      if (!block) return "";
      if (/^<[hupobd]|^<li|^<hr|^<ul|^<table/i.test(block)) return block;
      return `<p>${block}</p>`;
    })
    .join("\n");

  html = html.replace(/<p>\n/g, "<p>").replace(/\n<\/p>/g, "</p>");

  return html;
}
