from flask import Flask, render_template, request
import requests
from requests.exceptions import ConnectionError, Timeout
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

app = Flask(__name__)

# Set up the templates and static directories
app.template_folder = "templates"
app.static_folder = "static"

# TMDB API key (replace 'your_tmdb_api_key' with your actual API key)
TMDB_API_KEY = "0904f8f04608b817974cd0e5cee2acc9"
YOUTUBE_API_KEY = "AIzaSyAzJqWbj3rpyqdi4gTi48t7eIotImqABBw"  # Replace with your YouTube API key
# OMDb API key
OMDB_API_KEY = "84bb1e9d"

# Set up requests session with retry strategy
session = requests.Session()
retry = Retry(total=3, backoff_factor=1, status_forcelist=[500, 502, 503, 504])
adapter = HTTPAdapter(max_retries=retry)
session.mount("https://", adapter)

def fetch_youtube_trailer(movie_title):
    youtube_search_url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&q={movie_title}+official+trailer&type=video&key={YOUTUBE_API_KEY}"
    try:
        response = session.get(youtube_search_url, timeout=10)
        response.raise_for_status()
        youtube_data = response.json()
        print(f"YouTube API Response for '{movie_title}': {youtube_data}")  # Debugging log
        if youtube_data.get("items"):
            # Extract the video ID of the first result
            video_id = youtube_data["items"][0]["id"]["videoId"]
            return f"https://www.youtube.com/watch?v={video_id}"
    except requests.exceptions.RequestException as e:
        print(f"Error fetching YouTube trailer for '{movie_title}': {e}")
    return None

def fetch_omdb_details(movie_title):
    omdb_url = f"http://www.omdbapi.com/?t={movie_title}&apikey={OMDB_API_KEY}"
    try:
        response = session.get(omdb_url, timeout=10)
        response.raise_for_status()
        omdb_data = response.json()
        print(f"OMDb API Response for '{movie_title}': {omdb_data}")  # Debugging log
        if omdb_data.get("Response") == "True":
            return {
                "plot": omdb_data.get("Plot"),
                "imdb_rating": omdb_data.get("imdbRating"),
                "genre": omdb_data.get("Genre"),
                "runtime": omdb_data.get("Runtime"),
                "released": omdb_data.get("Released")
            }
    except requests.exceptions.RequestException as e:
        print(f"Error fetching OMDb details: {e}")  # Log the error for debugging
    return None

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/recommend', methods=['POST'])
def recommend():
    movie_name = request.form.get('movie_name')
    if not movie_name:
        return render_template('index.html', error="Please enter a movie name.")

    # TMDb API call for movie search
    url = f"https://api.themoviedb.org/3/search/movie?api_key={TMDB_API_KEY}&query={movie_name}"
    try:
        response = session.get(url, timeout=10)
        response.raise_for_status()
    except ConnectionError:
        return render_template('index.html', error="Failed to connect to TMDB API. Please try again later.")
    except Timeout:
        return render_template('index.html', error="The request to TMDB API timed out. Please try again later.")
    except requests.exceptions.RequestException as e:
        return render_template('index.html', error=f"An error occurred: {e}")

    data = response.json()
    if not data['results']:
        return render_template('index.html', error="No movies found.")

    # Get the first movie's data
    main_movie = data['results'][0]
    movie_id = main_movie['id']

    recommendations_data = []

    # Fetch trailer for main movie
    trailer_key = None
    detail_url = f"https://api.themoviedb.org/3/movie/{movie_id}?api_key={TMDB_API_KEY}&append_to_response=videos"
    try:
        detail_response = session.get(detail_url, timeout=10)
        detail_response.raise_for_status()
        movie_details = detail_response.json()
        for video in movie_details.get('videos', {}).get('results', []):
            if video['site'] == 'YouTube' and video['type'] == 'Trailer':
                trailer_key = video['key']
                break
    except requests.exceptions.RequestException:
        pass

    trailer_url = f"https://www.youtube.com/watch?v={trailer_key}" if trailer_key else fetch_youtube_trailer(main_movie.get("title"))

    # Fetch additional details from OMDb
    omdb_details = fetch_omdb_details(main_movie.get("title"))

    # Add main movie to the list
    recommendations_data.append({
        "id": main_movie.get("id"),
        "title": main_movie.get("title"),
        "poster": f"https://image.tmdb.org/t/p/w500{main_movie.get('poster_path')}" if main_movie.get("poster_path") else None,
        "trailer": trailer_url,
        "plot": omdb_details.get("plot") if omdb_details else "N/A",
        "imdb_rating": omdb_details.get("imdb_rating") if omdb_details else "N/A",
        "genre": omdb_details.get("genre") if omdb_details else "N/A",
        "runtime": omdb_details.get("runtime") if omdb_details else "N/A",
        "released": omdb_details.get("released") if omdb_details else "N/A"
    })

    # Now fetch recommendations (related movies)
    recommendations_url = f"https://api.themoviedb.org/3/movie/{movie_id}/recommendations?api_key={TMDB_API_KEY}&append_to_response=videos"
    try:
        recommendations_response = session.get(recommendations_url, timeout=10)
        recommendations_response.raise_for_status()
    except ConnectionError:
        return render_template('index.html', error="Failed to connect to TMDB API for recommendations.")
    except Timeout:
        return render_template('index.html', error="The request for recommendations timed out.")
    except requests.exceptions.RequestException as e:
        return render_template('index.html', error=f"An error occurred: {e}")

    recommendations = recommendations_response.json().get('results', [])

    # Add recommended movies
    for movie in recommendations:
        trailer_key = None
        if movie.get("id"):
            detail_url = f"https://api.themoviedb.org/3/movie/{movie['id']}?api_key={TMDB_API_KEY}&append_to_response=videos"
            try:
                detail_response = session.get(detail_url, timeout=10)
                detail_response.raise_for_status()
                movie_details = detail_response.json()
                for video in movie_details.get('videos', {}).get('results', []):
                    if video['site'] == 'YouTube' and video['type'] == 'Trailer':
                        trailer_key = video['key']
                        break
            except requests.exceptions.RequestException:
                pass

        trailer_url = f"https://www.youtube.com/watch?v={trailer_key}" if trailer_key else fetch_youtube_trailer(movie.get("title"))

        omdb_details = fetch_omdb_details(movie.get("title"))

        recommendations_data.append({
            "id": movie.get("id"),
            "title": movie.get("title"),
            "poster": f"https://image.tmdb.org/t/p/w500{movie.get('poster_path')}" if movie.get("poster_path") else None,
            "trailer": trailer_url,
            "plot": omdb_details.get("plot") if omdb_details else "N/A",
            "imdb_rating": omdb_details.get("imdb_rating") if omdb_details else "N/A",
            "genre": omdb_details.get("genre") if omdb_details else "N/A",
            "runtime": omdb_details.get("runtime") if omdb_details else "N/A",
            "released": omdb_details.get("released") if omdb_details else "N/A"
        })

    return render_template('recommendations.html', movie_name=movie_name, recommendations=recommendations_data)


