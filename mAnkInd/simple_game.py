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

app = FastAPI(title="mAnkInd - Human vs AI Duel (Simplified)")

# Mount static files
app.mount("/static", StaticFiles(directory=Path(__file__).parent / "static"), name="static")

# Setup templates
templates = Jinja2Templates(directory=Path(__file__).parent / "templates")

# Sample messages
AI_RESPONSES = [
    "I'm just responding to your message. What would you like to talk about?",
    "That's an interesting question. I'd have to think about that.",
    "I've been contemplating that topic recently as well.",
    "What makes you ask that particular question?",
    "I'm not sure I have a good answer for that.",
    "Let me think about how to respond to that.",
    "That's a complex topic with many different perspectives.",
    "I find that subject fascinating too!",
    "I've had similar thoughts myself.",
    "What else would you like to discuss?"
]

@app.get("/", response_class=HTMLResponse)
async def get_root(request: Request):
    """Serve the main game interface"""
    # Read the standalone HTML file
    html_content = Path("standalone_game.html").read_text()
    return HTMLResponse(content=html_content)


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
    
    try:
        # Start game
        await websocket.send_json({
            "type": "game_start",
            "level": 1,
            "message": "Game started!",
            "time_remaining": 120
        })
        
        # Send initial greeting
        await websocket.send_json({
            "type": "message",
            "sender": "opponent",
            "content": "Hello! I'm ready to chat. Ask me anything!",
            "time_remaining": 120
        })
        
        # Game time (2 minutes)
        end_time = time.time() + 120
        
        # Game loop
        while True:
            time_remaining = max(0, int(end_time - time.time()))
            
            if time_remaining <= 0:
                await websocket.send_json({
                    "type": "time_up",
                    "message": "Time's up! Make your decision."
                })
                break
            
            # Wait for message with timeout
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                message_data = json.loads(data)
                print(f"Received: {message_data}")
                
                message_type = message_data.get("type", "")
                
                # Handle message
                if message_type == "message":
                    # Add a small delay to simulate typing
                    await asyncio.sleep(random.uniform(0.5, 1.5))
                    
                    # Send response
                    await websocket.send_json({
                        "type": "message",
                        "sender": "opponent",
                        "content": random.choice(AI_RESPONSES),
                        "time_remaining": time_remaining
                    })
                    
                # Handle decision (human or AI)
                elif message_type == "decision":
                    decision = message_data.get("decision")
                    
                    # Always AI in this simple version
                    correct = (decision == "ai")
                    
                    # Send result
                    await websocket.send_json({
                        "type": "game_result",
                        "correct": correct,
                        "score": 50 if correct else -25,
                        "opponent_type": "ai",
                        "new_level": 2 if correct else 1,
                        "new_xp": 50 if correct else 0
                    })
                    
                    # End the game
                    break
                    
                # Handle next duel request
                elif message_type == "next_duel":
                    # Restart the game
                    end_time = time.time() + 120
                    
                    await websocket.send_json({
                        "type": "game_start",
                        "level": 1,
                        "message": "New duel started!",
                        "time_remaining": 120
                    })
                    
                    await websocket.send_json({
                        "type": "message",
                        "sender": "opponent",
                        "content": "Hello again! Let's have another chat.",
                        "time_remaining": 120
                    })
                
            except asyncio.TimeoutError:
                # Just a timeout, continue loop
                continue
                
    except WebSocketDisconnect:
        print(f"Client disconnected: {player_id}")
    except Exception as e:
        print(f"Error in websocket: {e}")


if __name__ == "__main__":
    uvicorn.run("simple_game:app", host="0.0.0.0", port=8001)
