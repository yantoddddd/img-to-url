const express = require('express');
const multer = require('multer');
const cors = require('cors');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// Catbox userhash lo
const CATBOX_USERHASH = 'fb80838bd9d470c8b51046816';

// Endpoint upload ke Catbox
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file' });
    }

    // Validasi format
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, error: 'Format tidak didukung' });
    }

    // Siapkan FormData untuk Catbox
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('userhash', CATBOX_USERHASH);
    formData.append('fileToUpload', new Blob([req.file.buffer]), req.file.originalname);

    const response = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData
    });

    const result = await response.text();

    if (result.startsWith('https://')) {
      res.json({ success: true, url: result });
    } else {
      res.status(400).json({ success: false, error: result });
    }

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// History (temporary)
let historyStore = [];
app.get('/api/history', (req, res) => {
  res.json({ success: true, data: historyStore });
});
app.delete('/api/history/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const prevLength = historyStore.length;
  historyStore = historyStore.filter(item => item.id !== id);
  res.json({ success: true, deleted: prevLength - historyStore.length });
});

module.exports = app;
