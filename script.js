document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    // The API key is now securely handled on the server-side.
    // The client will make requests to our Python backend, not directly to TMDB.
    const apiUrl = 'https://movie-api.sayrz.com/api'; // Our new backend API endpoint
    const imageUrl = 'https://image.tmdb.org/t/p/w500';
    const backdropUrl = 'https://image.tmdb.org/t/p/w1280';

    // --- DOM Elements ---
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const searchSection = document.getElementById('search-section');
    const resultsSection = document.getElementById('results-section');
    const resultsGrid = document.getElementById('results-grid');
    const resultsHeading = document.getElementById('results-heading');
    const seriesDetailSection = document.getElementById('series-detail-section');
    const movieDetailSection = document.getElementById('movie-detail-section');

    // Navigation Buttons
    const newSearchBtn = document.getElementById('new-search-btn');
    const backToResultsBtn = document.getElementById('back-to-results-btn');
    const backFromMovieBtn = document.getElementById('back-from-movie-btn');

    // Custom alert pop-up elements
    const customAlert = document.getElementById('custom-alert');
    const alertMessage = document.getElementById('alert-message');
    const alertOkBtn = document.getElementById('alert-ok-btn');
    const closeBtn = document.querySelector('.modal-content .close-btn');

    // Trailer modal elements
    const trailerModal = document.getElementById('trailer-modal');
    const trailerCloseBtn = document.getElementById('trailer-close-btn');
    const trailerIframe = document.getElementById('trailer-iframe');

    // Movie details container
    const movieDetailsContainer = document.getElementById('movie-details-container');
    let currentSeriesId = null;

    // --- Page Navigation ---
    /**
     * Hides all main sections and shows the one with the specified ID.
     * @param {string} pageId - The ID of the section to show.
     */
    function showPage(pageId) {
        const sections = [searchSection, resultsSection, seriesDetailSection, movieDetailSection];
        sections.forEach(section => {
            if (section.id === pageId) {
                section.classList.remove('hidden');
            } else {
                section.classList.add('hidden');
            }
        });
        window.scrollTo(0, 0);
    }

    // --- Custom Alert Pop-up ---
    function showAlert(message) {
        alertMessage.textContent = message;
        customAlert.classList.remove('hidden');
        alertOkBtn.classList.remove('hidden');
        closeBtn.classList.remove('hidden');
    }

    function closeAlert() {
        customAlert.classList.add('hidden');
    }

    // No API key check needed here, it's on the server

    // --- Main Functions ---
    /**
     * Handles a search for movie series (collections) and single movies.
     * @param {string} query - The user's search term.
     */
    async function handleSearch(query) {
        showPage('results-section');
        resultsHeading.textContent = `Search Results for "${query}"`;
        resultsGrid.innerHTML = '<h2>Loading results...</h2>';

        try {
            // Send request to our backend /api/search endpoint
            const response = await fetch(`${apiUrl}/search?query=${encodeURIComponent(query)}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const combinedResults = data.results;

            displaySearchResults(combinedResults);
        } catch (error) {
            console.error('Error fetching search results:', error);
            showAlert('An error occurred while fetching search results. Please try again later.');
            resultsGrid.innerHTML = '<p>Failed to load search results.</p>';
        }
    }

    /**
     * Displays the search results in the results grid.
     * @param {Array} resultsList - A combined list of movies and collections.
     */
    function displaySearchResults(resultsList) {
        resultsGrid.innerHTML = '';
        if (resultsList.length === 0) {
            resultsGrid.innerHTML = '<p>No movie series or movies found for this query.</p>';
            return;
        }

        resultsList.forEach(item => {
            if (!item.poster_path) return;

            const card = document.createElement('div');
            card.className = 'series-card';
            card.innerHTML = `
                <img src="${imageUrl}${item.poster_path}" alt="Poster of ${item.name || item.title}">
                <h3>${item.name || item.title}</h3>
            `;
            card.addEventListener('click', () => {
                if (item.media_type === 'collection') {
                    getSeriesDetails(item.id);
                } else {
                    getMovieDetails(item.id, null);
                }
            });
            resultsGrid.appendChild(card);
        });
    }

    /**
     * Fetches details for a specific movie series (collection).
     * @param {number} seriesId - The ID of the movie series.
     */
    async function getSeriesDetails(seriesId) {
        currentSeriesId = seriesId;
        try {
            showPage('series-detail-section');
            document.getElementById('movie-list').innerHTML = '<h2>Loading series details...</h2>';

            // Send request to our backend /api/collection endpoint
            const response = await fetch(`${apiUrl}/collection/${seriesId}`);
            if (!response.ok) {
                if (response.status === 404) throw new Error('This collection could not be found.');
                throw new Error('Network response was not ok for series details.');
            }

            const data = await response.json();
            if (data.parts && data.parts.length > 0) {
                displaySeriesDetails(data);
            } else {
                showAlert('No movies found for this series.');
                showPage('results-section'); // Go back if series is empty
            }
        } catch (error) {
            console.error('Error fetching series details:', error);
            showAlert(`Could not load series details: ${error.message}`);
            showPage('results-section');
        }
    }

    /**
     * Displays the details page for a movie series.
     * @param {object} seriesData - The API data for the movie series.
     */
    function displaySeriesDetails(seriesData) {
        seriesData.parts.sort((a, b) => new Date(a.release_date) - new Date(b.release_date));

        const seriesInfo = document.getElementById('series-info');
        seriesInfo.innerHTML = `
            <img src="${seriesData.poster_path ? imageUrl + seriesData.poster_path : 'https://via.placeholder.com/250x375.png?text=No+Image'}" alt="Poster of ${seriesData.name}">
            <div id="series-info-text">
                <h2>${seriesData.name}</h2>
                <p>${seriesData.overview || 'No description available for this series.'}</p>
            </div>
        `;

        const movieList = document.getElementById('movie-list');
        movieList.innerHTML = '';
        seriesData.parts.forEach(movie => {
            const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : 'Unknown';
            const item = document.createElement('div');
            item.className = 'movie-item';
            item.innerHTML = `
                <img src="${movie.poster_path ? imageUrl + movie.poster_path : 'https://via.placeholder.com/100x150.png?text=No+Image'}" alt="Poster of ${movie.title}">
                <div class="movie-details">
                    <h3>${movie.title}</h3>
                    <p>Release Year: ${releaseYear}</p>
                </div>
                <div class="movie-actions">
                    <button class="trailer-btn" data-movie-id="${movie.id}">Trailer</button>
                    <button class="details-btn" data-movie-id="${movie.id}">Details</button>
                </div>
            `;
            movieList.appendChild(item);
        });

        document.querySelectorAll('.trailer-btn').forEach(button => {
            button.addEventListener('click', (e) => showMovieTrailer(e.target.dataset.movieId, true));
        });

        document.querySelectorAll('.details-btn').forEach(button => {
            button.addEventListener('click', (e) => getMovieDetails(e.target.dataset.movieId, currentSeriesId));
        });
    }

    /**
     * Fetches and displays the details of a single movie.
     * @param {number} movieId - The ID of the movie.
     * @param {number|null} seriesId - The ID of the series, if applicable.
     */
    async function getMovieDetails(movieId, seriesId) {
        try {
            showPage('movie-detail-section');
            movieDetailsContainer.innerHTML = '<h2>Loading movie details...</h2>';

            // Send request to our backend /api/movie endpoint
            const response = await fetch(`${apiUrl}/movie/${movieId}`);
            if (!response.ok) throw new Error('Could not load movie details.');
            const movieData = await response.json();

            displayMovieDetails(movieData, seriesId);
        } catch (error) {
            console.error('Error fetching movie details:', error);
            showAlert(error.message);
            showPage(seriesId ? 'series-detail-section' : 'results-section');
        }
    }

    /**
     * Displays the details page for a single movie.
     * @param {object} movieData - The movie data object.
     * @param {number|null} seriesId - The ID of the series, for back navigation.
     */
    function displayMovieDetails(movieData, seriesId) {
        backFromMovieBtn.innerHTML = seriesId ? '&larr; Back to Series' : '&larr; Back to Results';
        backFromMovieBtn.onclick = () => {
            if (seriesId) {
                getSeriesDetails(seriesId);
            } else {
                showPage('results-section');
            }
        };

        const watchProviders = movieData['watch/providers']?.results?.['DE'] || null;
        let streamingInfoHTML = '<p>Streaming information not available for your region.</p>';
        if (watchProviders) {
            let providersHTML = '';
            if (watchProviders.flatrate?.length > 0) providersHTML += `<p><strong>Stream on:</strong> ${watchProviders.flatrate.map(p => p.provider_name).join(', ')}</p>`;
            if (watchProviders.buy?.length > 0) providersHTML += `<p><strong>Buy on:</strong> ${watchProviders.buy.map(p => p.provider_name).join(', ')}</p>`;
            if (watchProviders.rent?.length > 0) providersHTML += `<p><strong>Rent on:</strong> ${watchProviders.rent.map(p => p.provider_name).join(', ')}</p>`;
            if(providersHTML) streamingInfoHTML = providersHTML;
        }

        const movieTrailer = movieData.videos.results.find(video => video.type === 'Trailer' && video.site === 'YouTube');
        const trailerButtonHTML = movieTrailer ? `<button class="watch-trailer-btn" data-key="${movieTrailer.key}">Watch Trailer</button>` : '';
        const genres = movieData.genres.map(g => g.name).join(', ');

        movieDetailsContainer.innerHTML = `
            <div class="movie-backdrop" style="background-image: url('${movieData.backdrop_path ? backdropUrl + movieData.backdrop_path : ''}');"></div>
            <div class="movie-content-wrapper">
                <img class="movie-poster" src="${movieData.poster_path ? imageUrl + movieData.poster_path : 'https://placehold.co/300x450/2c2c34/a9a9b2?text=No+Poster'}" alt="Poster of ${movieData.title}">
                <div class="movie-info-text">
                    <h2>${movieData.title}</h2>
                    <p class="tagline">${movieData.tagline || ''}</p>
                    <p class="overview">${movieData.overview || 'No description available.'}</p>
                    <p><strong>Release Date:</strong> ${movieData.release_date || 'Unknown'}</p>
                    <p><strong>Genre:</strong> ${genres || 'Unknown'}</p>
                    ${streamingInfoHTML}
                    ${trailerButtonHTML}
                </div>
            </div>`;

        const watchTrailerBtn = document.querySelector('.watch-trailer-btn');
        if (watchTrailerBtn) {
            watchTrailerBtn.addEventListener('click', (e) => showMovieTrailer(e.target.dataset.key, false));
        }
    }

    /**
     * Opens the trailer modal and plays the video.
     * @param {string} videoId - The YouTube video ID or the TMDB movie ID.
     * @param {boolean} isMovieId - True if videoId is a TMDB movie ID.
     */
    async function showMovieTrailer(videoId, isMovieId = true) {
        let youtubeKey = videoId;
        if (isMovieId) {
            // Request trailer key from our backend
            const url = `${apiUrl}/movie/${videoId}/trailer`;
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error('Trailer fetch failed.');
                const data = await response.json();
                const trailerKey = data.trailerKey;
                if (!trailerKey) {
                    showAlert('No trailer found for this movie.');
                    return;
                }
                youtubeKey = trailerKey;
            } catch (error) {
                console.error('Error fetching trailer:', error);
                showAlert('Could not load trailer.');
                return;
            }
        }
        trailerIframe.src = `https://www.youtube.com/embed/${youtubeKey}?autoplay=1`;
        trailerModal.classList.remove('hidden');
    }

    function closeTrailer() {
        trailerIframe.src = '';
        trailerModal.classList.add('hidden');
    }

    /**
     * Resets to the initial search page.
     */
    function resetToSearchPage() {
        showPage('search-section');
        searchInput.value = '';
        searchInput.focus();
        currentSeriesId = null;
    }

    // --- Event Listeners ---
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query) handleSearch(query);
    });

    // Navigation button listeners
    newSearchBtn.addEventListener('click', resetToSearchPage);
    backToResultsBtn.addEventListener('click', () => showPage('results-section'));

    // Modal close listeners
    trailerCloseBtn.addEventListener('click', closeTrailer);
    alertOkBtn.addEventListener('click', closeAlert);
    closeBtn.addEventListener('click', closeAlert);
    customAlert.addEventListener('click', (e) => {
        if (e.target === customAlert) closeAlert();
    });

    // Initial page load
    resetToSearchPage();
});
