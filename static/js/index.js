document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const searchResults = document.getElementById('search-results');
    const featuredMoviesContainer = document.getElementById('featured-movies-container');
    const searchForm = document.getElementById("search-form");
    const videoOverlay = document.getElementById("video-overlay");
    const searchVideo = document.getElementById("search-video");

    // Load featured movies on page load
    loadFeaturedMovies();

    // Set up search functionality
    searchButton.addEventListener('click', function(event) {
        // Prevent form submission until the video finishes
        event.preventDefault();

        // Show the video overlay
        videoOverlay.classList.remove("hidden");

        // Play the video
        searchVideo.play();

        // Wait for the video to finish before submitting the form
        searchVideo.onended = () => {
            searchForm.submit();
        };

        searchMovies();
    });

    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchMovies();
        }
    });

    // Hide search results when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target) && !searchButton.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });

    // Function to search movies
    function searchMovies() {
        const query = searchInput.value.trim();
        if (query === '') {
            searchResults.style.display = 'none';
            return;
        }

        fetch(`/api/search?query=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(movies => {
                // Clear previous results
                searchResults.innerHTML = '';

                if (movies.length === 0) {
                    searchResults.innerHTML = '<div class="search-result-item">No movies found</div>';
                } else {
                    movies.forEach(movie => {
                        const resultItem = document.createElement('a');
                        resultItem.href = `/movie/${movie.id}`;
                        resultItem.className = 'search-result-item';

                        resultItem.innerHTML = `
                            <div class="search-result-poster">
                                <img src="${movie.poster}" alt="${movie.title}">
                            </div>
                            <div class="search-result-info">
                                <h3>${movie.title}</h3>
                                <div class="meta">
                                    <span>${movie.year}</span> •
                                    <span>${movie.genre.join(', ')}</span> •
                                    <span><i class="fas fa-star"></i> ${movie.rating}</span>
                                </div>
                            </div>
                        `;


                        searchResults.appendChild(resultItem);
                    });
                }

                // Show search results
                searchResults.style.display = 'block';
            })
            .catch(error => {
                console.error('Error searching movies:', error);
            });
    }

    // Function to load featured movies
    function loadFeaturedMovies() {
        fetch('/api/recommend')
            .then(response => response.json())
            .then(movies => {
                featuredMoviesContainer.innerHTML = '';

                movies.forEach(movie => {
                    console.log("Movie:", movie);  // 👈 Debugging: Log each movie object

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

                    featuredMoviesContainer.appendChild(movieCard);
                });
            })
            .catch(error => {
                console.error('Error loading featured movies:', error);
                featuredMoviesContainer.innerHTML = '<div class="error">Error loading movies</div>';
            });
    }
    
});
