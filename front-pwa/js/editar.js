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

// Escucha eventos cuando el DOM está cargado
document.addEventListener("DOMContentLoaded", async () => {
    const logoutLink = document.querySelector(".dropdown a");
    const backBtn = document.getElementById("back-btn");
    const form = document.getElementById("edit-song-form"); // ID del formulario de edición
    const params = new URLSearchParams(window.location.search);
    const songId = params.get("id");

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

    // Obtener los datos de la canción
    if (songId) {
        try {
            const response = await fetch(`${backendURL}/song/${songId}`);
            if (!response.ok) throw new Error("Error al obtener los datos de la canción.");

            const result = await response.json();

            if (result.success) {
                const song = result.song;

                // Rellenar el formulario con los datos de la canción
                document.getElementById("song-name").value = song.name;
                document.getElementById("artist").value = song.artist;
                document.getElementById("album").value = song.album;

                // Mostrar la portada si está disponible
                if (song.cover) {
                    const imagePreview = document.getElementById("image-preview");
                    imagePreview.src = `${backendURL}${song.cover}`;
                    imagePreview.style.display = "block";
                }
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error al obtener los datos de la canción:', error);
            alert('Ocurrió un error al cargar los datos de la canción.');
        }
    } else {
        alert('ID de canción no proporcionado.');
    }

    // Previsualizar nueva imagen seleccionada
    const coverInput = document.getElementById("cover");
    const imagePreview = document.getElementById("image-preview");
    coverInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();

            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreview.style.display = "block";
            };

            reader.readAsDataURL(file);
        }
    });

    // Botón para regresar a la página de inicio
    if (backBtn) {
        backBtn.addEventListener("click", () => {
            window.location.href = "inicio.html";
        });
    }

    // Escuchar el envío del formulario para actualizar la canción
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
    
        const songName = document.getElementById("song-name").value;
        const artist = document.getElementById("artist").value;
        const album = document.getElementById("album").value;
        const file = coverInput.files[0];
    
        // Crear un objeto para guardar los datos
        const updatedSong = { id: Number(songId), name: songName, artist, album};

        if (file) {
            updatedSong.cover = file; // Guardar la imagen como archivo
        }
    
        try {
            if (navigator.onLine) {
                // Enviar actualización al backend directamente
                const formData = new FormData(form);
                const response = await fetch(`${backendURL}/update-song/${songId}`, {
                    method: "POST",
                    body: formData,
                });
    
                if (!response.ok) throw new Error(`Error en la solicitud: ${response.statusText}`);
    
                const result = await response.json();
                if (result.success) {
                    window.location.href = "inicio.html"; // Redirigir a la página de inicio
                } else {
                    throw new Error(result.message);
                }
            } else {
                // Actualizar la canción en IndexedDB y registrar operación
                const db = await openDatabase();
                const tx = db.transaction("songs", "readwrite");
                const store = tx.objectStore("songs");
    
                await store.put(updatedSong); // Actualizar localmente
                await saveUnsyncedOperation({
                    id: Number(songId),
                    type: "edit",
                    data: updatedSong, // Guardar los datos para sincronización
                });

                await registerSync();
    
                alert("Sin conexión. La canción será actualizada en el servidor cuando se recupere la conexión.");
                window.location.href = "inicio.html";
            }
        } catch (error) {
            console.error("Error al actualizar canción:", error);
            alert("Ocurrió un error al actualizar la canción. Intenta nuevamente más tarde.");
        }
    });    
});
