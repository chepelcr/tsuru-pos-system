import { useState, useCallback } from "react";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { ProductImage } from "@/components/ui/ProductImage";
import { FadeIn } from "@/components/ui/FadeIn";
import { ProductGridSkeleton } from "./ProductGridSkeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDocumentCurrencyOptional } from "@/contexts/DocumentCurrencyContext";
import type { Product } from "@/types";

interface CartItem { id: string; qty: number; }

interface ProductsPanelProps {
  orgId: string;
  cartItems: CartItem[];
  isDesktop: boolean;
  onAdd: (product: Product) => void;
}

export function ProductsPanel({ orgId, cartItems, isDesktop, onAdd }: ProductsPanelProps) {
  const { t } = useLanguage();
  const { fmt } = useDocumentCurrencyOptional();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);

  const { data: productsResp, isLoading } = useProducts({
    search,
    category_id: categoryId,
    page,
    page_size: isDesktop ? 24 : 12,
  });

  const { data: categoriesResp } = useCategories(orgId);

  const products = productsResp?.data ?? [];
  const pagination = productsResp?.pagination;
  const categories = categoriesResp?.data ?? [];

  const handleCategoryChange = useCallback((id: string) => {
    setCategoryId(id);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
  }, []);

  const gridColumnsStyle = {
    gridTemplateColumns: isDesktop ? "repeat(auto-fill, minmax(160px, 1fr))" : "repeat(2, 1fr)",
  };

  const renderCategoryButton = (id: string, label: string) => {
    const active = (id === "" && !categoryId) || categoryId === id;
    return (
      <button
        key={id || "all"}
        onClick={() => handleCategoryChange(id)}
        className={`flex-shrink-0 px-3.5 py-1.5 rounded-[20px] text-[13px] font-semibold cursor-pointer whitespace-nowrap ${
          active
            ? "border-[1.5px] border-accent-rose bg-accent-rose-soft text-accent-rose"
            : "border border-border bg-transparent text-muted-foreground"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search + categories */}
      <div className="px-5 pt-4 pb-3 flex-shrink-0 border-b border-border">
        <div className="relative mb-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center pointer-events-none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('productsPanel.searchPlaceholder')}
            className="w-full pl-[38px] pr-3.5 py-2.5 bg-foreground/[0.06] border border-border rounded-lg text-foreground text-sm outline-none box-border"
          />
        </div>
        {categories.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {renderCategoryButton("", t('productsPanel.allCategory'))}
            {categories.map((c) => renderCategoryButton(c.category_id, c.name))}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {isLoading ? (
          <div className="grid gap-3" style={gridColumnsStyle}>
            {Array.from({ length: isDesktop ? 12 : 6 }).map((_, i) => (
              <ProductGridSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center pt-12 text-muted-foreground">{t('productsPanel.noProducts')}</div>
        ) : (
          <div className="grid gap-3" style={gridColumnsStyle}>
            {products.map((p, i) => {
              const lowStock = (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) <= 5;
              const inCart = cartItems.find((c) => c.id === p.product_id);
              return (
                <FadeIn key={p.product_id} delay={i * 0.02} duration={0.3}>
                  <button
                    onClick={() => onAdd(p)}
                    className={`p-0 text-left flex flex-col cursor-pointer rounded-xl overflow-hidden transition-transform w-full hover:-translate-y-0.5 ${
                      inCart
                        ? "bg-accent-rose-dim border-[1.5px] border-accent-rose"
                        : "bg-card border border-border"
                    }`}
                  >
                    <ProductImage
                      imageUrl={p.image_url}
                      name={p.name ?? ""}
                      size={0}
                      className="w-full h-auto !rounded-none object-cover"
                      style={{ width: "100%", height: "auto", aspectRatio: "4/3" }}
                    />
                    <div className="px-3 pt-2.5 pb-3">
                      <div className="flex justify-between items-start gap-1">
                        <div className="font-semibold text-[13px] text-foreground leading-tight">
                          {p.name}
                        </div>
                        {lowStock && (
                          <span className="bg-warning/20 text-warning text-[9px] font-bold px-1.5 py-0.5 rounded-[20px] flex-shrink-0">
                            {p.stock_quantity}
                          </span>
                        )}
                      </div>
                      <div className="font-display text-xl font-semibold text-accent-rose mt-1">
                        {fmt(p.sale_price ?? p.price ?? 0)}
                      </div>
                      {inCart && (
                        <div className="text-[10px] text-accent-rose mt-0.5">
                          {t('productsPanel.inCart', { n: inCart.qty })}
                        </div>
                      )}
                    </div>
                  </button>
                </FadeIn>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2 px-5 py-3 border-t border-border flex-shrink-0">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className={`px-3.5 py-1.5 rounded-lg border border-border bg-transparent text-[13px] ${
              page <= 1 ? "text-muted-foreground opacity-40 cursor-default" : "text-foreground cursor-pointer"
            }`}
          >
            ←
          </button>
          <span className="text-xs text-muted-foreground">
            {page} / {pagination.total_pages}
          </span>
          <button
            disabled={page >= pagination.total_pages}
            onClick={() => setPage((p) => p + 1)}
            className={`px-3.5 py-1.5 rounded-lg border border-border bg-transparent text-[13px] ${
              page >= pagination.total_pages ? "text-muted-foreground opacity-40 cursor-default" : "text-foreground cursor-pointer"
            }`}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
