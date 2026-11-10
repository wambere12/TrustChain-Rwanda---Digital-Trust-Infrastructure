import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getAllCredentials, verifyCredential, createCredential, getAllInstitutions } from './src/db/credentials.ts';
import { getOrCreateUser } from './src/db/users.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // 1. Health check endpoint (matches Phase 2 & 3 specs)
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      status: 'Connected',
      service: 'TrustChain Rwanda API',
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      database: 'PostgreSQL (Cloud SQL & Supabase)',
      blockchain: 'Hardhat Local / TrustChain Testnet',
      blockHeight: 142092,
    });
  });

  // 2. Credentials list
  app.get('/api/credentials', async (req, res) => {
    try {
      const creds = await getAllCredentials();
      res.json({ success: true, credentials: creds });
    } catch (error: any) {
      console.error('Error in GET /api/credentials:', error);
      res.status(500).json({ error: error.message || 'Database query failed' });
    }
  });

  // 3. Verify Credential
  app.post('/api/credentials/verify', async (req, res) => {
    try {
      const { hash } = req.body;
      if (!hash) {
        return res.status(400).json({ error: 'Missing hash or credential ID' });
      }
      const cred = await verifyCredential(hash);
      res.json({
        success: true,
        verified: !!cred,
        credential: cred,
      });
    } catch (error: any) {
      console.error('Error in POST /api/credentials/verify:', error);
      res.status(500).json({ error: error.message || 'Database verification failed' });
    }
  });

  // 4. Issue/Create Credential
  app.post('/api/credentials', async (req, res) => {
    try {
      const {
        credentialId,
        institutionName,
        recipientName,
        credentialType,
        title,
        documentHash,
        ipfsCid,
      } = req.body;

      if (!credentialId || !institutionName || !recipientName || !title || !documentHash) {
        return res.status(400).json({ error: 'Missing required credential fields' });
      }

      const created = await createCredential({
        credentialId,
        institutionName,
        recipientName,
        credentialType: credentialType || 'Academic Diploma',
        title,
        documentHash,
        ipfsCid,
        status: 'VERIFIED',
      });

      res.status(201).json({ success: true, credential: created });
    } catch (error: any) {
      console.error('Error in POST /api/credentials:', error);
      res.status(500).json({ error: error.message || 'Database creation failed' });
    }
  });

  // 5. Institutions list
  app.get('/api/institutions', async (req, res) => {
    try {
      const insts = await getAllInstitutions();
      res.json({ success: true, institutions: insts });
    } catch (error: any) {
      console.error('Error in GET /api/institutions:', error);
      res.status(500).json({ error: error.message || 'Database query failed' });
    }
  });

  // 6. User sync with Firebase
  app.post('/api/auth/sync', async (req, res) => {
    try {
      const { uid, email } = req.body;
      if (!uid || !email) {
        return res.status(400).json({ error: 'Missing uid or email' });
      }
      const user = await getOrCreateUser(uid, email);
      res.json({ success: true, user });
    } catch (error: any) {
      console.error('Error in POST /api/auth/sync:', error);
      res.status(500).json({ error: error.message || 'User sync failed' });
    }
  });

  // Vite middleware in dev or static files in production
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        port: Number(PORT),
        host: '0.0.0.0',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`TrustChain Rwanda full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