@app.route('/movie/<int:movie_id>')
def movie_detail(movie_id):
    # TMDb API call to fetch movie details
    detail_url = f"https://api.themoviedb.org/3/movie/{movie_id}?api_key={TMDB_API_KEY}&append_to_response=videos"
    try:
        response = session.get(detail_url, timeout=10)
        response.raise_for_status()
        movie = response.json()
    except requests.exceptions.RequestException as e:
        return render_template('error.html', message=f"Failed to fetch movie details: {e}")

    # Fetch trailer from TMDb API
    trailer_key = None
    for video in movie.get('videos', {}).get('results', []):
        if video['site'] == 'YouTube' and video['type'] == 'Trailer':
            trailer_key = video['key']
            break

    # If no trailer is found on TMDb, fallback to YouTube API
    trailer_url = f"https://www.youtube.com/watch?v={trailer_key}" if trailer_key else fetch_youtube_trailer(movie.get("title"))

    # Combine data to pass to the template
    movie_data = {
        "title": movie.get("title"),
        "poster": f"https://image.tmdb.org/t/p/w500{movie.get('poster_path')}" if movie.get("poster_path") else None,
        "plot": movie.get("overview", "N/A"),
        "imdb_rating": "N/A",  # Replace with actual IMDb rating if available
        "genre": ", ".join([genre["name"] for genre in movie.get("genres", [])]) if movie.get("genres") else "N/A",
        "runtime": f"{movie.get('runtime')} minutes" if movie.get("runtime") else "N/A",
        "released": movie.get("release_date", "N/A"),
        "trailer": trailer_url
    }

    return render_template('movie_detail.html', movie=movie_data)

if __name__ == '__main__':
    app.run(debug=True)