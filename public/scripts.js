let state = {
  assistant_id: null,  // Assistant ID
  threadId: null,      // Thread ID to be used once a thread is created
  messages: [],        // Array to store messages for the active thread
  threads: [],         // Array to store previous threads
};

// Function to create a new thread
async function createNewThread() {
    const assistantId = document.getElementById('assistantId').value.trim();

    // Validate the Assistant ID
    if (!assistantId) {
        alert('Please provide an Assistant ID.');
        return;
    }

    state.assistant_id = assistantId;

    try {
        // Send request to the server to create a new thread
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ assistantId, promptMessage: "", threadId: null }), // Send empty prompt and no threadId to create a new thread
        });

        const data = await response.json();
        state.threadId = data.threadId;  // Store the newly created thread ID
        state.messages = [];  // Reset messages for the new thread

        // Update the previous threads list
        addThreadToList(state.threadId);

        // Clear chat box and display system message once
        document.getElementById('chatBox').innerHTML = '';
        appendMessage('system', `New thread created with ID: ${state.threadId}`);

    } catch (error) {
        console.error('Error:', error);
        appendMessage('system', 'An error occurred while creating a new thread.');
    }
}

// Function to send a user prompt to the existing thread
async function sendPrompt(event) {
    // Prevent form submission (including "Enter" key press)
    if (event) event.preventDefault();

    const promptMessage = document.getElementById('promptMessage').value.trim();

    // Validate input and ensure threadId exists
    if (!promptMessage) {
        alert('Please enter a prompt message.');
        return;
    }

    if (!state.threadId) {
        alert('Please create a new thread first.');
        return;
    }

    // Clear the input field
    document.getElementById('promptMessage').value = '';

    try {
        // Send the user prompt to the existing thread
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ assistantId: state.assistant_id, promptMessage, threadId: state.threadId }),
        });

        const data = await response.json();

        // Append the new messages (both user and assistant) from the API response
        const newMessages = data.messages.slice(state.messages.length);
        newMessages.forEach(message => {
            appendMessage(message.role, message.content);
        });

        // Update the state with the new messages
        state.messages = [...state.messages, ...newMessages]; // Merge old and new messages

    } catch (error) {
        console.error('Error:', error);
        appendMessage('system', 'An error occurred while processing your request.');
    }
}

// Function to append messages to the chat box
function appendMessage(role, content) {
    const chatBox = document.getElementById('chatBox');
    const messageElement = document.createElement('div');
    messageElement.classList.add(role === 'user' ? 'user-message' : 'assistant-message');
    messageElement.textContent = content;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;  // Scroll to the bottom
}

// Function to add a thread to the list on the left
function addThreadToList(threadId) {
    const threadList = document.getElementById('thread-list');
    const threadElement = document.createElement('div');
    threadElement.classList.add('thread-item');
    threadElement.textContent = `Thread ID: ${threadId}`;
    threadElement.onclick = function () {
        loadThread(threadId);  // Fetch and display the selected thread
    };
    threadList.appendChild(threadElement);

    // Store the thread ID in the state for future reference
    state.threads.push(threadId);
}

// Function to load a previous thread when clicked
async function loadThread(threadId) {
    console.log(`Loading thread ${threadId}`);

    try {
        // Fetch the messages for the selected thread from the server
        const response = await fetch(`/api/chat/threads/${threadId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();

        // Clear the chat box and load the messages of the selected thread
        document.getElementById('chatBox').innerHTML = '';
        appendMessage('system', `Loaded thread: ${threadId}`);

        // Append each message from the thread to the chat box
        data.messages.forEach(message => {
            appendMessage(message.role, message.content);
        });

        // Update the state with the loaded messages and thread ID
        state.messages = data.messages;
        state.threadId = threadId;

    } catch (error) {
        console.error('Error:', error);
        appendMessage('system', 'An error occurred while loading the thread.');
    }
}

// Event listeners for buttons and forms
document.getElementById('createThreadButton').addEventListener('click', createNewThread);
document.getElementById('promptForm').addEventListener('submit', sendPrompt);

// Capture the Enter keypress on the input field and submit the form without page reload
document.getElementById('promptMessage').addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();  // Prevent the form from submitting normally
        sendPrompt(event);  // Call sendPrompt manually
    }
});
