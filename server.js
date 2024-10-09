import express from 'express';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';
import path from 'path';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const __dirname = path.resolve();
const app = express();
const PORT = process.env.PORT || 3000;

// In-memory storage for threads (for demo purposes)
const threads = {};

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the main HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API route to handle creating a new thread or continuing an existing one
app.post('/api/chat', async (req, res) => {
    const { assistantId, promptMessage, threadId } = req.body;
    let messages = [];

    try {
        if (threadId && threads[threadId]) {
            // Continue an existing thread
            messages = threads[threadId]; // Load existing thread messages
        } else {
            // Start a new thread
            const newThreadId = uuidv4(); // Generate a unique thread ID
            messages = [{ role: 'system', content: 'You are a helpful assistant.' }];
            threads[newThreadId] = messages; // Store new thread in memory
            res.locals.threadId = newThreadId; // Pass the new thread ID to the response
        }

        // Add the user's prompt to the thread if there's a message
        if (promptMessage) {
            messages.push({ role: 'user', content: promptMessage });
        }

        // Send the entire conversation history to OpenAI's API
        const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',  // Use 'gpt-4' if you're using GPT-4
                messages: messages,      // Send the entire conversation (user, assistant, system)
            }),
        });

        const assistantData = await openAiResponse.json();
        const assistantReply = assistantData.choices[0].message.content;

        // Add assistant's response to the conversation
        if (assistantReply) {
            messages.push({ role: 'assistant', content: assistantReply });
        }

        // Save the updated thread in memory
        threads[res.locals.threadId || threadId] = messages;

        // Send back the messages along with the thread ID
        res.json({ messages, threadId: res.locals.threadId || threadId });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred while processing your request.' });
    }
});

// API route to fetch messages for a specific thread
app.get('/api/chat/threads/:threadId', async (req, res) => {
    const { threadId } = req.params;

    try {
        // Fetch the messages for the thread from in-memory storage
        const threadMessages = threads[threadId];

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
    console.log(`Server is running on port ${PORT}`);
});
