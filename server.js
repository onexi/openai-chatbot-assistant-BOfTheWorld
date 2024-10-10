
// Load environment variables
import dotenv from 'dotenv';
dotenv.config();
import OpenAI from 'openai';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';  // Use import in ES modules

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files from the 'public' directory

// In-memory storage for threads
let state = {
  assistant_id: null,
  assistant_name: null,
  threadId: null,
  messages: [],
};
let threads = {};  // Store threads

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Route to get the list of Assistants
app.post('/api/assistants', async (req, res) => {
  const assistant_id = req.body.name;

  try {
    const myAssistant = await openai.beta.assistants.retrieve(assistant_id);

    if (!myAssistant || !myAssistant.id) {
      throw new Error('Assistant not found');
    }

    state.assistant_id = myAssistant.id;
    state.assistant_name = myAssistant.name;
    res.status(200).json(state);
  } catch (error) {
    console.error('Error fetching assistants:', error);
    res.status(500).json({ error: 'Failed to fetch assistants' });
  }
});

// Route to create a new Thread
app.post('/api/threads', async (req, res) => {
  try {
    // Create a thread without parameters
    const myThread = await openai.beta.threads.create();
    console.log("This is the thread object: ", myThread);  // Log thread object for debugging

    if (!myThread || !myThread.id) {
      throw new Error('Thread creation failed');
    }

    state.threadId = myThread.id;
    state.messages = [];
    threads[state.threadId] = [];  // Initialize empty messages for the thread
    res.json({ threadId: state.threadId });
  } catch (error) {
    console.error('Error creating thread:', error.message);
    res.status(500).json({ error: 'Failed to create thread. Check logs for details.' });
  }
});

// Route to send a message and run the Assistant
app.post('/api/run', async (req, res) => {
  const { message, threadId, assistantId } = req.body;

  if (!threadId) {
    return res.status(400).json({ error: 'Thread ID is required' });
  }

  if (!message || message.trim() === "") {
    return res.status(400).json({ error: 'Message content is required' });
  }

  if (!assistantId) {
    return res.status(400).json({ error: 'Assistant ID is required' });
  }

  console.log(`Received message: "${message}" for thread ID: ${threadId}`);

  state.messages.push({ role: 'user', content: message });

  try {
    // Step 1: Send the user's message
    const messageResponse = await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message,
    });

    console.log('Message API Response:', messageResponse);

    if (!messageResponse.id) {
      throw new Error(`Message creation failed: ${messageResponse.statusText}`);
    }

    // Step 2: Run the assistant (create and poll the run)
    const runResponse = await openai.beta.threads.runs.createAndPoll(threadId, {
      assistant_id: assistantId,  // Pass the assistant ID
    });

    console.log('Run API Response:', runResponse);

    if (!runResponse || !runResponse.id) {
      throw new Error(`Run creation failed or incomplete: ${runResponse.statusText || 'No run ID returned'}`);
    }

// Step 3: Fetch the latest messages in the thread after the assistant's response
  const messagesResponse = await openai.beta.threads.messages.list(threadId);

  if (messagesResponse && messagesResponse.data) {
    state.messages = [...state.messages, ...messagesResponse.data];  // Update messages with assistant's response
    res.json({ messages: state.messages });
  } else {
    throw new Error('Failed to retrieve messages after assistant run.');
  }

  } catch (error) {
    console.error('Error running assistant:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to run assistant. Check logs for details.' });
  }
});


// Backend route to fetch messages for a specific thread
app.get('/api/chat/threads/:threadId', async (req, res) => {
  const { threadId } = req.params;

  try {
    const threadMessages = threads[threadId];  // Assuming 'threads' is a stored object with thread data

    if (!threadMessages) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    res.json({ messages: threadMessages });
  } catch (error) {
    console.error('Error fetching thread messages:', error);
    res.status(500).json({ error: 'Failed to fetch thread messages.' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});