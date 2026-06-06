const CACHE_NAME = "jmarkets-pos-v1";
const API_SYNC_TAG = "sync-sales";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Background sync for offline sales
self.addEventListener("sync", (event) => {
  if (event.tag === API_SYNC_TAG) {
    event.waitUntil(syncPendingSales());
  }
});

async function syncPendingSales() {
  // Open IndexedDB and sync unsynced sales
  const db = await openDB();
  const tx = db.transaction("sales", "readwrite");
  const store = tx.objectStore("sales");
  const sales = await getAllFromStore(store);

  for (const sale of sales) {
    if (sale.synced) continue;
    try {
      const res = await fetch(sale.syncUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sale.token}`,
        },
        body: JSON.stringify(sale.payload),
      });
      if (res.ok) {
        const updateTx = db.transaction("sales", "readwrite");
        const updateStore = updateTx.objectStore("sales");
        sale.synced = true;
        updateStore.put(sale);
      }
    } catch {
      // Will retry on next sync event
    }
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("jmarkets-pos-db", 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
