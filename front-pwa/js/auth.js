// Verificar si existe un token de inicio de sesión
function checkAuthToken() {
    const authToken = sessionStorage.getItem("authToken");
    if (!authToken) {
        // Redirigir al login si no hay token
        window.location.href = "http://localhost:3001/";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    checkAuthToken();

    const authToken = sessionStorage.getItem("authToken");

    if (!authToken) {
        window.location.href = "http://localhost:3001/";
    }

    // Manejar el evento de navegación hacia atrás
    window.addEventListener("pageshow", () => {
        checkAuthToken();
    });
});
