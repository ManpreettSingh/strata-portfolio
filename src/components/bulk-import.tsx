import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { portfolioActions } from "@/lib/portfolio-store";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Download, Upload, AlertCircle, CheckCircle2, FileSpreadsheet, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ParsedRow = {
  symbol: string;
  name: string;
  type: "STOCK" | "CRYPTO" | "ETF" | "COMMODITY" | "INDEX";
  quantity: number;
  averagePurchasePrice: number;
  purchaseDate: string;
  notes?: string;
  status?: "pending" | "success" | "error";
  errorMsg?: string;
};

export function BulkImport() {
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const headers = ["symbol", "name", "type", "quantity", "average_price", "purchase_date", "notes"];
    const rows = [
      ["RELIANCE.NS", "Reliance Industries", "STOCK", "10", "2400.50", "2026-06-01", "NSE stock holding"],
      ["BTC", "Bitcoin", "CRYPTO", "0.05", "64800.00", "2026-05-15", "Crypto investment"],
      ["AAPL", "Apple Inc.", "STOCK", "15", "215.30", "2026-06-10", "US Stock portfolio"],
      ["VOO", "Vanguard S&P 500 ETF", "ETF", "5", "512.40", "2026-06-20", "Index ETF"],
    ];

    const csvContent = [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "folio_bulk_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Import template CSV downloaded successfully.");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        toast.error("File is empty or corrupt.");
        return;
      }

      try {
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) {
          toast.error("CSV must contain a header row and at least one data row.");
          return;
        }

        // Header mapping
        const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));
        
        const symbolIdx = headers.indexOf("symbol");
        const nameIdx = headers.indexOf("name");
        const typeIdx = headers.indexOf("type");
        const qtyIdx = headers.indexOf("quantity");
        const priceIdx = headers.indexOf("average_price");
        const dateIdx = headers.indexOf("purchase_date");
        const notesIdx = headers.indexOf("notes");

        if (symbolIdx === -1 || qtyIdx === -1 || priceIdx === -1) {
          toast.error("CSV must contain at least 'symbol', 'quantity', and 'average_price' columns.");
          return;
        }

        const rows: ParsedRow[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Simple CSV parser supporting quotes
          const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(",");
          const values = matches.map(v => v.replace(/^["']|["']$/g, "").trim());

          const symbol = values[symbolIdx]?.toUpperCase() || "";
          const name = nameIdx !== -1 ? values[nameIdx] || symbol : symbol;
          const rawType = typeIdx !== -1 ? values[typeIdx]?.toUpperCase() : "";
          const type = (["STOCK", "CRYPTO", "ETF", "COMMODITY", "INDEX"].includes(rawType) 
            ? rawType 
            : symbol.endsWith(".NS") || symbol.endsWith(".BO") ? "STOCK" : "CRYPTO") as any;

          const quantity = parseFloat(values[qtyIdx]);
          const averagePurchasePrice = parseFloat(values[priceIdx]);
          const purchaseDate = dateIdx !== -1 && values[dateIdx] ? values[dateIdx] : new Date().toISOString().slice(0,10);
          const notes = notesIdx !== -1 ? values[notesIdx] : "";

          if (!symbol) continue;

          const hasError = isNaN(quantity) || quantity <= 0 || isNaN(averagePurchasePrice) || averagePurchasePrice < 0;
          const errorMsg = isNaN(quantity) || quantity <= 0 
            ? "Invalid quantity" 
            : isNaN(averagePurchasePrice) || averagePurchasePrice < 0 
              ? "Invalid price" 
              : undefined;

          rows.push({
            symbol,
            name,
            type,
            quantity: isNaN(quantity) ? 0 : quantity,
            averagePurchasePrice: isNaN(averagePurchasePrice) ? 0 : averagePurchasePrice,
            purchaseDate,
            notes,
            status: hasError ? "error" : "pending",
            errorMsg
          });
        }

        setParsedData(rows);
        toast.success(`Successfully parsed ${rows.length} rows. Please review below.`);
      } catch (err) {
        console.error(err);
        toast.error("Failed to parse CSV file. Ensure standard format.");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const validRows = parsedData.filter(r => r.status !== "error");
    if (validRows.length === 0) {
      toast.error("No valid rows to import.");
      return;
    }

    setImporting(true);
    let successCount = 0;

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      if (row.status === "error") continue;

      try {
        await portfolioActions.addHolding({
          symbol: row.symbol,
          name: row.name,
          type: row.type.toLowerCase() as any,
          quantity: row.quantity,
          avgPrice: row.averagePurchasePrice,
          currentPrice: row.averagePurchasePrice, // Initial price set same as buy price, will be updated by websocket
          purchaseDate: row.purchaseDate,
          notes: row.notes,
        });
        parsedData[i].status = "success";
        successCount++;
      } catch (err: any) {
        parsedData[i].status = "error";
        parsedData[i].errorMsg = err.message || "Insert failed";
      }
    }

    setParsedData([...parsedData]);
    setImporting(false);
    toast.success(`Import completed. Added ${successCount} holdings to your portfolio.`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-navy flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Bulk Portfolio Import
        </CardTitle>
        <CardDescription>
          Download our template, add your transactions, and upload the CSV file to automatically import all your stock and crypto holdings at once.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Button variant="outline" className="rounded-full gap-2 shrink-0" onClick={downloadTemplate}>
            <Download className="h-4 w-4" /> Download Template CSV
          </Button>
          <div className="relative flex-1">
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              id="csv-file-upload"
            />
            <label
              htmlFor="csv-file-upload"
              className="inline-flex h-9 w-full sm:w-auto items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 cursor-pointer gap-2"
            >
              <Upload className="h-4 w-4" /> Upload CSV File
            </label>
          </div>
        </div>

        {parsedData.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-navy">Preview & Verify Holdings ({parsedData.length} entries)</h4>
              <Button 
                onClick={handleImport} 
                disabled={importing || !parsedData.some(r => r.status === "pending")}
                className="rounded-full gap-2"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Importing...
                  </>
                ) : (
                  "Import Holdings"
                )}
              </Button>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-surface-muted">
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Asset Class</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Avg Price</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((row, idx) => (
                    <TableRow key={idx} className={cn(row.status === "error" && "bg-loss/5 hover:bg-loss/10")}>
                      <TableCell className="font-semibold">{row.symbol}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{row.name}</TableCell>
                      <TableCell className="text-xs">{row.type}</TableCell>
                      <TableCell className="text-right num">{row.quantity}</TableCell>
                      <TableCell className="text-right num">{row.averagePurchasePrice}</TableCell>
                      <TableCell className="text-xs">{row.purchaseDate}</TableCell>
                      <TableCell>
                        {row.status === "pending" && (
                          <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">Pending</span>
                        )}
                        {row.status === "success" && (
                          <span className="text-xs text-gain bg-gain/10 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><CheckCircle2 className="h-3 w-3" /> Success</span>
                        )}
                        {row.status === "error" && (
                          <span className="text-xs text-loss bg-loss/10 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit" title={row.errorMsg}><AlertCircle className="h-3 w-3" /> Error</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
