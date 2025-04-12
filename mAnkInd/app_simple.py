from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import json
import random
import asyncio
import time
from pathlib import Path
import uvicorn

# Import the AI response generator from our simplified simulator
from ai.gemma_simulator_simple import get_ai_response

app = FastAPI(title="mAnkInd - The Human vs AI Duel")

# Mount static files
app.mount("/static", StaticFiles(directory=Path(__file__).parent / "static"), name="static")

# Setup templates
templates = Jinja2Templates(directory=Path(__file__).parent / "templates")

# Store active connections
active_connections = {}
# Game state storage
player_progress = {}


@app.get("/", response_class=HTMLResponse)
async def get_root(request: Request):
    """Serve the main game interface"""
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/about", response_class=HTMLResponse)
async def get_about(request: Request):
    """Serve the about page with game explanation"""
    return templates.TemplateResponse("about.html", {"request": request})


@app.get("/leaderboard", response_class=HTMLResponse)
async def get_leaderboard(request: Request):
    """Serve the leaderboard page"""
    return templates.TemplateResponse("leaderboard.html", {"request": request})


@app.websocket("/ws/{player_id}")
async def websocket_endpoint(websocket: WebSocket, player_id: str):
    await websocket.accept()
    print(f"WebSocket connection accepted for player: {player_id}")
    
    # Register new connection
    if player_id not in active_connections:
        active_connections[player_id] = websocket
        # Initialize player progress if new
        if player_id not in player_progress:
            player_progress[player_id] = {
                "level": 1,
                "xp": 0,
                "games_played": 0,
                "games_won": 0
            }
    
    try:
        # Get player's current level
        player_level = player_progress[player_id]["level"]
        print(f"Starting game session for player: {player_id} with level: {player_level}")
        
        # Start game session
        await start_game_session(websocket, player_id, player_level)
        
    except WebSocketDisconnect:
        # Clean up on disconnect
        if player_id in active_connections:
            del active_connections[player_id]
        print(f"WebSocket connection closed for player: {player_id}")
    except Exception as e:
        print(f"Error in websocket handler: {e}")


async def start_game_session(websocket: WebSocket, player_id: str, player_level: int):
    """Handle a game session including the 2-minute timer"""
    try:
        print("Sending game start notification")
        # Send game start notification
        await websocket.send_json({
            "type": "game_start",
            "level": player_level,
            "message": f"Duel started! You have 2 minutes to determine if you're talking to a human or AI.",
            "time_remaining": 120
        })
        
        # Is opponent AI or human? (For demo, always AI but with randomized behavior)
        is_ai_opponent = True
        ai_type = "normal"  # Can be normal, human-like, or deceptive based on level
        
        if player_level >= 5:
            ai_type = "human-like"
        if player_level >= 8:
            ai_type = "deceptive"
        
        # Game timer (120 seconds)
        start_time = time.time()
        end_time = start_time + 120
        
        # Send initial greeting
        print("Sending initial greeting")
        initial_message = get_ai_response("greeting", player_level, ai_type)
        print(f"Initial greeting: {initial_message}")
        
        await websocket.send_json({
            "type": "message",
            "sender": "opponent",
            "content": initial_message,
            "time_remaining": round(end_time - time.time())
        })
        
        # Game loop
        game_active = True
        while game_active:
            # Check time remaining
            time_remaining = round(end_time - time.time())
            if time_remaining <= 0:
                # Time's up
                await websocket.send_json({
                    "type": "time_up",
                    "message": "Time's up! Make your decision: Human or AI?",
                    "time_remaining": 0
                })
                game_active = False
                continue
            
            # Wait for player message
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                print(f"Received message: {data}")
                message_data = json.loads(data)
                
                # Handle different message types
                if message_data.get("type") == "message":
                    # Regular chat message
                    player_message = message_data.get("content", "")
                    print(f"Player message: {player_message}")
                    
                    # Get AI response
                    ai_response = get_ai_response(player_message, player_level, ai_type)
                    print(f"AI response: {ai_response}")
                    
                    # Add random delay to simulate typing
                    typing_delay = random.uniform(0.5, 2.5)
                    await asyncio.sleep(typing_delay)
                    
                    # Send response back
                    await websocket.send_json({
                        "type": "message",
                        "sender": "opponent",
                        "content": ai_response,
                        "time_remaining": round(end_time - time.time())
                    })
                    
                elif message_data.get("type") == "decision":
                    # Player made their human/AI decision
                    decision = message_data.get("decision")
                    correct = (decision == "ai" and is_ai_opponent) or (decision == "human" and not is_ai_opponent)
                    
                    # Calculate score based on time
                    time_used = time.time() - start_time
                    time_bonus = max(0, 120 - time_used)
                    score = calculate_score(correct, time_bonus, player_level)
                    
                    # Update player progress
                    update_player_progress(player_id, correct, score)
                    
                    # Send result
                    await websocket.send_json({
                        "type": "game_result",
                        "correct": correct,
                        "score": score,
                        "opponent_type": "ai" if is_ai_opponent else "human",
                        "new_level": player_progress[player_id]["level"],
                        "new_xp": player_progress[player_id]["xp"]
                    })
                    
                    game_active = False
                    
            except asyncio.TimeoutError:
                # Just a timeout for the receive_text, continue the loop
                continue
            except Exception as e:
                print(f"Error in game loop: {e}")
                break
    except Exception as e:
        print(f"Error in start_game_session: {e}")


def calculate_score(correct: bool, time_bonus: float, player_level: int) -> int:
    """Calculate player score based on correctness, time and level"""
    base_score = 0
    
    if correct:
        # Base points for correct guess
        base_score = 50
        
        # Time bonus (more points for quicker decisions)
        time_multiplier = 1 + (time_bonus / 60)  # 1x to 3x multiplier
        
        # Level factor (higher levels get less points for same performance)
        level_factor = 1 / (0.5 + (player_level / 10))
        
        return int(base_score * time_multiplier * level_factor)
    else:
        # Penalty for wrong guess
        return -25


def update_player_progress(player_id: str, won: bool, score: int):
    """Update player XP, level and stats"""
    if player_id in player_progress:
        player = player_progress[player_id]
        
        # Update stats
        player["games_played"] += 1
        if won:
            player["games_won"] += 1
        
        # Update XP
        player["xp"] += score
        
        # Check for level up (simple formula: each level needs level*100 XP)
        current_level = player["level"]
        xp_for_next_level = current_level * 100
        
        if player["xp"] >= xp_for_next_level and current_level < 10:
            player["level"] += 1


if __name__ == "__main__":
    uvicorn.run("app_simple:app", host="0.0.0.0", port=8001, reload=True)
