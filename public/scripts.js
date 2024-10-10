// Initiate the state object with the assistant_id and threadId as null and an empty array for messages
let state = {
    assistant_id: null,
    assistant_name: null,
    threadId: null,
    messages: [],
  };
  async function getAssistant(){
    let name = document.getElementById('assistant_name').value;
    console.log(`assistant_id: ${name}`)
    const response = await fetch('/api/assistants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: name }),
    });
    state = await response.json();  // the state object is updated with the response from the server
    //writeToMessages(`Assistant ${state.assistant_name} is ready to chat`);
    appendMessage('assistant', `Assistant ${state.assistant_name} is ready to chat`);
    console.log(`back from fetch with state: ${JSON.stringify(state)}`)
  }
  
  async function getThread() {
    const assistantId = document.getElementById('assistantId').value.trim();
    const threadName = document.getElementById('threadName').value.trim();
  
    if (!assistantId || !threadName) {
      alert('Please provide both an Assistant ID and a thread name.');
      return;
    }
  
    state.assistant_id = assistantId;
  
    try {
      const response = await fetch('/api/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assistantId, threadId: null }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create thread.');
      }
  
      state.threadId = data.threadId;
      state.messages = [];
  
      // Ensure state.threads exists before pushing
      if (!state.threads) {
        state.threads = [];
      }
      
      state.threads.push({ threadId: state.threadId, threadName });
  
      document.getElementById('chatBox').innerHTML = '';
      appendMessage('system', `New thread "${threadName}" created with ID: ${state.threadId}`);
      addThreadToList(state.threadId, threadName);
  
    } catch (error) {
      console.error('Error:', error);
      appendMessage('system', 'An error occurred while creating a new thread.');
    }
  }
  
  async function getResponse(){
  
  // Enter Code Here


  
  }
  async function writeToMessages(message){
    let messageDiv = document.getElementById("message-container");
    messageDiv.innerHTML = message;
    document.getElementById('messages').appendChild(messageDiv);
  }
  
  async function sendPrompt(event) {
    if (event) event.preventDefault();  // Prevent page reload
  
    const promptMessage = document.getElementById('promptMessage').value.trim();
    const assistantId = document.getElementById('assistantId').value.trim();  // Get the assistant_id from input
  
    if (!promptMessage) {
      alert('Please enter a prompt message.');
      return;
    }
  
    if (!state.threadId) {
      alert('Please create a new thread first.');
      return;
    }
  
    if (!assistantId) {
      alert('Please enter a valid assistant ID.');
      return;
    }
  
    // Clear the input field
    document.getElementById('promptMessage').value = '';
  
    // Append the user's message to the chatbox immediately (before getting the assistant's response)
    appendMessage('user', promptMessage);
  
    // Track the last message ID before the assistant responds
    const lastMessageId = state.messages.length > 0 ? state.messages[state.messages.length - 1].id : null;
  
    try {
      // Send the user prompt to the existing thread
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assistantId: state.assistant_id,  // Send the provided assistant_id
          message: promptMessage,
          threadId: state.threadId
        }),
      });
  
      const data = await response.json();
  
      // Ensure the response contains the 'messages' array
      if (data.messages && Array.isArray(data.messages)) {
        const newMessages = data.messages.filter(message => {
          // Filter out messages already displayed by comparing their IDs
          return !state.messages.some(existingMessage => existingMessage.id === message.id) && message.role === 'assistant';
        });
  
        // Append the assistant's new response
        newMessages.forEach(message => {
          appendMessage('assistant', message.content);  // Append only assistant's messages
        });
  
        // Update the state with the new messages
        state.messages = [...state.messages, ...newMessages];
      } else {
        console.error('No messages array in the response:', data);
        appendMessage('system', 'No messages returned from the assistant.');
      }
  
    } catch (error) {
      console.error('Error:', error);
      appendMessage('system', 'An error occurred while processing your request.');
    }
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

        // Set the thread name in the input box for possible updates
        const thread = state.threads.find(t => t.threadId === threadId);
        document.getElementById('threadName').value = thread.threadName;

    } catch (error) {
        console.error('Error:', error);
        appendMessage('system', 'An error occurred while loading the thread.');
    }
}

