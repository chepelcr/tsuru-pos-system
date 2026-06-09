import { useRef, useState } from "react";
import { Button, Icon } from "@/components/ui";
import { ErrorBox } from "@/components/feedback/ErrorBox";
import { ordersApi, ordersOrgPath } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ProductListResponse } from "@/types";

interface ProductExcelUploadProps {
  orgId: string;
  onUploadSuccess?: (count: number) => void;
}

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Canonical import template headers. ORDER MATTERS — the cross-app-be Excel
 * parser depends on this exact column sequence. Do not reorder/rename.
 */
const TEMPLATE_HEADERS = [
  "COD_ARTIC",
  "COD_BARRA",
  "COD_INTERNO",
  "DESCRIPCION",
  "CANTIDAD_CAJA",
  "UNIDAD_MEDIDA",
  "PRECIO",
  "CATEGORIA",
];

const TEMPLATE_EXAMPLE_ROW = [
  "17441119600000",
  "7441119600003",
  "2648022",
  "JUEGO SABANA BEBE BLANCA DOCOMA",
  "3.00",
  "",
  "0.00",
  "Bebé",
];

function downloadTemplate() {
  const csvContent = [
    TEMPLATE_HEADERS.join(","),
    TEMPLATE_EXAMPLE_ROW.join(","),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "product-import-template.csv");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ProductExcelUpload({ orgId, onUploadSuccess }: ProductExcelUploadProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickFile = (next: File | null) => {
    setError(null);
    setFile(next);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) pickFile(dropped);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const data = await fileToBase64(file);
      // TODO(verify-endpoint): POST /api/organizations/{org}/products/parse on
      // cross-app-be — confirmed present (products_controller.parse_products_excel,
      // body ExcelDTO { data, name, contentType }, returns ProductListResponse).
      const result = await ordersApi.post<ProductListResponse>(
        ordersOrgPath(orgId, "/products/parse"),
        {
          data,
          name: file.name.replace(/\.[^/.]+$/, ""),
          contentType: file.type || XLSX_MIME,
        }
      );
      const count = result.pagination?.total_elements ?? result.data?.length ?? 0;
      onUploadSuccess?.(count);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      // Map known parser failures to friendly i18n copy; otherwise surface raw.
      let message = t("products.excel.uploadFailed");
      if (err instanceof Error) {
        if (err.message.includes("Could not open Excel file")) {
          message = t("products.excel.invalidFileFormat");
        } else if (err.message.includes("headers")) {
          message = t("products.excel.missingHeaders");
        } else if (err.message) {
          message = err.message;
        }
      }
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="t-sm text-muted-foreground">{t("products.import.description")}</p>

      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          icon="download"
          onClick={downloadTemplate}
          disabled={uploading}
        >
          {t("products.excel.downloadTemplate")}
        </Button>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`w-full rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 px-4 py-8 text-center transition-colors cursor-pointer ${
          dragging ? "border-primary bg-primary/[0.06]" : "border-border bg-muted/35"
        }`}
      >
        <Icon name="upload" size={28} className="text-muted-foreground" />
        {file ? (
          <div className="text-[13px] font-semibold text-foreground break-all">{file.name}</div>
        ) : (
          <>
            <div className="text-[13px] font-semibold text-foreground">
              {t("products.excel.dropHint")}
            </div>
            <div className="t-xs text-muted-foreground">{t("products.excel.fileTypes")}</div>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />

      {error && <ErrorBox message={error} />}

      {file && (
        <Button
          variant="primary"
          icon={uploading ? "refresh" : "upload"}
          onClick={handleUpload}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? t("products.excel.processing") : t("products.excel.uploadButton")}
        </Button>
      )}
    </div>
  );
}
