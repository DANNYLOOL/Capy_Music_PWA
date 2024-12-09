import { openDatabase, saveUnsyncedOperation, saveSongs  } from "./db.js"; // Asegúrate de tener el archivo db.js para manejar IndexedDB

const backendURL = "http://localhost:3000";

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

export const getNextSongId = async () => {
    try {
        const db = await openDatabase();
        const tx = db.transaction("songs", "readonly");
        const songs = await tx.store.getAll();
        const lastId = songs.length > 0 ? Math.max(...songs.map(song => song.id)) : 0;
        return lastId + 1; // Devuelve el siguiente ID
    } catch (error) {
        console.error("Error al obtener el siguiente ID:", error);
        return 1; // Si hay error, devuelve 1 como ID inicial
    }
};

// Escucha eventos cuando el DOM está cargado
document.addEventListener("DOMContentLoaded", () => {
    const logoutLink = document.querySelector(".dropdown a");
    const coverInput = document.getElementById("cover");
    const imagePreview = document.getElementById("image-preview");
    const addSongForm = document.getElementById("add-song-form");
    const backBtn = document.getElementById("back-btn");

    // Logout
    if (logoutLink) {
        logoutLink.addEventListener("click", (event) => {
            event.preventDefault();

            // Eliminar el token
            sessionStorage.removeItem("authToken");

            // Redirigir al login
            window.location.href = "http://localhost:3001/";
        });
    }

    // Previsualizar la imagen seleccionada
    coverInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();

            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreview.style.display = "block";
            };

            reader.readAsDataURL(file);
        } else {
            imagePreview.style.display = "none";
        }
    });

    addSongForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(addSongForm);
        const nextId = await getNextSongId();
        const song = {
            id: nextId, // Generar un ID único localmente
            name: formData.get("songName"),
            artist: formData.get("artist"),
            album: formData.get("album"),
            cover: formData.get("cover"), // Manejar la portada
        };

        if (navigator.onLine) {
            // Si hay conexión, intenta enviar al backend
            try {
                const response = await fetch(`${backendURL}/add-song`, {
                    method: "POST",
                    body: formData,
                });
                const result = await response.json();
                if (result.success) {
                    alert("Canción agregada con éxito.");
                    window.location.href = "inicio.html";
                } else {
                    alert("Error al agregar la canción.");
                }
            } catch (error) {
                console.error("Error al enviar al backend:", error);
            }
        } else {
            // Si no hay conexión, almacena en IndexedDB y registra sincronización
            await saveUnsyncedOperation({
                id: song.id,
                type: "add",
                data: song,
            });
            await saveSongs(song);

            await registerSync();
            alert("Estás offline. La canción se guardará localmente y se sincronizará más tarde.");
            window.location.href = "inicio.html";
        }
    });

    // Botón de regresar
    if (backBtn) {
        backBtn.addEventListener("click", () => {
            window.location.href = "inicio.html"; // Redirige a inicio.html
        });
    }
});
