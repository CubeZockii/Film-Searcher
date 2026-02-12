// --- Configuration ---
const apiUrl = "https://movie-api.sayrz.com/api";
const imageUrl = "https://image.tmdb.org/t/p/w500";
const backdropUrl = "https://image.tmdb.org/t/p/w1280";

// --- DOM Elements ---
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchSection = document.getElementById("search-section");
const resultsSection = document.getElementById("results-section");
const resultsGrid = document.getElementById("results-grid");
const resultsHeading = document.getElementById("results-heading");
const resultsCount = document.getElementById("results-count");
const seriesDetailSection = document.getElementById("series-detail-section");
const movieDetailSection = document.getElementById("movie-detail-section");
const movieDetailsContainer = document.getElementById(
  "movie-details-container",
);
const loadingOverlay = document.getElementById("loading-overlay");

// Navigation Buttons
const newSearchBtn = document.getElementById("new-search-btn");
const backToResultsBtn = document.getElementById("back-to-results-btn");
const backFromMovieBtn = document.getElementById("back-from-movie-btn");

// Custom alert pop-up elements
const customAlert = document.getElementById("custom-alert");
const alertMessage = document.getElementById("alert-message");
const alertTitle = document.getElementById("alert-title");
const alertOkBtn = document.getElementById("alert-ok-btn");

// Trailer modal elements
const trailerModal = document.getElementById("trailer-modal");
const trailerIframe = document.getElementById("trailer-iframe");

let currentSeriesId = null;

// --- Page Navigation ---
function showPage(pageId) {
  const sections = [
    searchSection,
    resultsSection,
    seriesDetailSection,
    movieDetailSection,
  ];
  sections.forEach((section) => {
    if (section.id === pageId) {
      section.classList.remove("hidden");
      section.classList.add("fade-in");
    } else {
      section.classList.add("hidden");
      section.classList.remove("fade-in");
    }
  });
  window.scrollTo(0, 0);
}

// --- Custom Alert Pop-up ---
function showAlert(message, type = "info", title = "Notice") {
  alertMessage.textContent = message;
  alertTitle.textContent = title;

  if (type === "error") {
    alertTitle.style.color = "var(--error)";
  } else {
    alertTitle.style.color = "var(--text-primary)";
  }

  customAlert.classList.add("active");
}

function closeAlert() {
  customAlert.classList.remove("active");
}

// --- Loading State ---
function showLoading(show) {
  if (show) {
    loadingOverlay.classList.add("active");
  } else {
    loadingOverlay.classList.remove("active");
  }
}

// --- Search Functionality ---
function quickSearch(term) {
  searchInput.value = term;
  handleSearch(term);
}

