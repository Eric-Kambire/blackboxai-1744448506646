from fastapi import FastAPI, Request, WebSocket
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uvicorn
from pathlib import Path

app = FastAPI(title="WebSocket Test")

# Set up templates
templates = Jinja2Templates(directory="templates_test")

# Create a directory for test templates
Path("templates_test").mkdir(exist_ok=True)

@app.get("/", response_class=HTMLResponse)
async def get_test_page(request: Request):
    """Serve the test page"""
    return templates.TemplateResponse("test.html", {"request": request})

@app.websocket("/ws/test")
async def websocket_test(websocket: WebSocket):
    print("WebSocket connection request received")
    await websocket.accept()
    print("WebSocket connection accepted")
    
    try:
        # Send a message to the client
        await websocket.send_json({"message": "Hello from server!"})
        print("Server sent: Hello from server!")
        
        # Keep the connection open and echo messages back
        while True:
            data = await websocket.receive_text()
            print(f"Server received: {data}")
            
            # Echo the message back
            await websocket.send_json({"message": f"Echo: {data}"})
            print(f"Server sent: Echo: {data}")
            
    except Exception as e:
        print(f"WebSocket error: {e}")
        
    finally:
        print("WebSocket connection closed")

if __name__ == "__main__":
    # Create the test HTML file
    test_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>WebSocket Test</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            #log { border: 1px solid #ccc; padding: 10px; height: 300px; overflow-y: scroll; margin-bottom: 10px; }
            input[type="text"] { width: 80%; padding: 5px; }
            button { padding: 5px 10px; }
        </style>
    </head>
    <body>
        <h1>WebSocket Test</h1>
        <div id="log"></div>
        <input type="text" id="message" placeholder="Type a message...">
        <button id="send">Send</button>
        
        <script>
            const log = document.getElementById('log');
            const messageInput = document.getElementById('message');
            const sendButton = document.getElementById('send');
            
            // Add a message to the log
            function addLog(message, direction) {
                const div = document.createElement('div');
                div.textContent = `${direction}: ${message}`;
                div.style.color = direction === 'SENT' ? 'blue' : 'green';
                log.appendChild(div);
                log.scrollTop = log.scrollHeight;
            }
            
            // Create WebSocket connection
            const socket = new WebSocket('ws://localhost:8001/ws/test');
            
            // Connection opened
            socket.addEventListener('open', (event) => {
                addLog('Connection established', 'INFO');
            });
            
            // Listen for messages
            socket.addEventListener('message', (event) => {
                const data = JSON.parse(event.data);
                addLog(data.message, 'RECEIVED');
            });
            
            // Connection closed
            socket.addEventListener('close', (event) => {
                addLog('Connection closed', 'INFO');
            });
            
            // Connection error
            socket.addEventListener('error', (event) => {
                addLog('Connection error', 'ERROR');
                console.error('WebSocket error:', event);
            });
            
            // Send message
            function sendMessage() {
                const message = messageInput.value;
                if (message) {
                    socket.send(message);
                    addLog(message, 'SENT');
                    messageInput.value = '';
                }
            }
            
            // Send button click
            sendButton.addEventListener('click', sendMessage);
            
            // Send on Enter key
            messageInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    sendMessage();
                }
            });
        </script>
    </body>
    </html>
    """
    
    # Create test directory and save the HTML file
    Path("templates_test").mkdir(exist_ok=True)
    with open("templates_test/test.html", "w") as f:
        f.write(test_html)
    
    # Run the server
    uvicorn.run(app, host="0.0.0.0", port=8001)
