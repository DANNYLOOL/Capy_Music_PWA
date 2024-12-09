// IndexedDB Helper Functions (adaptación de idb.js)
const openDatabase = async () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("capy-music-db", 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("unsynced-operations")) {
                db.createObjectStore("unsynced-operations", { keyPath: "id" });
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
};

const getUnsyncedOperations = async () => {
    const db = await openDatabase();
    const transaction = db.transaction("unsynced-operations", "readonly");
    const store = transaction.objectStore("unsynced-operations");
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const deleteUnsyncedOperation = async (id) => {
    const db = await openDatabase();
    const transaction = db.transaction("unsynced-operations", "readwrite");
    const store = transaction.objectStore("unsynced-operations");
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// Manejo de caché y sincronización
const CACHE_NAME = "capy-music-cache-v2";
const urlsToCache = [
    "/",
    "/index.html",
    "/inicio.html",
    "/js/inicio.js",
    "/agregar.html",
    "/js/agregar.js",
    "/manifest.json",
    "/img/icon-192x192.png",
    "/img/icon-512x512.png",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("Archivos iniciales en caché correctamente.");
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log("Cache antigua eliminada:", cache);
                        return caches.delete(cache);
                    }
                })
            )
        )
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            return (
                cachedResponse ||
                fetch(event.request).catch(() => {
                    if (event.request.headers.get("accept").includes("text/html")) {
                        return caches.match("/");
                    }
                })
            );
        })
    );
});

self.addEventListener("sync", (event) => {
    if (event.tag === "sync-operations") {
        event.waitUntil(syncOperations());
    }
});

const syncOperations = async () => {
    try {
        const db = await openDatabase();
        const unsyncedOperations = await getUnsyncedOperations();

        console.log("Operaciones sin sincronizar recuperadas:", unsyncedOperations);

        for (const operation of unsyncedOperations) {
            try {
                if (operation.type === "add") {
                    const formData = new FormData();
                    formData.append("songName", operation.data.name);
                    formData.append("artist", operation.data.artist);
                    formData.append("album", operation.data.album);

                    if (operation.data.cover) {
                        formData.append("cover", operation.data.cover);
                    }

                    const response = await fetch("http://localhost:3000/add-song", {
                        method: "POST",
                        body: formData,
                    });

                    if (response.ok) {
                        await deleteUnsyncedOperation(operation.id);
                        console.log(`Operación sincronizada exitosamente: ${operation.type}`);
                    } else {
                        console.error("Error al sincronizar operación con el backend:", await response.text());
                    }
                }

                if (operation.type === "delete") {
                    const response = await fetch(`http://localhost:3000/song/${operation.data.songId}`, {
                        method: "DELETE",
                    });

                    if (response.ok) {
                        await deleteUnsyncedOperation(operation.id); // Eliminar operación sincronizada
                        console.log(`Operación de eliminación sincronizada: ${operation.data.songId}`);
                    } else {
                        console.error("Error al sincronizar eliminación:", await response.text());
                    }
                }

                if (operation.type === "edit") {
                    try {
                        const formData = new FormData();
                        formData.append("songName", operation.data.name);
                        formData.append("artist", operation.data.artist);
                        formData.append("album", operation.data.album);

                        if (operation.data.cover) {
                            formData.append("cover", operation.data.cover);
                        }

                        const response = await fetch(`http://localhost:3000/update-song/${operation.data.id}`, {
                            method: "POST",
                            body: formData, // Enviar como FormData
                        });

                        if (response.ok) {
                            await deleteUnsyncedOperation(operation.id); // Eliminar operación sincronizada
                            console.log(`Operación de edición sincronizada: ${operation.data.id}`);
                        } else {
                            console.error("Error al sincronizar edición:", await response.text());
                        }
                    } catch (error) {
                        console.error(`Error al sincronizar operación: ${operation.type}`, error);
                    }
                }
            } catch (error) {
                console.error(`Error al sincronizar operación: ${operation.type}`, error);
            }
        }
    } catch (error) {
        console.error("Error durante la sincronización:", error);
    }
};