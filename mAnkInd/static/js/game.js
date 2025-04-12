// mAnkInd - Game Logic and WebSocket Communication

const playerId = "player1"; // This should be dynamically assigned in a real scenario
const socket = new WebSocket(`ws://localhost:8001/ws/${playerId}`);

const chatContainer = document.getElementById("chat-container");
const messageInput = document.getElementById("message-input");
const messageForm = document.getElementById("message-form");
const timerDisplay = document.getElementById("timer");
const gameStatus = document.getElementById("game-status");
const resultsModal = document.getElementById("results-modal");
const xpValue = document.getElementById("xp-value");
const nextDuelBtn = document.getElementById("next-duel-btn");
const humanBtn = document.getElementById("human-btn");
const aiBtn = document.getElementById("ai-btn");

let timeRemaining = 120; // 2 minutes
let gameActive = false;

// WebSocket event handlers
socket.onopen = () => {
    console.log("Connected to the server");
    // Connection is established, but we're waiting for the game to start
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("Received message from server:", data);
    
    // Clear the "ESTABLISHING CONNECTION..." message when we get the first message
    const welcomeMessage = document.querySelector(".welcome-message");
    if (welcomeMessage) {
        welcomeMessage.innerHTML = "";
    }
    
    handleServerMessage(data);
};

socket.onclose = () => {
    console.log("Disconnected from the server");
};

socket.onerror = (error) => {
    console.error("WebSocket error:", error);
};

// Handle incoming messages from the server
function handleServerMessage(data) {
    console.log("Handling message type:", data.type);
    
    switch (data.type) {
        case "game_start":
            startGame(data.level);
            break;
        case "message":
            displayMessage(data.sender, data.content);
            updateTimer(data.time_remaining);
            
            // Enable buttons after receiving the first message
            if (humanBtn.disabled) {
                humanBtn.disabled = false;
                aiBtn.disabled = false;
                document.getElementById("decision-panel").classList.remove("opacity-50");
            }
            break;
        case "time_up":
            endGame();
            break;
        case "game_result":
            showResult(data);
            break;
        default:
            console.log("Unknown message type:", data.type);
    }
}

// Start the game
function startGame(level) {
    console.log("Game started with level:", level);
    gameActive = true;
    gameStatus.textContent = "IN PROGRESS";
    timeRemaining = 120;
    updateTimer(timeRemaining);
    startTimer();
    
    // Enable the decision buttons
    humanBtn.disabled = false;
    aiBtn.disabled = false;
    document.getElementById("decision-panel").classList.remove("opacity-50");
}

// Update the timer display
function updateTimer(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Start the countdown timer
function startTimer() {
    const timerInterval = setInterval(() => {
        if (timeRemaining > 0) {
            timeRemaining--;
            updateTimer(timeRemaining);
        } else {
            clearInterval(timerInterval);
            socket.send(JSON.stringify({ type: "decision", decision: null }));
        }
    }, 1000);
}

// Display a message in the chat
function displayMessage(sender, content) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", sender);
    messageElement.innerHTML = `<span class="message-sender">${sender}</span>: <span class="message-content">${content}</span>`;
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight; // Scroll to the bottom
}

// End the game
function endGame() {
    gameActive = false;
    gameStatus.textContent = "TIME'S UP!";
    humanBtn.disabled = false;
    aiBtn.disabled = false;
}

// Show the result modal
function showResult(data) {
    resultsModal.classList.remove("hidden");
    xpValue.textContent = data.score > 0 ? `+${data.score}` : data.score;
    const resultTitle = document.getElementById("result-title");
    resultTitle.textContent = data.correct ? "YOU WON!" : "YOU LOST!";
}

// Handle message form submission
messageForm.onsubmit = (event) => {
    event.preventDefault();
    const message = messageInput.value;
    console.log("Message submitted:", message);
    
    // Always allow sending messages after the game has loaded
    if (message) {
        console.log("Sending message to server:", { type: "message", content: message });
        socket.send(JSON.stringify({ type: "message", content: message }));
        messageInput.value = "";
        displayMessage("YOU", message);
    }
};

// Handle decision buttons
humanBtn.onclick = () => {
    if (gameActive) {
        socket.send(JSON.stringify({ type: "decision", decision: "human" }));
        humanBtn.disabled = true;
        aiBtn.disabled = true;
    }
};

aiBtn.onclick = () => {
    if (gameActive) {
        socket.send(JSON.stringify({ type: "decision", decision: "ai" }));
        humanBtn.disabled = true;
        aiBtn.disabled = true;
    }
};

// Handle next duel button
nextDuelBtn.onclick = () => {
    resultsModal.classList.add("hidden");
    socket.send(JSON.stringify({ type: "next_duel" }));
};
