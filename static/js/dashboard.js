document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const movieGrid = document.getElementById('movie-grid');
    const sortSelect = document.getElementById('sort-select');
    const genreCheckboxes = document.querySelectorAll('input[name="genre"]');
    const yearMinSlider = document.getElementById('year-min');
    const yearMaxSlider = document.getElementById('year-max');
    const yearMinValue = document.getElementById('year-min-value');
    const yearMaxValue = document.getElementById('year-max-value');
    const ratingMinSlider = document.getElementById('rating-min');
    const ratingMaxSlider = document.getElementById('rating-max');
    const ratingMinValue = document.getElementById('rating-min-value');
    const ratingMaxValue = document.getElementById('rating-max-value');
    const applyFiltersBtn = document.getElementById('apply-filters');
    const resetFiltersBtn = document.getElementById('reset-filters');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const currentPageEl = document.getElementById('current-page');
    const totalPagesEl = document.getElementById('total-pages');
    const csvUploadForm = document.getElementById('csv-upload-form');
    const uploadMessage = document.getElementById('upload-message');
    const dashboardSearchInput = document.getElementById('dashboard-search-input');
    const dashboardSearchButton = document.getElementById('dashboard-search-button');

    // Variables
    let allMovies = [];
    let filteredMovies = [];
    let currentPage = 1;
    const moviesPerPage = 12;

    // Check URL for filter params (for direct links)
    const urlParams = new URLSearchParams(window.location.search);
    const genreParam = urlParams.get('genre');

    // Initialize dashboard
    loadMovies();

    // Event listeners
    sortSelect.addEventListener('change', function() {
        sortMovies();
        renderCurrentPage();
    });

    yearMinSlider.addEventListener('input', function() {
        yearMinValue.textContent = this.value;
        // Ensure min doesn't exceed max
        if (parseInt(this.value) > parseInt(yearMaxSlider.value)) {
            yearMaxSlider.value = this.value;
            yearMaxValue.textContent = this.value;
        }
    });

    yearMaxSlider.addEventListener('input', function() {
        yearMaxValue.textContent = this.value;
        // Ensure max doesn't go below min
        if (parseInt(this.value) < parseInt(yearMinSlider.value)) {
            yearMinSlider.value = this.value;
            yearMinValue.textContent = this.value;
        }
    });

    ratingMinSlider.addEventListener('input', function() {
        ratingMinValue.textContent = this.value;
        // Ensure min doesn't exceed max
        if (parseFloat(this.value) > parseFloat(ratingMaxSlider.value)) {
            ratingMaxSlider.value = this.value;
            ratingMaxValue.textContent = this.value;
        }
    });

    ratingMaxSlider.addEventListener('input', function() {
        ratingMaxValue.textContent = this.value;
        // Ensure max doesn't go below min
        if (parseFloat(this.value) < parseFloat(ratingMinSlider.value)) {
            ratingMinSlider.value = this.value;
            ratingMinValue.textContent = this.value;
        }
    });

    applyFiltersBtn.addEventListener('click', function() {
        filterMovies();
        currentPage = 1;
        updatePagination();
        renderCurrentPage();
    });

    resetFiltersBtn.addEventListener('click', function() {
        resetFilters();
        filterMovies();
        currentPage = 1;
        updatePagination();
        renderCurrentPage();
    });

    prevPageBtn.addEventListener('click', function() {
        if (currentPage > 1) {
            currentPage--;
            updatePagination();
            renderCurrentPage();
            window.scrollTo(0, 0);
        }
    });

    nextPageBtn.addEventListener('click', function() {
        const totalPages = Math.ceil(filteredMovies.length / moviesPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            updatePagination();
            renderCurrentPage();
            window.scrollTo(0, 0);
        }
    });

    // Dashboard search
    dashboardSearchButton.addEventListener('click', function() {
        searchMovies();
    });

    dashboardSearchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchMovies();
        }
    });

    // CSV Upload Form
    csvUploadForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const fileInput = document.getElementById('csv-file');
        const file = fileInput.files[0];

        if (!file) {
            showUploadMessage('Please select a CSV file', 'error');
            return;
        }

        if (!file.name.endsWith('.csv')) {
            showUploadMessage('Only CSV files are allowed', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        // Show loading message
        showUploadMessage('Uploading file...', '');

        fetch('/import-csv', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showUploadMessage('CSV file imported successfully!', 'success');
                // Reload movies
                loadMovies();
            } else {
                showUploadMessage(data.error || 'Error importing CSV file', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showUploadMessage('Error uploading file', 'error');
        });
    });

    // Functions
    function loadMovies() {
        movieGrid.innerHTML = '<div class="loading">Loading movies...</div>';

        fetch('/api/movies')
            .then(response => response.json())
            .then(movies => {
                allMovies = movies;

                // If there's a genre in the URL params, filter by it
                if (genreParam) {
                    // Check the corresponding checkbox
                    genreCheckboxes.forEach(checkbox => {
                        if (checkbox.value === genreParam) {
                            checkbox.checked = true;
                        }
                    });
                }

                filterMovies();
                sortMovies();
                updatePagination();
                renderCurrentPage();
            })
            .catch(error => {
                console.error('Error loading movies:', error);
                movieGrid.innerHTML = '<div class="error">Error loading movies</div>';
            });
    }

    function filterMovies() {
        // Get selected genres
        const selectedGenres = Array.from(genreCheckboxes)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.value);

        // Get year range
        const yearMin = parseInt(yearMinSlider.value);
        const yearMax = parseInt(yearMaxSlider.value);

        // Get rating range
        const ratingMin = parseFloat(ratingMinSlider.value);
        const ratingMax = parseFloat(ratingMaxSlider.value);

        // Get search term
        const searchTerm = dashboardSearchInput.value.trim().toLowerCase();

        // Filter movies
        filteredMovies = allMovies.filter(movie => {
            // Filter by search term if present
            if (searchTerm && !movie.title.toLowerCase().includes(searchTerm)) {
                return false;
            }

            // Filter by year
            if (movie.year < yearMin || movie.year > yearMax) {
                return false;
            }

            // Filter by rating
            if (movie.rating < ratingMin || movie.rating > ratingMax) {
                return false;
            }

            // Filter by genre (if any selected)
            if (selectedGenres.length > 0) {
                return movie.genre.some(genre => selectedGenres.includes(genre));
            }

            return true;
        });
    }

    function searchMovies() {
        filterMovies();
        currentPage = 1;
        updatePagination();
        renderCurrentPage();
    }

    function sortMovies() {
        const sortOption = sortSelect.value;

        switch (sortOption) {
            case 'title-asc':
                filteredMovies.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'title-desc':
                filteredMovies.sort((a, b) => b.title.localeCompare(a.title));
                break;
            case 'year-desc':
                filteredMovies.sort((a, b) => b.year - a.year);
                break;
            case 'year-asc':
                filteredMovies.sort((a, b) => a.year - b.year);
                break;
            case 'rating-desc':
                filteredMovies.sort((a, b) => b.rating - a.rating);
                break;
            case 'rating-asc':
                filteredMovies.sort((a, b) => a.rating - b.rating);
                break;
            default:
                filteredMovies.sort((a, b) => b.rating - a.rating);
        }
    }

    function renderCurrentPage() {
        const startIndex = (currentPage - 1) * moviesPerPage;
        const endIndex = startIndex + moviesPerPage;
        const currentMovies = filteredMovies.slice(startIndex, endIndex);

        movieGrid.innerHTML = '';

        if (currentMovies.length === 0) {
            movieGrid.innerHTML = '<div class="no-results">No movies match your filters</div>';
            return;
        }

        currentMovies.forEach(movie => {
            const movieCard = document.createElement('div');
            movieCard.className = 'movie-card';

            movieCard.innerHTML = `
                <div class="movie-card-poster">
                    <a href="/movie/${movie.id}">
                        <img src="${movie.poster}" alt="${movie.title}">
                    </a>
                    <div class="movie-card-rating">
                        <i class="fas fa-star"></i> ${movie.rating}
                    </div>
                </div>
                <div class="movie-card-info">
                    <h3><a href="/movie/${movie.id}">${movie.title}</a></h3>
                    <div class="movie-card-meta">
                        <span class="movie-card-year">${movie.year}</span>
                        <span class="movie-card-genre">
                            ${movie.genre[0]}${movie.genre.length > 1 ? ', ...' : ''}
                        </span>
                    </div>
                </div>
            `;

            movieGrid.appendChild(movieCard);
        });
    }

    function updatePagination() {
        const totalPages = Math.max(1, Math.ceil(filteredMovies.length / moviesPerPage));

        currentPageEl.textContent = currentPage;
        totalPagesEl.textContent = totalPages;

        prevPageBtn.disabled = currentPage <= 1;
        nextPageBtn.disabled = currentPage >= totalPages;
    }

    function resetFilters() {
        // Reset genre checkboxes
        genreCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });

        // Reset year range
        yearMinSlider.value = 1970;
        yearMaxSlider.value = 2025;
        yearMinValue.textContent = 1970;
        yearMaxValue.textContent = 2025;

        // Reset rating range
        ratingMinSlider.value = 0;
        ratingMaxSlider.value = 10;
        ratingMinValue.textContent = 0;
        ratingMaxValue.textContent = 10;

        // Reset search
        dashboardSearchInput.value = '';
    }

    function showUploadMessage(message, type) {
        uploadMessage.textContent = message;
        uploadMessage.className = 'upload-message';

        if (type) {
            uploadMessage.classList.add(type);
        }
    }
});
