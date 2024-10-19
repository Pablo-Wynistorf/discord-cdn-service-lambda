import express from 'express';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import cors from 'cors';
import FormData from 'form-data';
import axios from 'axios';
import serverless from 'serverless-http';

const CDN_URL = process.env.CDN_URL;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

const app = express();
const upload = multer({ dest: '/tmp/uploads/' });

// Middleware
app.use(express.json());
app.use(cors(
    {
        origin: CDN_URL,
        methods: ["*"],
        allowedHeaders: ['*']
    }
));

// Serve static files
app.use('/', express.static(path.join(__dirname, 'public')));

const checkFileUpload = async (req, res, next) => {
    const requestSize = req.headers['content-length'];
    if (requestSize > 500 * 1024 * 1024) {
        return res.status(460).json({ message: 'You cannot upload more than 500MB of data per single request' });
    }
    next();
};

// Function to send files to Discord
const sendFileToDiscord = async (filePath, fileName) => {
    const url = `https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages`;
    const formData = new FormData();
    formData.append('files', fs.createReadStream(filePath), fileName);
    
    const response = await axios.post(url, formData, {
        headers: {
            'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
            ...formData.getHeaders()
        }
    });
    
    return response.data.id;
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

        const messageIds = [];
        for (const file of files) {
            const messageId = await sendFileToDiscord(file.path, file.originalname);
            messageIds.push({ [file.originalname]: CDN_URL + "/a/" + messageId });
            fs.unlink(file.path, err => {
                if (err) {
                    console.error(`Error deleting file ${file.path}:`, err);
                }
            });
        }
        res.json({ cdnLinks: messageIds });
    } catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Attachment retrieval endpoint
app.get("/a/:messageId", async (req, res) => {
    try {
        const messageId = req.params.messageId;
        const url = `https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages/${messageId}`;
        
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bot ${DISCORD_BOT_TOKEN}`
            }
        });

        const message = response.data;
        if (!message || message.attachments.length === 0) {
            return res.redirect('/');
        }

        const attachment = message.attachments[0];
        if (attachment.content_type.includes('text/html')) {
            const textResponse = await axios.get(attachment.url);
            res.send(textResponse.data);
            return;
        }

        return res.redirect(attachment.url);
    } catch (err) {
        console.error('Error retrieving attachment:', err);
        return res.redirect('/');
    }
});

exports.handler = serverless(app);
