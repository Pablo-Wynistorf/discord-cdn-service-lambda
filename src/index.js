const express = require('express');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');
const serverless = require('serverless-http');
require('dotenv').config();

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

const app = express();
const upload = multer({ dest: '/tmp/uploads/' });

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.login(DISCORD_BOT_TOKEN);

// Log in Discord bot and handle message cache clearing
client.on('ready', () => {
    console.log(`Logged in as application: ${client.user.tag}!`);
    setInterval(async () => {
        try {
            const channel = await client.channels.fetch(DISCORD_CHANNEL_ID);
            await channel.messages.cache.clear();
        } catch (err) {
            console.error('Error clearing cache:', err);
        }
    }, 1 * 60 * 1000);
});

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files
app.use('/', express.static(path.join(__dirname, 'public/home')));
app.use('/links', express.static(path.join(__dirname, 'public/links')));

const checkFileUpload = async (req, res, next) => {
    const requestSize = req.headers['content-length'];
    if (requestSize > 500 * 1024 * 1024) {
        return res.status(460).json({ message: 'You cannot upload more than 500MB of data per single request' });
    }
    next();
};

// File upload endpoint
app.post("/api/upload", checkFileUpload, upload.array("files"), async (req, res) => {
    try {
        const files = req.files;

        if (!files || files.length === 0) {
            return res.status(400).send("Please upload at least one file");
        }

        for (const file of files) {
            if (file.size > 25 * 1024 * 1024) {
                return res.status(461).json({ message: `The file '${file.originalname}' exceeds the 25MB limit per file` });
            }
        }

        const channel = await client.channels.fetch(DISCORD_CHANNEL_ID);
        if (!channel) {
            return res.status(500).send('Internal Server Error');
        }

        const messageIds = [];
        for (const file of files) {
            const message = await channel.send({ files: [{ attachment: file.path, name: file.originalname }] });
            messageIds.push({ [file.originalname]: `${message.id}` });
            fs.unlink(file.path, err => {
                if (err) {
                    console.error(`Error deleting file ${file.path}:`, err);
                }
            });
        }
        res.json({ cdnLinks: messageIds });
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

// Attachment retrieval endpoint
app.get("/attachment/:messageId", async (req, res) => {
    try {
        const messageId = req.params.messageId;
        const channel = await client.channels.fetch(DISCORD_CHANNEL_ID);
        const message = await channel.messages.fetch(messageId);
        if (!message || message.attachments.size === 0) {
            return res.redirect('/');
        }

        const attachment = message.attachments.first();
        if (attachment.contentType.includes('text/html')) {
            const response = await fetch(attachment.url);
            const text = await response.text();
            res.send(text);
            return;
        }

        return res.redirect(attachment.url);
    } catch (err) {
        return res.redirect('/');
    }
});

exports.handler = serverless(app);
