import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { analyzeMediaIntegrity } from '../services/aiTamperService.js';

export const aiAnalysisRouter = Router();

const uploadsDir = path.join(process.cwd(), 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `test_lab_${Date.now()}_${uuidv4().slice(0, 6)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    fieldSize: 50 * 1024 * 1024
  }
});

// POST: Run on-the-fly forensic audit on user-uploaded file
aiAnalysisRouter.post('/inspect', upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No media file provided for AI inspection.' });
    }

    const isDirectCamera = req.body.isDirectCamera === 'true' || req.body.isDirectCamera === true;
    const result = await analyzeMediaIntegrity(
      req.file.path,
      req.file.filename,
      isDirectCamera,
      req.body.lat ? parseFloat(req.body.lat) : undefined,
      req.body.lng ? parseFloat(req.body.lng) : undefined
    );

    res.json({
      success: true,
      message: 'AI forensic inspection completed successfully.',
      data: {
        originalUrl: `/uploads/${req.file.filename}`,
        ...result
      }
    });
  } catch (error: any) {
    console.error('Inspection error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST: Inspect pre-existing sample or URL
aiAnalysisRouter.post('/inspect-sample', async (req, res) => {
  try {
    const { sampleType } = req.body;
    let targetFileName = 'sample_water_burst.jpg';
    let isCamera = true;

    if (sampleType === 'GENUINE_CAMERA') {
      targetFileName = 'sample_water_burst.jpg';
      isCamera = true;
    } else if (sampleType === 'AI_GENERATED') {
      // Create synthetic GenAI image with Midjourney / DALL-E signatures
      targetFileName = `ai_gen_sample_${Date.now()}.jpg`;
      const targetPath = path.join(uploadsDir, targetFileName);

      const svgBase = `
        <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="aiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
              <stop offset="50%" style="stop-color:#8b5cf6;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#ec4899;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#aiGrad)" />
          <circle cx="512" cy="512" r="300" fill="#1e1b4b" opacity="0.8"/>
          <text x="512" y="480" font-family="Arial" font-size="42" fill="#ffffff" font-weight="bold" text-anchor="middle">SYNTHETIC DIFFUSION SCENE</text>
          <text x="512" y="550" font-family="Arial" font-size="24" fill="#a5b4fc" text-anchor="middle">Generated via Midjourney v6 / Latent Diffusion</text>
          <rect x="250" y="620" width="524" height="80" fill="#0f172a" rx="16"/>
          <text x="512" y="668" font-family="monospace" font-size="18" fill="#38bdf8" text-anchor="middle">Prompt: hyper-realistic urban flooded avenue 8k</text>
        </svg>
      `;

      await sharp(Buffer.from(svgBase))
        .withMetadata({
          exif: {
            IFD0: {
              Software: 'Midjourney v6.0 / Latent Diffusion Grid 1024',
              ImageDescription: 'prompt: severe metropolitan highway flood crisis steps: 35 sampler: Euler a'
            }
          }
        })
        .jpeg({ quality: 88 })
        .toFile(targetPath);

      isCamera = false;
    } else if (sampleType === 'SPLICED_TAMPERED') {
      targetFileName = 'sample_crime_shattered_store.jpg';
      isCamera = false;
    }

    const filePath = path.join(uploadsDir, targetFileName);
    if (!fs.existsSync(filePath)) {
      // Fallback
      targetFileName = 'sample_water_burst.jpg';
    }

    const result = await analyzeMediaIntegrity(
      path.join(uploadsDir, targetFileName),
      targetFileName,
      isCamera
    );

    res.json({
      success: true,
      data: {
        originalUrl: `/uploads/${targetFileName}`,
        ...result
      }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST: Simulate Splicing Tamper Attack
aiAnalysisRouter.post('/simulate-tamper', async (req, res) => {
  try {
    const { tamperType, intensity } = req.body;
    const width = 800;
    const height = 600;

    const svgBase = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)" />
        <text x="40" y="60" font-family="Arial" font-size="22" fill="#ffffff" font-weight="bold">CIVIC INCIDENT SITE EVIDENCE</text>
        <rect x="40" y="90" width="720" height="400" fill="#1e293b" rx="16" stroke="#334155" stroke-width="2"/>
        <text x="60" y="140" font-family="Arial" font-size="16" fill="#94a3b8">Infrastructure Roadway Grid: Sector ${intensity || 3}</text>
        <circle cx="250" cy="300" r="100" fill="#0284c7" opacity="0.6"/>
        <rect x="420" y="220" width="180" height="180" fill="#10b981" opacity="0.6" rx="12"/>
      </svg>
    `;

    const baseJpgBuffer = await sharp(Buffer.from(svgBase))
      .jpeg({ quality: 95 })
      .toBuffer();

    // Spliced patch
    const spliceSvg = `
      <svg width="${150 + (intensity || 1) * 20}" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#dc2626" opacity="0.9" rx="8"/>
        <text x="20" y="55" font-family="Arial" font-size="16" fill="#ffffff" font-weight="bold">SPLICED CLONE</text>
      </svg>
    `;
    const splicePngBuffer = await sharp(Buffer.from(spliceSvg)).png().toBuffer();

    const tamperedFileName = `tampered_sim_${Date.now()}.jpg`;
    const tamperedFilePath = path.join(uploadsDir, tamperedFileName);

    await sharp(baseJpgBuffer)
      .composite([{
        input: splicePngBuffer,
        top: 220,
        left: 280
      }])
      .withMetadata({
        exif: {
          IFD0: {
            Software: 'Adobe Photoshop / Generative AI Inpainting'
          }
        }
      })
      .jpeg({ quality: 65 })
      .toFile(tamperedFilePath);

    const forensic = await analyzeMediaIntegrity(
      tamperedFilePath,
      tamperedFileName,
      false
    );

    res.json({
      success: true,
      message: 'Tamper simulation completed.',
      data: {
        tamperedImage: `/uploads/${tamperedFileName}`,
        forensics: forensic
      }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
