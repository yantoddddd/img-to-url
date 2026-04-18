const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Konfigurasi upload temporary (buffer)
const upload = multer({ storage: multer.memoryStorage() });

// ========== SETUP DATABASE SQLITE ==========
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
    // Tabel upload history
    db.run(`
        CREATE TABLE IF NOT EXISTS uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            original_name TEXT,
            file_size INTEGER,
            image_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

// ========== API KEY (AMAN DI BACKEND) ==========
// GANTI DENGAN API KEY IGBB LU YANG BARU (YANG BELUM BOCOR)
const IMGBB_API_KEY = 'fc3b3aa1528515a6ee596c0c1e3458d7'; // <-- GANTI INI!

// ========== ENDPOINT UPLOAD ==========
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No image file' });
        }

        const file = req.file;
        const base64Image = file.buffer.toString('base64');
        
        // Upload ke ImgBB
        const formData = new FormData();
        formData.append('image', base64Image);
        
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!data.success) {
            return res.status(400).json({ success: false, error: data.error?.message || 'Upload failed' });
        }
        
        const imageUrl = data.data.url;
        
        // Simpan ke database
        db.run(
            'INSERT INTO uploads (original_name, file_size, image_url) VALUES (?, ?, ?)',
            [file.originalname, file.size, imageUrl],
            function(err) {
                if (err) console.error('DB insert error:', err);
            }
        );
        
        res.json({
            success: true,
            url: imageUrl,
            display_url: data.data.display_url,
            delete_url: data.data.delete_url // optional
        });
        
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ========== ENDPOINT GET HISTORY ==========
app.get('/api/history', (req, res) => {
    db.all('SELECT id, original_name, file_size, image_url, created_at FROM uploads ORDER BY created_at DESC LIMIT 50', (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true, data: rows });
    });
});

// ========== ENDPOINT DELETE HISTORY ITEM ==========
app.delete('/api/history/:id', (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM uploads WHERE id = ?', id, function(err) {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true, deleted: this.changes });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📁 API endpoint: http://localhost:${PORT}/api/upload`);
    console.log(`📜 History: http://localhost:${PORT}/api/history`);
});
