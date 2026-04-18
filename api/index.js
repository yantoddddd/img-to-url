const express = require('express');
const multer = require('multer');
const { put, list, del } = require('@vercel/blob');
const cors = require('cors');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// API KEY ImgBB - Simpan di Vercel Environment Variables
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

// Endpoint upload
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file' });
    }

    const base64Image = req.file.buffer.toString('base64');
    
    // Pake fetch (Node 18+)
    const formData = new FormData();
    formData.append('image', base64Image);
    
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (!data.success) {
      return res.status(400).json({ success: false, error: data.error?.message || 'Upload to ImgBB failed' });
    }
    
    // Simpan metadata ke Vercel Blob
    const metadata = {
      id: Date.now(),
      original_name: req.file.originalname,
      file_size: req.file.size,
      image_url: data.data.url,
      created_at: new Date().toISOString()
    };
    
    await put(`uploads/${Date.now()}.json`, JSON.stringify(metadata), {
      access: 'public'
    });
    
    res.json({ 
      success: true, 
      url: data.data.url,
      display_url: data.data.display_url 
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint history
app.get('/api/history', async (req, res) => {
  try {
    const blobs = await list({ prefix: 'uploads/' });
    
    const histories = [];
    for (const blob of blobs.blobs) {
      try {
        const response = await fetch(blob.url);
        const data = await response.json();
        histories.push(data);
      } catch (err) {
        console.error('Failed to fetch blob:', blob.url);
      }
    }
    
    // Sort by created_at descending
    histories.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    res.json({ success: true, data: histories });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint delete history
app.delete('/api/history/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const blobs = await list({ prefix: 'uploads/' });
    
    // Cari blob yang mengandung ID
    let foundBlob = null;
    for (const blob of blobs.blobs) {
      if (blob.url.includes(id) || blob.pathname.includes(id)) {
        foundBlob = blob;
        break;
      }
    }
    
    if (foundBlob) {
      await del(foundBlob.url);
      res.json({ success: true, deleted: 1 });
    } else {
      // Alternative: cari berdasarkan isi file
      for (const blob of blobs.blobs) {
        const response = await fetch(blob.url);
        const data = await response.json();
        if (data.id == id) {
          await del(blob.url);
          return res.json({ success: true, deleted: 1 });
        }
      }
      res.json({ success: true, deleted: 0, message: 'Not found' });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = app;
