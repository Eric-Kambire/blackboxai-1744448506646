// mAnkInd - Simplified Game Logic for WebSocket Communication

// DOM Elements
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
const decisionPanel = document.getElementById("decision-panel");

// Game state
let gameActive = false;
let timeRemaining = 120;
let timerInterval = null;

// Connect to WebSocket
const socket = new WebSocket(`ws://localhost:8001/ws/player1`);

// Clear initial message when game starts
function clearWelcomeMessage() {
    const welcomeMessage = document.querySelector(".welcome-message");
    if (welcomeMessage) {
        welcomeMessage.innerHTML = "";
    }
}

// Display a message in the chat
function addMessage(sender, content) {
    console.log(`Adding message from ${sender}: ${content}`);
    
    const messageEl = document.createElement("div");
    messageEl.classList.add("message", sender.toLowerCase());
    
    const displayName = sender === "opponent" ? "OPPONENT" : "YOU";
    messageEl.innerHTML = `<span class="message-sender">${displayName}</span>: <span class="message-content">${content}</span>`;
    
    chatContainer.appendChild(messageEl);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Display a system message
function addSystemMessage(text) {
    console.log(`System message: ${text}`);
    
    const messageEl = document.createElement("div");
    messageEl.classList.add("system-message");
    messageEl.innerHTML = `<span class="message-system">>>> ${text}</span>`;
    
    chatContainer.appendChild(messageEl);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Update the timer display
function updateTimer(seconds) {
    timeRemaining = seconds;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Start the game
function startGame(level) {
    console.log(`Starting game at level ${level}`);
    
    clearWelcomeMessage();
    gameActive = true;
    gameStatus.textContent = "IN PROGRESS";
    
    // Enable decision buttons
    humanBtn.disabled = false;
    aiBtn.disabled = false;
    decisionPanel.classList.remove("opacity-50");
    
    // Clear any existing timer
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Set timer
    timeRemaining = 120;
    updateTimer(timeRemaining);
    
    // Start countdown
    timerInterval = setInterval(() => {
        if (timeRemaining > 0) {
            timeRemaining--;
            updateTimer(timeRemaining);
        } else {
            clearInterval(timerInterval);
            addSystemMessage("Time's up! Please make your decision.");
            gameStatus.textContent = "TIME'S UP!";
        }
    }, 1000);
    
    addSystemMessage(`Game started! You are at level ${level}.`);
}

// End the game
function endGame() {
    gameActive = false;
    gameStatus.textContent = "TIME'S UP!";
    
    if (timerInterval) {
        clearInterval(timerInterval);
    }
}

// Show game result
function showResult(data) {
    console.log("Game result:", data);
    
    // Update modal content
    const resultTitle = document.getElementById("result-title");
    resultTitle.textContent = data.correct ? "YOU WON!" : "YOU LOST!";
    
    // Set XP value
    xpValue.textContent = data.score > 0 ? `+${data.score}` : data.score;
    
    // Add details
    const resultDetails = document.getElementById("result-details");
    resultDetails.innerHTML = `
        <p>Your opponent was ${data.opponent_type.toUpperCase()}.</p>
        <p>Your new level: ${data.new_level}</p>
        <p>XP: ${data.new_xp}</p>
    `;
    
    // Show modal
    resultsModal.classList.remove("hidden");
}

// WebSocket event listeners
socket.onopen = () => {
    console.log("Connected to server");
    addSystemMessage("Connected to server. Waiting for game to start...");
};

socket.onmessage = (event) => {
    console.log("Received message:", event.data);
    
    try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
            case "game_start":
                startGame(data.level);
                break;
                
            case "message":
                addMessage(data.sender, data.content);
                if (data.time_remaining !== undefined) {
                    updateTimer(data.time_remaining);
                }
                break;
                
            case "time_up":
                endGame();
                addSystemMessage(data.message || "Time's up! Make your decision.");
                break;
                
            case "game_result":
                showResult(data);
                break;
                
            default:
                console.log("Unknown message type:", data.type);
        }
    } catch (error) {
        console.error("Error processing message:", error);
        addSystemMessage("Error processing server message");
    }
};

socket.onclose = () => {
    console.log("Disconnected from server");
    addSystemMessage("Connection to server closed");
    gameActive = false;
    gameStatus.textContent = "DISCONNECTED";
};

socket.onerror = (error) => {
    console.error("WebSocket error:", error);
    addSystemMessage("Connection error occurred");
};

// Event Listeners
messageForm.addEventListener("submit", (event) => {
    event.preventDefault();
    
    const message = messageInput.value.trim();
    if (message) {
        console.log("Sending message:", message);
        
        // Add message to chat immediately
        addMessage("YOU", message);
        
        // Send to server
        socket.send(JSON.stringify({
            type: "message",
            content: message
        }));
        
        // Clear input
        messageInput.value = "";
    }
});

humanBtn.addEventListener("click", () => {
    console.log("Selected: HUMAN");
    
    // Disable buttons
    humanBtn.disabled = true;
    aiBtn.disabled = true;
    
    // Send decision
    socket.send(JSON.stringify({
        type: "decision",
        decision: "human"
    }));
    
    addSystemMessage("You decided: HUMAN. Waiting for result...");
});

aiBtn.addEventListener("click", () => {
    console.log("Selected: AI");
    
    // Disable buttons
    humanBtn.disabled = true;
    aiBtn.disabled = true;
    
    // Send decision
    socket.send(JSON.stringify({
        type: "decision",
        decision: "ai"
    }));
    
    addSystemMessage("You decided: AI. Waiting for result...");
});

nextDuelBtn.addEventListener("click", () => {
    console.log("Next duel");
    
    // Hide modal
    resultsModal.classList.add("hidden");
    
    // Request new duel
    socket.send(JSON.stringify({
        type: "next_duel"
    }));
    
    addSystemMessage("Starting new duel...");
});

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
    gameStatus.textContent = "CONNECTING...";
    humanBtn.disabled = true;
    aiBtn.disabled = true;
    
    // Update welcome message
    const welcomeMessage = document.querySelector(".welcome-message");
    if (welcomeMessage) {
        welcomeMessage.innerHTML = `
            <p>>>_ NEXUS SYSTEM ONLINE</p>
            <p>>>_ INITIALIZING DUEL PROTOCOLS...</p>
            <p>>>_ WELCOME TO MANKIND - THE ULTIMATE TEST</p>
            <p>>>_ YOU HAVE 2 MINUTES TO DETERMINE: HUMAN OR AI?</p>
            <p>>>_ TYPE /help FOR COMMANDS</p>
            <p>>>_ CONNECTING...</p>
        `;
    }
});
