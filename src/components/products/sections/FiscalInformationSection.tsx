import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Landmark, X, Search } from "lucide-react";
import { Spinner, FormLabel, Modal } from "@/components/ui";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCabysSearch, useAllProductTypes } from "@/hooks/useDataApi";
import { CountryISO } from "@/lib/enums";
import type { ProductFormState } from "@/types/productForm";
import type { CabysItem } from "@/services/data-api";

const ISO = CountryISO.COSTA_RICA;

interface FiscalInformationSectionProps {
  form: ProductFormState;
  isExpanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
  onChange: (patch: Partial<ProductFormState>) => void;
  onCabysSelect: (item: CabysItem) => void;
}

export function FiscalInformationSection({
  form,
  isExpanded,
  onToggle,
  disabled,
  onChange,
  onCabysSelect,
}: FiscalInformationSectionProps) {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingProductTypeId, setPendingProductTypeId] = useState<number | undefined>();
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: productTypesData } = useAllProductTypes();
  const productTypes = productTypesData ?? [];

  const [searchResults, setSearchResults] = useState<CabysItem[]>([]);

  const { refetch: runSearch, isFetching: isFetchingSearch } = useCabysSearch(
    {
      iso_code: ISO,
      search: searchTerm,
      size: 20,
      type: form.productTypeId,
    },
    { enabled: false }
  );

  useEffect(() => {
    if (showResults && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [showResults]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        inputRef.current && !inputRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = async () => {
    if (!searchTerm.trim() || !form.productTypeId) return;
    setIsSearching(true);
    try {
      const result = await runSearch();
      const items = result.data?.items ?? [];
      if (items.length === 1) {
        selectCabys(items[0]);
      } else {
        setSearchResults(items);
        setShowResults(true);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const selectCabys = (item: CabysItem) => {
    onChange({
      cabysId: item.id,
      cabys: item.code,
      cabysDescription: item.description ?? item.code,
    });
    onCabysSelect(item);
    setShowResults(false);
    setSearchTerm(item.description ?? item.code);
  };

  const clearCabys = () => {
    onChange({ cabysId: "", cabys: "", cabysDescription: "" });
    setSearchTerm("");
    setSearchResults([]);
  };

  const handleProductTypeClick = (id: number) => {
    if (form.cabys && form.productTypeId !== id) {
      setPendingProductTypeId(id);
      setShowConfirm(true);
    } else {
      onChange({ productTypeId: id });
    }
  };

  const confirmProductTypeChange = () => {
    clearCabys();
    onChange({ productTypeId: pendingProductTypeId, cabysId: "", cabys: "", cabysDescription: "" });
    setPendingProductTypeId(undefined);
    setShowConfirm(false);
  };

  const loading = isFetchingSearch || isSearching;

  return (
    <>
      <SectionWrapper
        title={t("products.fiscalInformation")}
        icon={Landmark}
        isExpanded={isExpanded}
        onToggle={onToggle}
        disabled={disabled}
      >
        {productTypes.length > 0 && (
          <div>
            <FormLabel>{t("products.productType")}</FormLabel>
            <div className="flex flex-wrap gap-2 mt-1">
              {productTypes.map((pt: { id: number; description: string }) => {
                const selected = form.productTypeId === pt.id;
                return (
                  <button
                    key={pt.id}
                    type="button"
                    onClick={() => handleProductTypeClick(pt.id)}
                    className={`px-3.5 py-[5px] rounded-full text-xs font-medium border-[1.5px] cursor-pointer transition-all ${
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-transparent text-foreground"
                    }`}
                  >
                    {pt.description}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {form.cabys ? (
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-primary/[0.06] border-[1.5px] border-primary/35 rounded-lg">
            <div className="flex-1">
              <div className="font-mono text-[11px] font-bold text-primary tracking-[0.05em]">
                {form.cabys}
              </div>
              <div className="text-xs mt-0.5 text-foreground">{form.cabysDescription}</div>
            </div>
            <button
              type="button"
              onClick={clearCabys}
              className="btn btn-ghost btn-icon btn-sm"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="relative">
            <FormLabel required>{t("products.searchCabys")}</FormLabel>
            <div className="flex gap-1.5">
              <div className="flex-1 relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <input
                  ref={inputRef}
                  className="pp-input pl-[30px]"
                  placeholder={
                    !form.productTypeId
                      ? t("products.selectProductTypeFirst")
                      : t("products.searchByName")
                  }
                  value={searchTerm}
                  disabled={!form.productTypeId}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  onFocus={() => searchResults.length > 0 && setShowResults(true)}
                />
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm flex-shrink-0 !px-3"
                disabled={!searchTerm.trim() || !form.productTypeId || loading}
                onClick={handleSearch}
              >
                {loading ? <Spinner size={14} /> : <Search size={14} />}
              </button>
            </div>

            {showResults && (searchResults.length > 0 || (!loading && searchResults.length === 0)) && createPortal(
              <div
                ref={dropdownRef}
                className="z-popover bg-card border border-border rounded-lg shadow-dropdown overflow-hidden max-h-[260px] overflow-y-auto"
                style={{
                  position: "absolute",
                  top: dropdownPosition.top,
                  left: dropdownPosition.left,
                  width: dropdownPosition.width,
                }}
              >
                {searchResults.length > 0 ? (
                  searchResults.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => selectCabys(item)}
                      className="w-full px-3.5 py-2.5 text-left bg-transparent border-0 border-b border-border/50 cursor-pointer flex flex-col gap-0.5 hover:bg-muted/50"
                    >
                      <span className="font-mono text-[11px] text-primary font-bold">
                        {item.code}
                      </span>
                      <span className="text-xs text-foreground">{item.description}</span>
                      {item.tax_rate && (
                        <span className="text-[11px] text-muted-foreground">
                          {t("products.suggestedIva", { pct: String(item.tax_rate.percentage) })}
                        </span>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-xs text-muted-foreground text-center">
                    {t("products.noResultsFor", { query: searchTerm })}
                  </div>
                )}
              </div>,
              document.body
            )}
          </div>
        )}

        <p className="t-xs text-muted-foreground">{t("products.cabysHelp")}</p>
      </SectionWrapper>

      <Modal
        open={showConfirm}
        onClose={() => { setPendingProductTypeId(undefined); setShowConfirm(false); }}
        title={t("products.changeProductType")}
        description={t("products.changeProductTypeWarning")}
        variant="warning"
        cancel={{
          label: t("common.cancel"),
          onClick: () => { setPendingProductTypeId(undefined); setShowConfirm(false); },
        }}
        confirm={{ label: t("common.continue"), onClick: confirmProductTypeChange }}
      />
    </>
  );
}