function appendMessage(role, content) {
    const chatBox = document.getElementById('chatBox');
    const messageElement = document.createElement('div');
    messageElement.classList.add(role === 'user' ? 'user-message' : 'assistant-message');
  
    // Handle content being an array of objects
    if (Array.isArray(content)) {
      content.forEach(item => {
        if (item.type === 'text' && item.text && item.text.value) {
          messageElement.textContent += item.text.value + ' ';  // Extract and display the 'value' field
        } else if (item.value) {
          // If directly a value field exists, display it
          messageElement.textContent += item.value + ' ';
        } else {
          console.error('Unsupported content format:', item);
          messageElement.textContent += '[Error: Unsupported content format] ';
        }
      });
    } else if (typeof content === 'object' && content.value) {
      // If content is a single object with a value field
      messageElement.textContent = content.value;
    } else if (typeof content === 'string') {
      // If content is a plain string
      messageElement.textContent = content;
    } else {
      console.error('Unsupported content format:', content);
      messageElement.textContent = '[Error: Unsupported content format]';
    }
  
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;  // Scroll to the bottom of the chatbox
  }  
  
  // Function to add a thread to the list on the left
  function addThreadToList(threadId, threadName) {
    const threadList = document.getElementById('thread-list');
    const threadElement = document.createElement('div');
    threadElement.classList.add('thread-item');
    threadElement.textContent = `Thread: ${threadName}`;
    threadElement.onclick = function () {
        loadThread(threadId);  // Fetch and display the selected thread
    };
    threadList.appendChild(threadElement);
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

        // Set the thread name in the input box for possible updates
        const thread = state.threads.find(t => t.threadId === threadId);
        document.getElementById('threadName').value = thread.threadName;

    } catch (error) {
        console.error('Error:', error);
        appendMessage('system', 'An error occurred while loading the thread.');
    }
}

// Function to update the thread name
function updateThreadName() {
    const newThreadName = document.getElementById('threadName').value.trim();
    
    // Validate the new thread name
    if (!newThreadName) {
        alert('Please enter a new thread name.');
        return;
    }

    // Update the thread name in the state
    const thread = state.threads.find(t => t.threadId === state.threadId);
    if (thread) {
        thread.threadName = newThreadName;

        // Update the previous thread list display
        document.getElementById('thread-list').innerHTML = '';  // Clear and re-render the list
        state.threads.forEach(t => {
            addThreadToList(t.threadId, t.threadName);
        });

        appendMessage('system', `Thread name updated to "${newThreadName}".`);
    }
}

async function loadPreviousThread(threadId) {
    try {
      // Clear the state and chatbox before loading the previous thread
      clearChatbox();
      clearState();
  
      // Fetch the selected thread's messages from the server
      const response = await fetch(`/api/chat/threads/${threadId}`);
      const data = await response.json();
  
      if (data && data.messages) {
        // Display each message from the selected thread
        data.messages.forEach(message => {
          appendMessage(message.role, message.content);
        });
  
        // Update the state to reflect the current thread and its messages
        state.threadId = threadId;
        state.messages = data.messages;
  
      } else {
        console.error('No messages found for this thread.');
      }
  
    } catch (error) {
      console.error('Error loading previous thread:', error);
    }
  }

  function clearState() {
    state.threadId = null;  // Reset thread ID
    state.messages = [];    // Reset the stored messages
  }
  
  function clearChatbox() {
    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML = '';  // Remove all existing messages from the chatbox
  }
  
// Event listeners for buttons and forms
document.getElementById('createThreadButton').addEventListener('click', getThread);
document.getElementById('updateThreadNameButton').addEventListener('click', updateThreadName);
document.getElementById('promptForm').addEventListener('submit', sendPrompt);

// Capture the Enter keypress on the input field and submit the form without page reload
document.getElementById('promptMessage').addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();  // Prevent the form from submitting normally
        sendPrompt(event);  // Call sendPrompt manually
    }
});