const express = require('express');
const multer = require('multer');
const cors = require('cors');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file' });
    }

    const base64Image = req.file.buffer.toString('base64');
    
    const formData = new FormData();
    formData.append('image', base64Image);
    
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (!data.success) {
      return res.status(400).json({ success: false, error: data.error?.message });
    }
    
    // Ambil direct link dari response ImgBB
    let directUrl = data.data.url;
    let displayUrl = data.data.display_url;
    
    // Bersihin URL (hapus duplikasi, dll)
    if (directUrl.includes('i.ibb.co')) {
      directUrl = directUrl.replace('i.ibb.co', 'i.ibb.co.com');
    }
    if (displayUrl.includes('ibb.co')) {
      displayUrl = displayUrl.replace('ibb.co', 'ibb.co.com');
    }
    
    // Pastikan URL pake https://
    if (!directUrl.startsWith('https://')) {
      directUrl = 'https://' + directUrl;
    }
    if (!displayUrl.startsWith('https://')) {
      displayUrl = 'https://' + displayUrl;
    }
    
    console.log('Direct URL:', directUrl);
    console.log('Display URL:', displayUrl);
    
    res.json({ 
      success: true, 
      url: directUrl,
      display_url: displayUrl
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/history', async (req, res) => {
  res.json({ success: true, data: [] });
});

app.delete('/api/history/:id', async (req, res) => {
  res.json({ success: true });
});

module.exports = app;
