// Verificar si existe un token de inicio de sesión
function checkAuthToken() {
    const authToken = sessionStorage.getItem("authToken");
    if (authToken) {
        sessionStorage.removeItem("authToken");
    }
}

// Esperar a que el DOM esté cargado
document.addEventListener("DOMContentLoaded", () => {
    // Manejar el evento de navegación hacia atrás
    window.addEventListener("pageshow", () => {
        checkAuthToken();
    });
    checkAuthToken();

    const loginForm = document.querySelector("form");
    const backendURL = "http://localhost:3000";

    // Manejar el envío del formulario
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        // Obtener los valores del formulario
        const username = document.querySelector("#username").value;
        const password = document.querySelector("#password").value;

        // Realizar la solicitud GET al servidor
        try {
            const response = await fetch(`${backendURL}/verify-user?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`);
            const result = await response.json();

            if (result.success) {
                const token = `token-${Date.now()}`;
                sessionStorage.setItem("authToken", token);
                document.querySelector("form").reset();

                window.location.href = `${window.location.origin}/inicio.html`;
            } else {
                alert("Usuario o contraseña incorrectos.");
            }
        } catch (error) {
            console.error("Error al verificar usuario:", error);
            alert("Hubo un error al intentar iniciar sesión.");
        }
    });
    

});
