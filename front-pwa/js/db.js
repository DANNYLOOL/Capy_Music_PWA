import { openDB } from './idb.js';

export const openDatabase = () => {
    return openDB("capy-music-db", 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains("songs")) {
                db.createObjectStore("songs", { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains("unsynced-operations")) {
                db.createObjectStore("unsynced-operations", { keyPath: "id" });
            }
        },
    });
};

export const saveUnsyncedOperation = async (operation) => {
    try {
        const db = await openDatabase();
        if (!operation.id) {
            operation.id = Date.now(); // Asigna un ID si no está definido
        }
        const tx = db.transaction("unsynced-operations", "readwrite");
        await tx.store.put(operation);
        await tx.done;
        console.log("Operación sin sincronizar guardada:", operation);
    } catch (error) {
        console.error("Error al guardar operación sin sincronizar:", error);
    }
};

export const saveSongs = async (song) => {
    try {
        const db = await openDatabase();
        const tx = db.transaction("songs", "readwrite");
        await tx.store.put(song); // Guarda directamente la canción
        await tx.done;
        console.log("Canción guardada:", song);
    } catch (error) {
        console.error("Error al guardar la canción:", error);
    }
};

export const getUnsyncedOperations = async () => {
    try {
        const db = await openDatabase();
        const tx = db.transaction("unsynced-operations", "readonly");
        const operations = await tx.store.getAll();
        return operations;
    } catch (error) {
        console.error("Error al obtener operaciones sin sincronizar:", error);
        return [];
    }
};

export const deleteUnsyncedOperation = async (id) => {
    const db = await openDatabase();
    const tx = db.transaction("unsynced-operations", "readwrite");
    await tx.store.delete(id);
    await tx.done;
};