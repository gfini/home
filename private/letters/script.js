document.getElementById("submit-btn").addEventListener("click", () => {
    const loginBox = document.getElementById("login-box");
    const contentBox = document.getElementById("content-box");

    loginBox.classList.add("hidden");
    contentBox.classList.remove("hidden");
});
