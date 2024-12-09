import { openDatabase, saveUnsyncedOperation } from "./db.js";

const backendURL = "http://localhost:3000";

// Función para redirigir al login
function logout() {
    window.location.href = "index.html";
}

// Función para registrar sincronización en el Service Worker
const registerSync = async () => {
    if ("serviceWorker" in navigator && "SyncManager" in window) {
        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register("sync-operations");
            console.log("Sincronización registrada.");
        } catch (error) {
            console.error("Error al registrar la sincronización:", error);
        }
    }
};

// Escucha el evento de clic en el enlace de cerrar sesión
document.addEventListener("DOMContentLoaded", () => {
    const logoutLink = document.querySelector(".dropdown a");
    const confirmBtn = document.getElementById("confirm-btn");
    const cancelBtn = document.getElementById("cancel-btn");
    const params = new URLSearchParams(window.location.search);
    const songId = params.get("id");

    if (logoutLink) {
        logoutLink.addEventListener("click", (event) => {
            event.preventDefault();

            // Eliminar el token
            sessionStorage.removeItem("authToken");

            // Redirigir al login
            window.location.href = "http://localhost:3001/";
        });
    }

    // Botón Cancelar: Regresar a inicio
    cancelBtn.addEventListener("click", () => {
        window.location.href = "inicio.html";
    });

    // Botón "Eliminar": Enviar solicitud DELETE al servidor
    confirmBtn.addEventListener("click", async () => {
        try {
            if (navigator.onLine) {
                // Online: Eliminar del backend directamente
                const response = await fetch(`${backendURL}/song/${songId}`, {
                    method: "DELETE",
                });
    
                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        window.location.href = "inicio.html";
                    } else {
                        throw new Error(result.message);
                    }
                } else {
                    throw new Error("Error al eliminar en el backend.");
                }
            } else {
                // Offline: Eliminar en IndexedDB y registrar operación sin conexión
                const db = await openDatabase();
                const tx = db.transaction("songs", "readwrite");
                const store = tx.objectStore("songs");
    
                const songExists = await store.get(Number(songId)); // Buscar canción
                if (songExists) {
                    await store.delete(Number(songId)); // Eliminar canción
                } else {
                    console.error(`No se encontró la canción con ID ${songId} en IndexedDB.`);
                    throw new Error("Canción no encontrada en IndexedDB.");
                }
    
                await saveUnsyncedOperation({
                    type: "delete",
                    id: Number(songId), // Usar el ID de la canción eliminada
                    data: { songId: Number(songId) }, // Registrar operación
                });
                await registerSync();
                await tx.done;
    
                alert("Sin conexión. La canción se eliminará del servidor cuando se recupere la conexión.");
                window.location.href = "inicio.html";
            }
        } catch (error) {
            console.error("Error al eliminar la canción:", error);
            alert("Ocurrió un problema al eliminar la canción. Intenta nuevamente más tarde.");
        }
    });    
});
