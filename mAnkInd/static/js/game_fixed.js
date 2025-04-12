// mAnkInd - Game Logic and WebSocket Communication (Fixed Version)

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
const decisionPanel = document.getElementById("decision-panel");

let timeRemaining = 120; // 2 minutes
let gameActive = false;
let timerInterval;

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    // Clear welcome message (especially the "ESTABLISHING CONNECTION..." part)
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
    
    // Initialize UI states
    gameStatus.textContent = "WAITING";
    humanBtn.disabled = true;
    aiBtn.disabled = true;
});

// WebSocket event handlers
socket.onopen = () => {
    console.log("Connected to the server");
    
    // Add system message
    displaySystemMessage("Connected to the server successfully");
    
    // Update welcome message
    const welcomeMessage = document.querySelector(".welcome-message");
    if (welcomeMessage) {
        welcomeMessage.innerHTML = `
            <p>>>_ NEXUS SYSTEM ONLINE</p>
            <p>>>_ DUEL PROTOCOLS ACTIVATED</p>
            <p>>>_ WELCOME TO MANKIND - THE ULTIMATE TEST</p>
            <p>>>_ WAITING FOR OPPONENT...</p>
        `;
    }
};

socket.onmessage = (event) => {
    console.log("Raw message received:", event.data);
    
    try {
        const data = JSON.parse(event.data);
        console.log("Parsed message:", data);
        
        // Clear the welcome message if it's still there
        const welcomeMessage = document.querySelector(".welcome-message");
        if (welcomeMessage) {
            welcomeMessage.innerHTML = "";
        }
        
        handleServerMessage(data);
    } catch (error) {
        console.error("Error parsing message:", error);
        displaySystemMessage("Error processing server message");
    }
};

socket.onclose = () => {
    console.log("Disconnected from the server");
    displaySystemMessage("Connection to server closed");
    gameActive = false;
    gameStatus.textContent = "DISCONNECTED";
};

socket.onerror = (error) => {
    console.error("WebSocket error:", error);
    displaySystemMessage("Connection error occurred");
};

// Handle incoming messages from the server
function handleServerMessage(data) {
    console.log("Handling message type:", data.type);
    
    switch (data.type) {
        case "game_start":
            startGame(data.level);
            displaySystemMessage(`Duel started at level ${data.level}! You have 2 minutes.`);
            break;
            
        case "message":
            displayMessage(data.sender, data.content);
            if (data.time_remaining !== undefined) {
                updateTimer(data.time_remaining);
            }
            break;
            
        case "time_up":
            endGame();
            displaySystemMessage(data.message || "Time's up! Make your decision.");
            break;
            
        case "game_result":
            showResult(data);
            break;
            
        default:
            console.log("Unknown message type:", data.type);
            displaySystemMessage(`Received unknown message type: ${data.type}`);
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
    decisionPanel.classList.remove("opacity-50");
}

// Update the timer display
function updateTimer(seconds) {
    timeRemaining = seconds;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Start the countdown timer
function startTimer() {
    // Clear any existing timer
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    timerInterval = setInterval(() => {
        if (timeRemaining > 0) {
            timeRemaining--;
            updateTimer(timeRemaining);
        } else {
            clearInterval(timerInterval);
            endGame();
            displaySystemMessage("Time's up! Make your decision: Human or AI?");
        }
    }, 1000);
}

// Display a system message in the chat
function displaySystemMessage(message) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("system-message");
    messageElement.innerHTML = `<span class="message-system">>> ${message}</span>`;
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight; // Scroll to the bottom
}

// Display a message in the chat
function displayMessage(sender, content) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", sender.toLowerCase());
    
    const senderDisplay = sender.toUpperCase() === "OPPONENT" ? "OPPONENT" : "YOU";
    messageElement.innerHTML = `
        <span class="message-sender">${senderDisplay}</span>: 
        <span class="message-content">${content}</span>
    `;
    
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight; // Scroll to the bottom
}

// End the game
function endGame() {
    gameActive = false;
    gameStatus.textContent = "TIME'S UP!";
    
    // Clear the timer
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Ensure decision buttons are enabled
    humanBtn.disabled = false;
    aiBtn.disabled = false;
    decisionPanel.classList.remove("opacity-50");
}

// Show the result modal
function showResult(data) {
    resultsModal.classList.remove("hidden");
    
    const resultTitle = document.getElementById("result-title");
    resultTitle.textContent = data.correct ? "YOU WON!" : "YOU LOST!";
    
    xpValue.textContent = data.score > 0 ? `+${data.score}` : data.score;
    
    const resultDetails = document.getElementById("result-details");
    resultDetails.innerHTML = `
        <p>Your opponent was ${data.opponent_type.toUpperCase()}.</p>
        <p>You've earned ${data.score} XP.</p>
        <p>Your new level: ${data.new_level}</p>
    `;
}

// Handle message form submission
messageForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = messageInput.value.trim();
    
    console.log("Message submitted:", message);
    
    if (message) {
        console.log("Sending message to server");
        
        // Display the user's message immediately
        displayMessage("YOU", message);
        
        // Send to server
        try {
            socket.send(JSON.stringify({ 
                type: "message", 
                content: message 
            }));
            console.log("Message sent successfully");
        } catch (error) {
            console.error("Error sending message:", error);
            displaySystemMessage("Error sending message. Please try again.");
        }
        
        // Clear input
        messageInput.value = "";
    }
});

// Handle decision buttons
humanBtn.addEventListener('click', () => {
    console.log("Human button clicked");
    makeDecision("human");
});

aiBtn.addEventListener('click', () => {
    console.log("AI button clicked");
    makeDecision("ai");
});

function makeDecision(decision) {
    console.log(`Decision made: ${decision}`);
    
    // Disable buttons to prevent multiple submissions
    humanBtn.disabled = true;
    aiBtn.disabled = true;
    
    // Send decision to server
    try {
        socket.send(JSON.stringify({ 
            type: "decision", 
            decision: decision 
        }));
        console.log("Decision sent to server");
        displaySystemMessage(`You've decided your opponent is ${decision.toUpperCase()}. Waiting for results...`);
    } catch (error) {
        console.error("Error sending decision:", error);
        displaySystemMessage("Error submitting your decision. Please try again.");
        
        // Re-enable buttons if there was an error
        humanBtn.disabled = false;
        aiBtn.disabled = false;
    }
}

// Handle next duel button
nextDuelBtn.addEventListener('click', () => {
    console.log("Next duel button clicked");
    resultsModal.classList.add("hidden");
    
    try {
        socket.send(JSON.stringify({ type: "next_duel" }));
        console.log("Next duel request sent");
        displaySystemMessage("Preparing next duel...");
    } catch (error) {
        console.error("Error requesting next duel:", error);
        displaySystemMessage("Error starting next duel. Please refresh the page.");
    }
});

// For debugging - add a global error handler
window.addEventListener('error', (event) => {
    console.error("Global error:", event.error);
    displaySystemMessage(`Error occurred: ${event.error.message}`);
});
