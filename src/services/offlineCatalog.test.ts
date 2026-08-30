import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import type { Product } from "@/types";
import type { Client } from "@/hooks/useClients";
import {
  cacheClients,
  cacheProducts,
  plainSearchTerm,
  plainStatusFilter,
  readCachedClients,
  readCachedProducts,
} from "./offlineCatalog";

function product(id: string, name: string, overrides: Partial<Product> = {}): Product {
  return {
    product_id: id,
    name,
    price: 1000,
    image_url: null,
    status: 1,
    ...overrides,
  } as Product;
}

function client(id: string, name: string, overrides: Partial<Client> = {}): Client {
  return {
    client_id: id,
    company_id: "org-1",
    business_name: name,
    status: 1,
    ...overrides,
  } as Client;
}

describe("offline catalog mirror", () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it("reads back cached products with the online envelope shape", async () => {
    await cacheProducts("org-1", [product("p1", "Café molido"), product("p2", "Azúcar")]);

    const page = await readCachedProducts("org-1", { pageSize: 10 });

    expect(page.data.map((p) => p.product_id)).toEqual(["p2", "p1"]); // alphabetical
    expect(page.pagination).toMatchObject({ page: 1, total_elements: 2, total_pages: 1 });
  });

  it("scopes rows to their organization", async () => {
    await cacheProducts("org-1", [product("p1", "Café")]);
    await cacheProducts("org-2", [product("p2", "Té")]);

    const page = await readCachedProducts("org-2");

    expect(page.data.map((p) => p.product_id)).toEqual(["p2"]);
  });

  it("matches search regardless of accents and case", async () => {
    await cacheProducts("org-1", [product("p1", "Café molido"), product("p2", "Azúcar")]);

    const page = await readCachedProducts("org-1", { search: "CAFE" });

    expect(page.data.map((p) => p.product_id)).toEqual(["p1"]);
  });

  it("filters by category and hides inactive products", async () => {
    await cacheProducts("org-1", [
      product("p1", "Café", { category_id: "c1" }),
      product("p2", "Té", { category_id: "c2" }),
      product("p3", "Descontinuado", { category_id: "c1", status: 2 }),
    ]);

    const page = await readCachedProducts("org-1", { categoryId: "c1" });

    expect(page.data.map((p) => p.product_id)).toEqual(["p1"]);
  });

  it("paginates", async () => {
    await cacheProducts(
      "org-1",
      Array.from({ length: 5 }, (_, i) => product(`p${i}`, `Producto ${i}`)),
    );

    const page = await readCachedProducts("org-1", { page: 2, pageSize: 2 });

    expect(page.data).toHaveLength(2);
    expect(page.pagination).toMatchObject({ page: 2, total_pages: 3, total_elements: 5 });
  });

  it("upserts instead of duplicating on re-sync", async () => {
    await cacheProducts("org-1", [product("p1", "Café")]);
    await cacheProducts("org-1", [product("p1", "Café tostado")]);

    const page = await readCachedProducts("org-1");

    expect(page.data).toHaveLength(1);
    expect(page.data[0].name).toBe("Café tostado");
  });
});

describe("compound client filters offline", () => {
  it("recovers the free-text term from a BE filter string", () => {
    expect(
      plainSearchTerm("status:1,(client_name:ana,business_name:ana,id_number:ana),orderBy>name"),
    ).toBe("ana");
    expect(plainSearchTerm("status:1")).toBeUndefined();
    expect(plainSearchTerm(undefined)).toBeUndefined();
  });

  it("strips wildcards from a single-field clause", () => {
    expect(plainSearchTerm("status:1,client_name:*ana*")).toBe("ana");
  });

  it("recovers the status clause", () => {
    expect(plainStatusFilter("status:2,(client_name:ana)")).toBe(2);
    expect(plainStatusFilter("(client_name:ana)")).toBeUndefined();
  });

  it("applies both when reading cached clients", async () => {
    await db.delete();
    await db.open();
    await cacheClients("org-1", [
      client("c1", "Ana Solís"),
      client("c2", "Beto Mora"),
      client("c3", "Ana Vieja", { status: 2 }),
    ]);

    const page = await readCachedClients("org-1", { search: "status:1,(client_name:ana)" });

    expect(page.data.map((c) => c.client_id)).toEqual(["c1"]);
  });
});
