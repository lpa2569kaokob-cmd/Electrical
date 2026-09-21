const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 1. บริการไฟล์ static จากโฟลเดอร์ public (หากมี index.html จะแสดงผลหน้าเว็บทันที)
app.use(express.static(path.join(__dirname, 'public')));

// เชื่อมต่อ Neon PostgreSQL
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 2. หน้าแรก (Root Route) ป้องกันปัญหา Cannot GET / กรณีที่ยังไม่มีไฟล์ index.html ในโฟลเดอร์ public
app.get('/', (req, res) => {
    res.status(200).send(`
        <div style="font-family: sans-serif; padding: 2rem; text-align: center; background-color: #0f172a; color: #f8fafc; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
            <h1 style="color: #f59e0b; margin-bottom: 0.5rem;">⚡ Neon DB Backend Server Running!</h1>
            <p style="color: #94a3b8;">เซิร์ฟเวอร์ Express และการเชื่อมต่อฐานข้อมูลพร้อมใช้งานแล้ว</p>
            <p style="margin-top: 1rem;">
                <a href="/api/repairs" style="color: #38bdf8; text-decoration: none; border: 1px solid #0284c7; padding: 8px 16px; rounded-radius: 8px;">
                    ตรวจสอบข้อมูล API (/api/repairs)
                </a>
            </p>
            <p style="color: #64748b; font-size: 0.85rem; margin-top: 2rem;">💡 Tip: นำไฟล์ index.html ไปวางไว้ในโฟลเดอร์ "public" เพื่อแสดงหน้าเว็บระบบแจ้งซ่อม</p>
        </div>
    `);
});

// --- API ROUTES ---

// 3. ดึงรายการแจ้งซ่อมทั้งหมด
app.get('/api/repairs', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, reporter_name AS "reporterName", reporter_position AS "reporterPosition", reporter, zone, equipment, urgency, description, status, date FROM repairs ORDER BY created_at DESC'
        );
        res.json(rows);
    } catch (err) {
        console.error('Fetch Error:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
});

// 4. บันทึกการแจ้งซ่อมใหม่
app.post('/api/repairs', async (req, res) => {
    const { id, reporterName, reporterPosition, reporter, zone, equipment, urgency, description, status, date } = req.body;
    try {
        const query = `
            INSERT INTO repairs (id, reporter_name, reporter_position, reporter, zone, equipment, urgency, description, status, date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *;
        `;
        const values = [id, reporterName, reporterPosition, reporter, zone, equipment, urgency, description, status, date];
        const { rows } = await pool.query(query, values);
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Insert Error:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
    }
});

// 5. อัปเดตสถานะ
app.put('/api/repairs/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await pool.query('UPDATE repairs SET status = $1 WHERE id = $2', [status, id]);
        res.json({ message: 'อัปเดตสถานะสำเร็จ' });
    } catch (err) {
        console.error('Update Status Error:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ' });
    }
});

// 6. ลบรายการแจ้งซ่อม
app.delete('/api/repairs/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM repairs WHERE id = $1', [id]);
        res.json({ message: 'ลบรายการสำเร็จ' });
    } catch (err) {
        console.error('Delete Error:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
    }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
app.use(cors());
app.use(express.json());

// เพิ่มบรรทัดนี้เพื่อให้ Express ดึงไฟล์หน้าเว็บในโฟลเดอร์ public มาแสดง
app.use(express.static('public'));