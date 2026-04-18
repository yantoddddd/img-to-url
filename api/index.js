const express = require('express');
const multer = require('multer');
const cors = require('cors');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// API KEY ImgBB - Simpan di Vercel Environment Variables
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

// SIMULASI DATABASE PAKE ARRAY (temporary, ilang kalo redeploy)
let historyStore = [];

// Endpoint upload
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file' });
    }

    if (!IMGBB_API_KEY) {
      return res.status(500).json({ success: false, error: 'API key not configured. Add IMGBB_API_KEY to environment variables.' });
    }

    const base64Image = req.file.buffer.toString('base64');
    
    // Panggil API ImgBB
    const formData = new FormData();
    formData.append('image', base64Image);
    
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (!data.success) {
      return res.status(400).json({ 
        success: false, 
        error: data.error?.message || 'Upload to ImgBB failed' 
      });
    }
    
    // Simpan ke history (temporary)
    const uploadRecord = {
      id: Date.now(),
      original_name: req.file.originalname,
      file_size: req.file.size,
      image_url: data.data.url,
      created_at: new Date().toISOString()
    };
    historyStore.unshift(uploadRecord); // tambah di awal
    // Batasi history maksimal 50 data
    if (historyStore.length > 50) historyStore.pop();
    
    res.json({ 
      success: true, 
      url: data.data.url,
      display_url: data.data.display_url,
      delete_url: data.data.delete_url
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint history (pake memory, ga perlu database)
app.get('/api/history', async (req, res) => {
  res.json({ success: true, data: historyStore });
});

// Endpoint delete history
app.delete('/api/history/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const initialLength = historyStore.length;
  historyStore = historyStore.filter(item => item.id !== id);
  
  res.json({ 
    success: true, 
    deleted: initialLength - historyStore.length 
  });
});

module.exports = app;
