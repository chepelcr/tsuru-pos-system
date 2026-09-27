import { useState, useRef, useEffect } from "react";
import { Landmark, Search, X } from "lucide-react";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { CabysManualEntry } from "@/components/common/CabysManualEntry";
import { Spinner, FormLabel, Modal } from "@/components/ui";
import { OverlayPortal } from "@/components/ui/OverlayPortal";
import { useCabysSearch, useAllProductTypes } from "@/hooks/useDataApi";
import { useIsOnline } from "@/hooks/useIsOnline";
import { useLanguage } from "@/contexts/LanguageContext";
import { CountryISO } from "@/lib/enums";
import type { FiscalMode } from "@/lib/fiscalForm";
import type { CabysItem } from "@/services/data-api";

const ISO = CountryISO.COSTA_RICA;

const LABELS = {
  product: {
    title: "products.fiscalInformation",
    search: "products.searchCabys",
    placeholder: "products.searchByName",
    selectTypeFirst: "products.selectProductTypeFirst",
  },
  line: {
    title: "lineDetail.fiscalInfo",
    search: "lineDetail.searchCabys",
    placeholder: "lineDetail.cabysSearchPlaceholder",
    selectTypeFirst: "lineDetail.selectProductTypeFirst",
  },
} as const;

interface FiscalSectionProps {
  mode: FiscalMode;
  productTypeId?: number;
  cabys?: string;
  /** Shown under the code when known (a product stores it; a line does not). */
  cabysDescription?: string;
  isExpanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
  /** `clearCabys` is true when the change dropped a CABYS of the old type. */
  onProductTypeChange: (id: number, clearCabys: boolean) => void;
  /** A search result was picked — the caller applies the code AND its IVA. */
  onCabysSelect: (item: CabysItem) => void;
  /**
   * A hand-typed code. Only the code: the IVA rate arrives with a search result
   * and must not be guessed — `CabysManualEntry` warns about exactly that.
   */
  onCabysManual: (code: string) => void;
  onCabysClear: () => void;
}

/**
 * Product type + CABYS, for the product drawer and the POS line-detail drawer.
 *
 * The product requires a type to be picked before searching (it is stored on
 * the product); a line defaults to the first type so a cashier can search
 * straight away.
 */