async function handleSearch(query) {
  if (!query || !query.trim()) {
    showAlert("Please enter a search term", "error");
    return;
  }

  showLoading(true);
  showPage("results-section");
  resultsHeading.innerHTML = `Search Results for "${query}" <span class="result-count" id="results-count">0</span>`;
  resultsGrid.innerHTML =
    '<div class="loader"></div><p class="loading-text">Searching for movies...</p>';

  try {
    const response = await fetch(
      `${apiUrl}/search?query=${encodeURIComponent(query)}`,
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const combinedResults = data.results || [];

    displaySearchResults(combinedResults);
  } catch (error) {
    console.error("Error fetching search results:", error);
    showAlert(
      "An error occurred while fetching search results. Please try again later.",
      "error",
    );
    resultsGrid.innerHTML =
      '<p style="text-align: center; color: var(--text-secondary);">Failed to load search results.</p>';
  } finally {
    showLoading(false);
  }
}

function displaySearchResults(resultsList) {
  resultsGrid.innerHTML = "";
  const countEl = document.getElementById("results-count");

  if (!resultsList || resultsList.length === 0) {
    resultsGrid.innerHTML =
      '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No movie series or movies found for this query.</p>';
    if (countEl) countEl.textContent = "0";
    return;
  }

  if (countEl) countEl.textContent = resultsList.length;

  resultsList.forEach((item, index) => {
    if (!item.poster_path) return;

    const card = document.createElement("div");
    card.className = "card fade-in";
    card.style.animationDelay = `${index * 0.05}s`;

    const title = item.name || item.title;
    const year = item.release_date
      ? new Date(item.release_date).getFullYear()
      : item.first_air_date
        ? new Date(item.first_air_date).getFullYear()
        : "Unknown";
    const rating = item.vote_average ? item.vote_average.toFixed(1) : "N/A";

    card.innerHTML = `
                    <div class="card-image">
                        <img src="${imageUrl}${item.poster_path}" alt="Poster of ${title}" loading="lazy">
                        <div class="card-badge">★ ${rating}</div>
                    </div>
                    <div class="card-content">
                        <h3 class="card-title">${title}</h3>
                        <div class="card-meta">
                            <span>📅 ${year}</span>
                            <span class="rating">${item.media_type === "collection" ? "🎬 Series" : "🎬 Movie"}</span>
                        </div>
                    </div>
                `;

    card.addEventListener("click", () => {
      if (item.media_type === "collection") {
        getSeriesDetails(item.id);
      } else {
        getMovieDetails(item.id, null);
      }
    });

    resultsGrid.appendChild(card);
  });
}

// --- Series Details ---
async function getSeriesDetails(seriesId) {
  currentSeriesId = seriesId;
  showLoading(true);

  try {
    showPage("series-detail-section");
    document.getElementById("movie-list").innerHTML =
      '<div class="loader"></div><p class="loading-text">Loading series details...</p>';

    const response = await fetch(`${apiUrl}/collection/${seriesId}`);

    if (!response.ok) {
      if (response.status === 404)
        throw new Error("This collection could not be found.");
      throw new Error("Network response was not ok for series details.");
    }

    const data = await response.json();

    if (data.parts && data.parts.length > 0) {
      displaySeriesDetails(data);
    } else {
      showAlert("No movies found for this series.", "error");
      showPage("results-section");
    }
  } catch (error) {
    console.error("Error fetching series details:", error);
    showAlert(`Could not load series details: ${error.message}`, "error");
    showPage("results-section");
  } finally {
    showLoading(false);
  }
}

function displaySeriesDetails(seriesData) {
  // Sort by release date
  seriesData.parts.sort(
    (a, b) => new Date(a.release_date) - new Date(b.release_date),
  );

  const seriesInfo = document.getElementById("series-info");
  seriesInfo.innerHTML = `
                <div class="detail-hero fade-in">
                    <div class="detail-backdrop" style="background-image: url('${seriesData.backdrop_path ? backdropUrl + seriesData.backdrop_path : ""}');">
                        <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 0%, var(--bg-card) 100%);"></div>
                    </div>
                    <div class="detail-info">
                        <img class="detail-poster" src="${seriesData.poster_path ? imageUrl + seriesData.poster_path : "https://via.placeholder.com/250x375/2c2c34/a9a9b2?text=No+Image"}" alt="Poster of ${seriesData.name}">
                        <div class="detail-text">
                            <h2>${seriesData.name}</h2>
                            <p>${seriesData.overview || "No description available for this series."}</p>
                            <div class="detail-meta">
                                <span>🎬 ${seriesData.parts.length} Movies</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;

  const movieList = document.getElementById("movie-list");
  movieList.innerHTML = "";

  seriesData.parts.forEach((movie, index) => {
    const releaseYear = movie.release_date
      ? new Date(movie.release_date).getFullYear()
      : "Unknown";
    const item = document.createElement("div");
    item.className = "timeline-item slide-in";
    if (index === 0) item.classList.add("active");
    item.style.animationDelay = `${index * 0.1}s`;

    item.innerHTML = `
                    <div class="timeline-content">
                        <img class="timeline-poster" src="${movie.poster_path ? imageUrl + movie.poster_path : "https://via.placeholder.com/100x150/2c2c34/a9a9b2?text=No+Image"}" alt="Poster of ${movie.title}">
                        <div class="timeline-info">
                            <h3>${movie.title}</h3>
                            <p>Release Year: ${releaseYear}</p>
                            <div class="timeline-actions">
                                <button class="btn btn-primary btn-small trailer-btn" data-movie-id="${movie.id}">▶ Trailer</button>
                                <button class="btn btn-secondary btn-small details-btn" data-movie-id="${movie.id}">Details</button>
                            </div>
                        </div>
                    </div>
                `;
    movieList.appendChild(item);
  });

  // Add event listeners to buttons
  document.querySelectorAll(".trailer-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      showMovieTrailer(e.target.dataset.movieId, true);
    });
  });

  document.querySelectorAll(".details-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      getMovieDetails(e.target.dataset.movieId, currentSeriesId);
    });
  });
}

// --- Movie Details ---
async function getMovieDetails(movieId, seriesId) {
  showLoading(true);

  try {
    showPage("movie-detail-section");
    movieDetailsContainer.innerHTML =
      '<div class="loader"></div><p class="loading-text">Loading movie details...</p>';

    const response = await fetch(`${apiUrl}/movie/${movieId}`);

    if (!response.ok) throw new Error("Could not load movie details.");

    const movieData = await response.json();
    displayMovieDetails(movieData, seriesId);
  } catch (error) {
    console.error("Error fetching movie details:", error);
    showAlert(error.message, "error");
    showPage(seriesId ? "series-detail-section" : "results-section");
  } finally {
    showLoading(false);
  }
}

function displayMovieDetails(movieData, seriesId) {
  backFromMovieBtn.innerHTML = seriesId
    ? "← Back to Series"
    : "← Back to Results";
  backFromMovieBtn.onclick = () => {
    if (seriesId) {
      getSeriesDetails(seriesId);
    } else {
      showPage("results-section");
    }
  };

  const watchProviders = movieData["watch/providers"]?.results?.["DE"] || null;
  let streamingInfoHTML =
    "<p>Streaming information not available for your region.</p>";

  if (watchProviders) {
    let providersHTML = "";
    if (watchProviders.flatrate?.length > 0) {
      providersHTML += `<p><strong>Stream on:</strong> ${watchProviders.flatrate.map((p) => p.provider_name).join(", ")}</p>`;
    }
    if (watchProviders.buy?.length > 0) {
      providersHTML += `<p><strong>Buy on:</strong> ${watchProviders.buy.map((p) => p.provider_name).join(", ")}</p>`;
    }
    if (watchProviders.rent?.length > 0) {
      providersHTML += `<p><strong>Rent on:</strong> ${watchProviders.rent.map((p) => p.provider_name).join(", ")}</p>`;
    }
    if (providersHTML)
      streamingInfoHTML = `<div class="streaming-info">${providersHTML}</div>`;
  }

  const movieTrailer = movieData.videos?.results?.find(
    (video) => video.type === "Trailer" && video.site === "YouTube",
  );
  const trailerButtonHTML = movieTrailer
    ? `<button class="btn btn-primary" onclick="playTrailer('${movieTrailer.key}')" style="margin-right: 0.75rem;">▶ Watch Trailer</button>`
    : "";

  const genres = movieData.genres
    ? movieData.genres.map((g) => g.name).join(", ")
    : "Unknown";

  movieDetailsContainer.innerHTML = `
                <div class="movie-content-wrapper fade-in">
                    <img class="movie-poster" src="${movieData.poster_path ? imageUrl + movieData.poster_path : "https://via.placeholder.com/300x450/2c2c34/a9a9b2?text=No+Poster"}" alt="Poster of ${movieData.title}">
                    <div class="movie-info-text">
                        <h2>${movieData.title}</h2>
                        <p class="tagline">${movieData.tagline || ""}</p>
                        <p class="overview">${movieData.overview || "No description available."}</p>
                        
                        <div class="movie-meta">
                            <p><strong>Release Date:</strong> ${movieData.release_date || "Unknown"}</p>
                            <p><strong>Genre:</strong> ${genres}</p>
                            <p><strong>Rating:</strong> ⭐ ${movieData.vote_average ? movieData.vote_average.toFixed(1) : "N/A"}/10</p>
                            <p><strong>Runtime:</strong> ${movieData.runtime ? movieData.runtime + " minutes" : "Unknown"}</p>
                        </div>
                        
                        ${streamingInfoHTML}
                        
                        <div>
                            ${trailerButtonHTML}
                            <button class="btn btn-secondary" onclick="showPage('${seriesId ? "series-detail-section" : "results-section"}')">Back</button>
                        </div>
                    </div>
                </div>
            `;
}

// --- Trailer Functionality ---
async function showMovieTrailer(videoId, isMovieId = true) {
  let youtubeKey = videoId;

  if (isMovieId) {
    try {
      const response = await fetch(`${apiUrl}/movie/${videoId}/trailer`);
      if (!response.ok) throw new Error("Trailer fetch failed.");

      const data = await response.json();
      const trailerKey = data.trailerKey;

      if (!trailerKey) {
        showAlert("No trailer found for this movie.", "error");
        return;
      }
      youtubeKey = trailerKey;
    } catch (error) {
      console.error("Error fetching trailer:", error);
      showAlert("Could not load trailer.", "error");
      return;
    }
  }

  playTrailer(youtubeKey);
}

function playTrailer(youtubeKey) {
  trailerIframe.src = `https://www.youtube.com/embed/${youtubeKey}?autoplay=1`;
  trailerModal.classList.add("active");
}

function closeTrailer() {
  trailerIframe.src = "";
  trailerModal.classList.remove("active");
}

// --- Event Listeners ---
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (query) handleSearch(query);
});

newSearchBtn.addEventListener("click", () => {
  showPage("search-section");
  searchInput.value = "";
  searchInput.focus();
  currentSeriesId = null;
});

backToResultsBtn.addEventListener("click", () => showPage("results-section"));

// Modal close on backdrop click
customAlert.addEventListener("click", (e) => {
  if (e.target === customAlert) closeAlert();
});

trailerModal.addEventListener("click", (e) => {
  if (e.target === trailerModal) closeTrailer();
});

// Close on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeAlert();
    closeTrailer();
  }
});

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  searchInput.focus();
});