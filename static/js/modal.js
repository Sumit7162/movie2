document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("movie-modal");
    const poster = document.getElementById("movie-poster");
    const closeBtn = document.querySelector(".close");

    // Open the modal when the poster is clicked
    poster.addEventListener("click", () => {
        modal.style.display = "block";
    });

    // Close the modal when the close button is clicked
    closeBtn.addEventListener("click", () => {
        modal.style.display = "none";
    });

    // Close the modal when clicking outside the modal content
    window.addEventListener("click", (event) => {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });
});