
import os
import asyncio
import tempfile
import threading
import html
import re
import logging
from flask import Flask, request, jsonify, send_file, after_this_request
from flask_cors import CORS

# Configure logging to file
log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend_errors.log')
logging.basicConfig(
    filename=log_path,
    level=logging.DEBUG,
    format='%(asctime)s %(levelname)s:%(message)s'
)
logger = logging.getLogger(__name__)
logger.info(f"Logging initialized at {log_path}")

try:
    import edge_tts
    HAS_EDGE_TTS = True
except ImportError:
    HAS_EDGE_TTS = False

try:
    from deep_translator import GoogleTranslator
    HAS_TRANSLATOR = True
except ImportError:
    HAS_TRANSLATOR = False

app = Flask(__name__)
CORS(app)

# Dedicated event loop for async operations
_loop = asyncio.new_event_loop()
_thread = threading.Thread(target=_loop.run_forever, daemon=True)
_thread.start()

def run_async(coro, timeout=60):
    """Run an async coroutine safely from sync Flask context."""
    future = asyncio.run_coroutine_threadsafe(coro, _loop)
    return future.result(timeout=timeout)


@app.route('/api/status', methods=['GET'])
def status():
    return jsonify({
        "status": "ok",
        "message": "Python backend is running",
        "edge_tts": HAS_EDGE_TTS,
        "translator": HAS_TRANSLATOR
    })


@app.route('/api/voices', methods=['GET'])
def list_voices():
    """List all available edge-tts voices."""
    if not HAS_EDGE_TTS:
        return jsonify({"error": "edge-tts not installed"}), 500
    try:
        voices = run_async(edge_tts.list_voices())
        simple = [
            {"id": v["ShortName"], "name": v["FriendlyName"], "gender": v["Gender"], "locale": v["Locale"]}
            for v in voices
        ]
        return jsonify(simple)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/translate', methods=['POST'])
def translate_text():
    """Translate text to target language."""
    if not HAS_TRANSLATOR:
        return jsonify({"error": "deep-translator not installed"}), 500

    try:
        data = request.get_json(force=True)
        text = data.get('text', '').strip()
        target = data.get('target', 'en')  # 'hi', 'es', 'fr', etc.

        if not text:
            return jsonify({"error": "No text provided"}), 400

        # Translate
        # Using GoogleTranslator because it's free and robust enough for demo
        translator = GoogleTranslator(source='auto', target=target)
        translated = translator.translate(text)
        
        return jsonify({"translated_text": translated})

    except Exception as e:
        print(f"[ERROR] Translate: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/generate/voice', methods=['POST'])
def generate_voice():
    """Generate TTS audio from text using edge-tts."""
    if not HAS_EDGE_TTS:
        return jsonify({"error": "edge-tts not installed"}), 500

    try:
        data = request.get_json(force=True)
        text = data.get('text', '').strip()
        voice = data.get('voice', 'en-US-GuyNeural')
        rate = data.get('rate', '+0%')
        pitch = data.get('pitch', '+0Hz')
        style = data.get('style', 'neutral') # cheerful, sad, angry, etc.

        if not text:
            return jsonify({"error": "No text provided"}), 400

        # Create temp file for audio
        fd, temp_path = tempfile.mkstemp(suffix='.mp3')
        os.close(fd)

        async def _generate():
            # CLEAN TEXT: Remove links, XML tags, and common script artifacts like [Laughs] or (Smiling)
            # This fixes the user's "nonsense talk" and "speaking version of xml" complaints.
            text_clean = re.sub(r'https?://\S+|www\.\S+|https?(\s+|$)|https?(\s|$)|www(\s|$)', '', text, flags=re.IGNORECASE)
            text_clean = re.sub(r'<[^>]+>', '', text_clean)  # Strip ALL existing XML tags
            text_clean = re.sub(r'\[[^\]]*\]', '', text_clean) # Strip bracketed instructions [laughs]
            text_clean = re.sub(r'\([^)]*\)', '', text_clean) # Strip parenthetical instructions (smiling)
            text_clean = text_clean.strip()
            
            logger.debug(f"Generation - Original: {text[:50]}... | Cleaned: {text_clean[:50]}...")
            
            if not text_clean:
                logger.warning("Generation aborted: Text is empty after filtering")
                raise ValueError("Script is empty after filtering")

            # NOTE: We avoid SSML entirely now because many high-quality Edge voices 
            # (especially Multilingual ones) fail to parse it correctly or don't support 
            # the mstts:express-as style, causing them to read the XML tags aloud.
            # Plain text with Communicate(rate/pitch) is 100% reliable.
            logger.info(f"Using edge-tts (Plain): Voice={voice}, Rate={rate}, Pitch={pitch}")
            
            # --- ROBUST RETRY LOGIC ---
            # Handles DNS blips (gaierror) or connection timeouts
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    # edge-tts streams are one-shot; create a fresh instance for every retry.
                    communicate = edge_tts.Communicate(text_clean, voice, rate=rate, pitch=pitch)
                    await communicate.save(temp_path)
                    logger.debug(f"Successfully saved audio to {temp_path}")
                    return # Success!
                except Exception as e:
                    logger.error(f"Attempt {attempt+1} failed: {str(e)}")
                    if attempt == max_retries - 1:
                        raise e # Final attempt failed
                    print(f"[RETRY] Attempt {attempt+1} failed: {e}. Retrying in 2s...")
                    await asyncio.sleep(2)

        try:
            run_async(_generate(), timeout=120)
        except Exception as e:
            error_str = str(e)
            logger.exception(f"Exception in run_async: {error_str}")
            if "Script is empty" in error_str:
                return jsonify({"error": "Your script is empty or contains only un-speakable characters (like links or brackets)."}), 400
            if "getaddrinfo failed" in error_str or "DNS" in error_str:
                return jsonify({"error": "Network Error: Could not reach voice servers. Check your internet connection."}), 503
            return jsonify({"error": f"Internal Voice Error: {error_str}"}), 500

        @after_this_request
        def _cleanup_file(response):
            try:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
            except Exception:
                logger.warning("Failed to cleanup temp audio file: %s", temp_path)
            return response

        return send_file(
            temp_path,
            mimetype="audio/mpeg",
            as_attachment=False,
            download_name="speech.mp3"
        )

    except Exception as e:
        logger.exception("Global exception in generate_voice")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"System Error: {str(e)}"}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"AI Clone Backend starting on port {port}")
    print(f"   edge-tts: {'OK' if HAS_EDGE_TTS else 'MISSING'}")
    print(f"   deep-translator: {'OK' if HAS_TRANSLATOR else 'MISSING'}")
    # Enable debug=True for auto-reload on changes
    app.run(host='0.0.0.0', port=port, debug=True)
