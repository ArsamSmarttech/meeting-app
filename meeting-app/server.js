const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ذخیره داده‌ها در حافظه
let meetingsData = [];
let clients = [];

// پورت از محیط یا 8080
const PORT = process.env.PORT || 8080;

// سرویس فایل‌های استاتیک
app.use(express.static('public'));
app.use(express.json());

// API برای دریافت داده‌ها
app.get('/api/meetings', (req, res) => {
    res.json(meetingsData);
});

// API برای سلامت سرور
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        clients: clients.length, 
        meetings: meetingsData.length 
    });
});

// WebSocket
wss.on('connection', (ws) => {
    clients.push(ws);
    console.log(`✅ کاربر جدید متصل شد! (${clients.length} نفر آنلاین)`);

    // ارسال داده‌های فعلی به کاربر جدید
    ws.send(JSON.stringify({
        type: 'init',
        data: meetingsData
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'add') {
                meetingsData.push(data.meeting);
                broadcast({ type: 'update', data: meetingsData });
            }
            else if (data.type === 'delete') {
                meetingsData.splice(data.index, 1);
                broadcast({ type: 'update', data: meetingsData });
            }
            else if (data.type === 'edit') {
                meetingsData[data.index] = data.meeting;
                broadcast({ type: 'update', data: meetingsData });
            }
        } catch (e) {
            console.error('خطا در پردازش پیام:', e);
        }
    });

    ws.on('close', () => {
        clients = clients.filter(client => client !== ws);
        console.log(`❌ کاربر قطع شد! (${clients.length} نفر آنلاین)`);
    });
});

// ارسال به همه کاربران
function broadcast(data) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 سرور روی پورت ${PORT} اجرا شد!`);
});