export function FiscalSection({
  mode,
  productTypeId,
  cabys,
  cabysDescription,
  isExpanded,
  onToggle,
  disabled,
  onProductTypeChange,
  onCabysSelect,
  onCabysManual,
  onCabysClear,
}: FiscalSectionProps) {
  const { t } = useLanguage();
  const labels = LABELS[mode];
  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<CabysItem[]>([]);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [pendingProductTypeId, setPendingProductTypeId] = useState<number | undefined>();
  // Manual code entry. Offline it is the only way in — the CABYS catalog is a
  // server search with no local mirror (docs/OFFLINE.md).
  const online = useIsOnline();
  const [manualEntry, setManualEntry] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: productTypesData } = useAllProductTypes();
  const productTypes = productTypesData ?? [];

  const typeId =
    productTypeId || (mode === "line" && productTypes.length > 0 ? productTypes[0].id : undefined);

  const { refetch: runSearch, isFetching: isFetchingSearch } = useCabysSearch(
    { iso_code: ISO, search: searchTerm, size: 20, type: typeId },
    { enabled: false },
  );

  // Viewport coordinates, kept in step while the list is open.
  //
  // The menu is `fixed`, not `absolute`, because the thing it hangs off is
  // inside a drawer that scrolls independently of the document: document
  // coordinates taken once at open time drift away from the input the moment
  // the drawer body is scrolled. `capture: true` on the scroll listener is what
  // catches that inner scroll — a bubbling listener on window never sees it.
  useEffect(() => {
    if (!showResults) return;
    const update = () => {
      const rect = inputRef.current?.getBoundingClientRect();
      if (!rect) return;
      setDropdownPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
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

  const selectCabys = (item: CabysItem) => {
    onCabysSelect(item);
    setShowResults(false);
    setSearchTerm(item.description ?? item.code);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim() || !typeId) return;
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

  const clearCabys = () => {
    onCabysClear();
    setSearchTerm("");
    setSearchResults([]);
  };

  const handleProductTypeClick = (id: number) => {
    if (cabys && typeId !== id) {
      setPendingProductTypeId(id);
    } else {
      onProductTypeChange(id, false);
    }
  };

  const closeConfirm = () => setPendingProductTypeId(undefined);

  const confirmProductTypeChange = () => {
    if (pendingProductTypeId !== undefined) {
      setSearchTerm("");
      setSearchResults([]);
      onProductTypeChange(pendingProductTypeId, true);
    }
    closeConfirm();
  };

  const applyManualCabys = (code: string) => {
    onCabysManual(code);
    setManualEntry(false);
    setSearchTerm("");
  };

  const loading = isFetchingSearch || isSearching;

  return (
    <>
      <SectionWrapper
        title={t(labels.title)}
        icon={Landmark}
        isExpanded={isExpanded}
        onToggle={onToggle}
        disabled={disabled}
      >
        <div className="flex flex-col gap-3">
          {productTypes.length > 0 && (
            <div>
              <FormLabel>{t("products.productType")}</FormLabel>
              <div className="flex flex-wrap gap-2 mt-1">
                {productTypes.map((pt: { id: number; description: string }) => {
                  const selected = typeId === pt.id;
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

          {cabys ? (
            <div className="docs-fade-in">
              <FormLabel>{t("lineDetail.cabysCode")}</FormLabel>
              <div className="flex items-center gap-2.5 px-3 py-2.5 bg-primary/[0.06] border-[1.5px] border-primary/35 rounded-lg">
                <div className="flex-1">
                  <div className="font-mono text-[13px] font-bold text-primary tracking-[0.05em]">
                    {cabys}
                  </div>
                  {cabysDescription && (
                    <div className="text-xs mt-0.5 text-foreground">{cabysDescription}</div>
                  )}
                </div>
                <button type="button" onClick={clearCabys} className="btn btn-ghost btn-icon btn-sm">
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : !online || manualEntry ? (
            <div className="docs-fade-in">
              <CabysManualEntry
                onSubmit={applyManualCabys}
                offline={!online}
                disabled={disabled || !typeId}
              />
              {online && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs mt-1.5"
                  onClick={() => setManualEntry(false)}
                >
                  {t("cabys.backToSearch")}
                </button>
              )}
            </div>
          ) : (
            <div className="relative docs-fade-in">
              <FormLabel required={mode === "product"}>{t(labels.search)}</FormLabel>
              <div className="flex gap-1.5">
                <div className="flex-1 relative">
                  <Search
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <input
                    ref={inputRef}
                    className="pp-input pl-[30px]"
                    placeholder={!typeId ? t(labels.selectTypeFirst) : t(labels.placeholder)}
                    value={searchTerm}
                    disabled={!typeId}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    onFocus={() => searchResults.length > 0 && setShowResults(true)}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm flex-shrink-0 !px-3"
                  disabled={!searchTerm.trim() || !typeId || loading}
                  onClick={handleSearch}
                >
                  {loading ? <Spinner size={14} /> : <Search size={14} />}
                </button>
              </div>

              {showResults && !loading && (
                <OverlayPortal>
                  <div
                    ref={dropdownRef}
                    className="fixed docs-fade-in z-drawer-modal bg-card border border-border rounded-lg shadow-dropdown overflow-hidden max-h-[260px] overflow-y-auto"
                    style={{
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
                              {t("products.suggestedIva", { pct: String(item.tax_rate.percentage ?? 0) })}
                            </span>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-xs text-muted-foreground text-center">
                        {t("products.noResultsFor", { query: searchTerm })}
                      </div>
                    )}
                  </div>
                </OverlayPortal>
              )}
            </div>
          )}

          <p className="t-xs text-muted-foreground">{t("products.cabysHelp")}</p>
          {!cabys && online && !manualEntry && (
            <button
              type="button"
              className="btn btn-ghost btn-xs self-start"
              onClick={() => setManualEntry(true)}
            >
              {t("cabys.enterCodeInstead")}
            </button>
          )}
        </div>
      </SectionWrapper>

      <Modal
        open={pendingProductTypeId !== undefined}
        onClose={closeConfirm}
        title={t("products.changeProductType")}
        description={t("products.changeProductTypeWarning")}
        variant="warning"
        cancel={{ label: t("common.cancel"), onClick: closeConfirm }}
        confirm={{ label: t("common.continue"), onClick: confirmProductTypeChange }}
      />
    </>
  );
}
