import { openDatabase, saveUnsyncedOperation, getUnsyncedOperations, deleteUnsyncedOperation } from "./db.js";

// Escucha el evento de clic en el enlace de cerrar sesión
document.addEventListener("DOMContentLoaded", async () => {
    const logoutLink = document.querySelector(".dropdown a");
    const addSongButton = document.getElementById("add-song-btn");

    if (logoutLink) {
        logoutLink.addEventListener("click", (event) => {
            event.preventDefault();

            // Eliminar el token
            sessionStorage.removeItem("authToken");

            // Redirigir al login
            window.location.href = "http://localhost:3001/";
        });
    }

    if (addSongButton) {
        addSongButton.addEventListener("click", () => {
            // Redirigir a agregar.html
            window.location.href = "agregar.html";
        });
    }

    const fetchAndStoreAllSongs = async () => {
        const backendURL = "http://localhost:3000";
        let allSongs = [];
        let currentPage = 1;
        const limit = 10;
        let totalPages = 1;

        try {
            while (currentPage <= totalPages) {
                const response = await fetch(`${backendURL}/songs?page=${currentPage}&limit=${limit}`);
                const data = await response.json();

                if (data.success) {
                    allSongs = [...allSongs, ...data.songs];
                    totalPages = data.totalPages;
                    currentPage++;
                } else {
                    throw new Error("Error al obtener canciones del backend");
                }
            }

            // Guarda todas las canciones en IndexedDB
            const db = await openDatabase();
            const tx = db.transaction("songs", "readwrite");
            const store = tx.objectStore("songs");

            await store.clear(); // Limpia las canciones antiguas
            for (const song of allSongs) {
                await store.put(song);
            }
            await tx.done;

            console.log("Todas las canciones guardadas en IndexedDB:", allSongs);
        } catch (error) {
            console.error("Error al cargar todas las canciones:", error);
        }
    };

    const renderSongs = (songs) => {
        const songList = document.querySelector(".song-list");
        songList.innerHTML = ''; // Limpia la lista antes de renderizar
        songs.forEach((song) => {
            const songCard = document.createElement("div");
            songCard.className = "song-card";
            songCard.innerHTML = `
                <img src="${song.cover ? `http://localhost:3000${song.cover}` : '/img/hola.png'}" alt="Portada del álbum">
                <div class="song-info">
                    <h4>${song.name}</h4>
                    <p>${song.artist}</p>
                    <p>${song.album}</p>
                </div>
                <div class="song-actions">
                    <button class="edit-btn" data-id="${song.id}">Editar</button>
                    <button class="delete-btn" data-id="${song.id}">Eliminar</button>
                </div>
            `;
            // Agregar evento al botón de editar
            songCard.querySelector('.edit-btn').addEventListener('click', () => {
                window.location.href = `editar.html?id=${song.id}`;
            });

            // Agregar evento al botón de eliminar
            songCard.querySelector('.delete-btn').addEventListener('click', () => {
                window.location.href = `eliminar.html?id=${song.id}`;
            });

            songList.appendChild(songCard);
        });
    };

    const renderPagination = (totalPages, currentPage, fetchFunction) => {
        const paginationContainer = document.querySelector(".pagination");
        paginationContainer.innerHTML = ''; // Limpiar la paginación existente

        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement("button");
            pageButton.textContent = i;
            pageButton.className = "page-btn";

            if (i === currentPage) {
                pageButton.classList.add("active");
            }

            pageButton.addEventListener("click", () => {
                fetchFunction(i); // Llama a la función de obtención con la página actualizada
            });

            paginationContainer.appendChild(pageButton);
        }
    };

    const fetchSongs = async (page = 1, limit = 10) => {
        if (navigator.onLine) {
            // Si hay conexión, descarga y almacena todas las canciones
            await fetchAndStoreAllSongs();

            // Renderiza la página actual desde el backend
            const response = await fetch(`http://localhost:3000/songs?page=${page}&limit=${limit}`);
            const data = await response.json();

            if (data.success) {
                renderSongs(data.songs);
                renderPagination(data.totalPages, data.currentPage, fetchSongs);
            }
        } else {
            // Si no hay conexión, carga las canciones desde IndexedDB
            console.log("Cargando canciones desde IndexedDB...");
            const db = await openDatabase();
            const tx = db.transaction("songs", "readonly");
            const store = tx.objectStore("songs");
            const allSongs = await store.getAll();

            if (allSongs.length > 0) {
                const start = (page - 1) * limit;
                const end = page * limit;
                const paginatedSongs = allSongs.slice(start, end);

                renderSongs(paginatedSongs);
                const totalPages = Math.ceil(allSongs.length / limit);
                renderPagination(totalPages, page, fetchSongs);
            } else {
                const songList = document.querySelector(".song-list");
                songList.innerHTML = `<p>No hay canciones disponibles offline.</p>`;
            }
        }
    };

    fetchSongs();
});
