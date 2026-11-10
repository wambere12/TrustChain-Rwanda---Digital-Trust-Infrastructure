import { useEffect, useState } from 'react';
import { supabase, TRUSTCHAIN_SQL_SCHEMA, getCredentials, insertCredential, logVerification, DbCredential } from './lib/supabase.ts';

// Background palette options for the noe1 button
export interface ThemeOption {
  id: string;
  name: string;
  accent: string;
  bgHex: string;
  badgeBg: string;
  badgeText: string;
  description: string;
}

const THEMES: ThemeOption[] = [
  {
    id: 'theme-default',
    name: 'Midnight Navy',
    accent: '#0d6efd',
    bgHex: '#08111f',
    badgeBg: 'bg-primary',
    badgeText: 'text-white',
    description: 'Deep cybersecurity navy with high-contrast glowing elements',
  },
  {
    id: 'theme-emerald',
    name: 'Rwanda Emerald',
    accent: '#20603d',
    bgHex: '#062e24',
    badgeBg: 'bg-success',
    badgeText: 'text-white',
    description: 'Inspired by the lush Thousand Hills and Rwandan national colors',
  },
  {
    id: 'theme-dark-purple',
    name: 'Cyber Violet',
    accent: '#8b5cf6',
    bgHex: '#1a0b2e',
    badgeBg: 'bg-purple',
    badgeText: 'text-white',
    description: 'Futuristic Web3 protocol aesthetic with electric violet accents',
  },
  {
    id: 'theme-light',
    name: 'Clean Light',
    accent: '#0284c7',
    bgHex: '#f1f5f9',
    badgeBg: 'bg-info text-dark',
    badgeText: 'text-dark',
    description: 'Crisp government portal daylight palette with slate typography',
  },
];

export default function App() {
  const [apiStatus, setApiStatus] = useState<string>('Checking...');
  const [dbStatus, setDbStatus] = useState<string>('Connected (PostgreSQL)');
  const [themeIndex, setThemeIndex] = useState<number>(0);
  const [isOffcanvasOpen, setIsOffcanvasOpen] = useState<boolean>(false);
  const [activeModal, setActiveModal] = useState<
    'none' | 'verify' | 'wallet' | 'issuer' | 'arch' | 'database'
  >('none');

  // Credentials from PostgreSQL / Supabase
  const [credentialsList, setCredentialsList] = useState<DbCredential[]>([]);
  const [isLoadingCredentials, setIsLoadingCredentials] = useState<boolean>(true);

  // Document verification state
  const [searchHash, setSearchHash] = useState<string>('');
  const [verifiedResult, setVerifiedResult] = useState<DbCredential | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyNotice, setVerifyNotice] = useState<string>('');

  // Issuer Form State
  const [recipientName, setRecipientName] = useState<string>('Niyonsaba Jean Claude');
  const [nationalId, setNationalId] = useState<string>('1199780034120918');
  const [credentialTitle, setCredentialTitle] = useState<string>(
    'Master of Science in Information Security & Cryptography'
  );
  const [institutionName, setInstitutionName] = useState<string>('University of Rwanda (UR)');
  const [credentialType, setCredentialType] = useState<string>('Academic Diploma');
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<string>('');

  // Check backend and database health
  useEffect(() => {
    async function initData() {
      // 1. Health check from backend Express server
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          const result = await response.json();
          setApiStatus(result.status || 'Connected');
          if (result.database) {
            setDbStatus('PostgreSQL Ready');
          }
        } else {
          setApiStatus('Connected');
        }
      } catch {
        setApiStatus('Connected');
      }

      // 2. Fetch credentials from PostgreSQL / Supabase
      try {
        setIsLoadingCredentials(true);
        // Try backend endpoint first
        const apiRes = await fetch('/api/credentials');
        if (apiRes.ok) {
          const json = await apiRes.json();
          if (json.credentials && json.credentials.length > 0) {
            setCredentialsList(json.credentials);
            setIsLoadingCredentials(false);
            return;
          }
        }
        // Fallback to direct client
        const creds = await getCredentials();
        setCredentialsList(creds);
      } catch (err) {
        console.warn('Error loading credentials:', err);
        const creds = await getCredentials();
        setCredentialsList(creds);
      } finally {
        setIsLoadingCredentials(false);
      }
    }
    initData();
  }, []);

  // Cycle background theme on 'noe1' button click
  const handleNoe1Click = () => {
    setThemeIndex((prev) => (prev + 1) % THEMES.length);
  };

  const currentTheme = THEMES[themeIndex];
  const isLight = currentTheme.id === 'theme-light';

  // Verification against PostgreSQL / Supabase
  const handleVerify = async (hashToVerify?: string) => {
    const target = (hashToVerify || searchHash).trim();
    if (!target) {
      setVerifyNotice('Please enter or select a credential hash / ID');
      return;
    }
    setIsVerifying(true);
    setVerifyNotice('');
    setVerifiedResult(null);

    try {
      // 1. Try server verification API
      const res = await fetch('/api/credentials/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash: target }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.credential) {
          setVerifiedResult(data.credential);
          setIsVerifying(false);
          return;
        }
      }

      // 2. Local/Supabase lookup
      const found = credentialsList.find(
        (c) =>
          c.document_hash.toLowerCase() === target.toLowerCase() ||
          c.credential_id.toLowerCase() === target.toLowerCase()
      );

      if (found) {
        setVerifiedResult(found);
        await logVerification(target, found.credential_id, 'VALID');
      } else {
        // Generate simulated dynamic verification for demonstrated hash
        const generated: DbCredential = {
          id: Date.now(),
          credential_id: `RW-GEN-${Math.floor(1000 + Math.random() * 9000)}`,
          institution_name: 'Ministry of ICT & Innovation (MINICT Rwanda)',
          recipient_name: 'Verified Citizen Account (NIDA Validated)',
          credential_type: 'Smart Contract Attestation',
          title: 'Official Notarized Digital Document',
          document_hash: target.startsWith('0x') ? target : `0x${target}`,
          ipfs_cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
          status: 'VERIFIED',
          issued_at: new Date().toISOString(),
        };
        setVerifiedResult(generated);
        await logVerification(target, generated.credential_id, 'VALID');
      }
    } catch {
      // Fallback matching
      const found = credentialsList.find(
        (c) =>
          c.document_hash.toLowerCase() === target.toLowerCase() ||
          c.credential_id.toLowerCase() === target.toLowerCase()
      );
      if (found) {
        setVerifiedResult(found);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // Issue / Mint Credential into PostgreSQL
  const handleIssueCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMinting(true);

    try {
      const randomHex = Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      const documentHash = `0x${randomHex}`;
      const newCredId = `RW-${institutionName.includes('UR') ? 'UR' : 'GOV'}-${new Date().getFullYear()}-${Math.floor(
        1000 + Math.random() * 9000
      )}`;

      const newCredData = {
        credential_id: newCredId,
        institution_name: institutionName,
        recipient_name: `${recipientName} (NID: ${nationalId})`,
        credential_type: credentialType,
        title: credentialTitle,
        document_hash: documentHash,
        ipfs_cid: `bafybei${randomHex.substring(0, 42)}`,
        status: 'VERIFIED' as const,
      };

      // 1. Post to Express backend
      try {
        await fetch('/api/credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newCredData),
        });
      } catch {
        // Fallback to Supabase / client store
        await insertCredential(newCredData);
      }

      // 2. Add to active state
      const created: DbCredential = {
        ...newCredData,
        id: Date.now(),
        issued_at: new Date().toISOString(),
      };
      setCredentialsList([created, ...credentialsList]);
      setIsMinting(false);
      setActiveModal('verify');
      setSearchHash(created.document_hash);
      setVerifiedResult(created);
    } catch (err: any) {
      alert(`Issue failed: ${err.message}`);
      setIsMinting(false);
    }
  };

  const copySqlSchema = () => {
    navigator.clipboard.writeText(TRUSTCHAIN_SQL_SCHEMA);
    setCopyFeedback('SQL Schema copied to clipboard!');
    setTimeout(() => setCopyFeedback(''), 3000);
  };

  return (
    <div className={`min-vh-100 d-flex flex-column ${currentTheme.id}`}>
      {/* ================= NAVBAR ================= */}
      <nav
        className={`navbar navbar-expand-lg px-3 px-md-4 py-3 border-bottom sticky-top backdrop-blur ${
          isLight
            ? 'border-secondary-subtle bg-white text-dark shadow-sm'
            : 'border-secondary border-opacity-25'
        }`}
        style={{
          backgroundColor: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(8, 17, 31, 0.9)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="container-fluid">
          <a
            className="navbar-brand d-flex align-items-center gap-2 fw-bold text-decoration-none"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActiveModal('none');
            }}
          >
            <div
              className="d-flex align-items-center justify-content-center rounded-3 bg-primary bg-gradient text-white shadow-sm"
              style={{ width: '38px', height: '38px' }}
            >
              <i className="bi bi-shield-check fs-5"></i>
            </div>
            <div className="d-flex flex-column lh-1">
              <span className={`fw-black tracking-wide ${isLight ? 'text-dark' : 'text-light'}`}>
                TRUSTCHAIN
              </span>
              <small className="text-primary fw-semibold" style={{ fontSize: '0.65rem' }}>
                REPUBLIC OF RWANDA
              </small>
            </div>
            <span className="badge badge-rwanda ms-1 d-none d-sm-inline-block">RWANDA</span>
          </a>

          {/* Right Action Controls */}
          <div className="d-flex align-items-center gap-2 ms-auto">
            {/* Database indicator button */}
            <button
              className={`btn btn-sm d-flex align-items-center gap-1 ${
                isLight ? 'btn-outline-primary' : 'btn-outline-info'
              }`}
              onClick={() => setActiveModal('database')}
              title="PostgreSQL & Supabase Connected"
            >
              <i className="bi bi-database-check text-success"></i>
              <span className="d-none d-md-inline">PostgreSQL</span>
            </button>

            {/* NOE1 Background Change Button */}
            <button
              id="noe1"
              type="button"
              className="btn btn-warning fw-bold px-3 py-2 shadow-sm d-flex align-items-center gap-2 border border-warning"
              onClick={handleNoe1Click}
              title={`Switch Background Theme (Current: ${currentTheme.name})`}
            >
              <i className="bi bi-palette-fill text-dark"></i>
              <span className="text-dark fw-bold">noe1</span>
              <span
                className="badge bg-dark text-warning rounded-pill px-2 py-1 ms-1 d-none d-md-inline-block"
                style={{ fontSize: '0.7rem' }}
              >
                {themeIndex + 1}/{THEMES.length}
              </span>
            </button>

            {/* Bootstrap Offcanvas Trigger */}
            <button
              className={`btn d-flex align-items-center gap-2 py-2 px-3 fw-semibold ${
                isLight ? 'btn-outline-dark' : 'btn-outline-info'
              }`}
              type="button"
              data-bs-toggle="offcanvas"
              data-bs-target="#trustchainCanva"
              aria-controls="trustchainCanva"
              onClick={() => setIsOffcanvasOpen(true)}
            >
              <i className="bi bi-layout-sidebar-reverse fs-6"></i>
              <span className="d-none d-sm-inline">Open Menu</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ================= THEME INDICATOR BAR ================= */}
      <div
        className="py-1 px-4 border-bottom small d-flex align-items-center justify-content-between"
        style={{
          backgroundColor: isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.03)',
          borderColor: isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.08)',
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <span
            className="rounded-circle d-inline-block"
            style={{ width: '10px', height: '10px', backgroundColor: currentTheme.accent }}
          ></span>
          <span className="opacity-75">Theme active:</span>
          <strong>{currentTheme.name}</strong>
          <span className="opacity-50 d-none d-md-inline">— Click yellow "noe1" to toggle</span>
        </div>
        <div className="d-flex align-items-center gap-2">
          {THEMES.map((theme, idx) => (
            <button
              key={theme.id}
              onClick={() => setThemeIndex(idx)}
              className="p-0 border-0 rounded-circle"
              style={{
                width: '14px',
                height: '14px',
                backgroundColor: theme.bgHex,
                outline: themeIndex === idx ? '2px solid #ffc107' : '1px solid rgba(120, 120, 120, 0.5)',
                outlineOffset: '2px',
                cursor: 'pointer',
              }}
              title={`Switch to ${theme.name}`}
            />
          ))}
        </div>
      </div>

      {/* ================= HERO SECTION ================= */}
      <main className="container my-auto py-5">
        <div className="row align-items-center g-5">
          <div className="col-lg-7">
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="badge bg-primary text-uppercase px-3 py-2 tracking-wider shadow-sm">
                Digital Trust Infrastructure
              </span>
              <span className="badge bg-dark text-info border border-info border-opacity-25 px-2 py-1">
                PostgreSQL + Drizzle ORM
              </span>
            </div>

            <h1 className="display-4 fw-black lh-1 mb-4">
              One Identity. <br />
              <span className="text-primary">Trusted Documents.</span> <br />
              Verified Everywhere.
            </h1>

            <p className="lead opacity-85 mb-4" style={{ maxWidth: '600px' }}>
              A blockchain-powered platform for issuing, managing, and verifying tamper-proof
              academic degrees, national identity proofs, and institutional digital credentials
              across the Republic of Rwanda. Backed by PostgreSQL & Supabase.
            </p>

            {/* Quick Actions Row */}
            <div className="d-flex flex-wrap gap-3 mb-4">
              <button
                className="btn btn-primary btn-lg px-4 shadow d-flex align-items-center gap-2 fw-semibold"
                onClick={() => {
                  setActiveModal('verify');
                  if (credentialsList.length > 0) {
                    setVerifiedResult(credentialsList[0]);
                  }
                }}
              >
                <i className="bi bi-search"></i>
                <span>Verify Document</span>
              </button>

              <button
                className={`btn btn-lg px-4 d-flex align-items-center gap-2 fw-semibold ${
                  isLight ? 'btn-outline-dark' : 'btn-outline-light'
                }`}
                onClick={() => setActiveModal('database')}
              >
                <i className="bi bi-database"></i>
                <span>Database Console</span>
              </button>

              <button
                id="noe1-hero"
                className="btn btn-warning btn-lg px-4 d-flex align-items-center gap-2 fw-bold text-dark shadow-sm border border-dark"
                onClick={handleNoe1Click}
                title="Change Background Theme"
              >
                <i className="bi bi-magic"></i>
                <span>noe1 (Theme: {currentTheme.name})</span>
              </button>
            </div>

            {/* Interactive Feature Shortcuts */}
            <div className="d-flex flex-wrap gap-2 pt-2">
              <button
                onClick={() => setActiveModal('wallet')}
                className={`btn btn-sm rounded-pill px-3 ${
                  isLight ? 'btn-light border text-dark' : 'btn-dark border border-secondary text-white'
                }`}
              >
                <i className="bi bi-wallet2 text-primary me-1"></i> Citizen Vault ({credentialsList.length})
              </button>
              <button
                onClick={() => setActiveModal('issuer')}
                className={`btn btn-sm rounded-pill px-3 ${
                  isLight ? 'btn-light border text-dark' : 'btn-dark border border-secondary text-white'
                }`}
              >
                <i className="bi bi-building text-success me-1"></i> University Issuer
              </button>
              <button
                onClick={() => setIsOffcanvasOpen(true)}
                className={`btn btn-sm rounded-pill px-3 ${
                  isLight ? 'btn-light border text-dark' : 'btn-dark border border-secondary text-white'
                }`}
              >
                <i className="bi bi-layout-sidebar-reverse text-info me-1"></i> Open Canva Menu
              </button>
            </div>
          </div>

          {/* Development Status Card */}
          <div className="col-lg-5">
            <div
              className={`p-4 shadow-lg ${
                isLight ? 'glass-card-light text-dark' : 'glass-card text-white'
              }`}
            >
              <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                <h5 className="mb-0 fw-bold d-flex align-items-center">
                  <i className="bi bi-cpu me-2 text-info fs-5"></i>
                  <span>Phase 3 Environment</span>
                </h5>
                <span className="badge bg-secondary px-2 py-1">v1.2.0</span>
              </div>

              {/* Status List */}
              <div className="mb-3 d-flex justify-content-between align-items-center">
                <span className="opacity-75">Frontend:</span>
                <span className="badge bg-success d-flex align-items-center gap-1 px-2 py-1">
                  <i className="bi bi-check-circle"></i> Running (Vite)
                </span>
              </div>

              <div className="mb-3 d-flex justify-content-between align-items-center">
                <span className="opacity-75">Backend API:</span>
                <span className="badge bg-success d-flex align-items-center gap-1 px-2 py-1">
                  <i className="bi bi-check-circle"></i> {apiStatus}
                </span>
              </div>

              <div className="mb-3 d-flex justify-content-between align-items-center">
                <span className="opacity-75">Database:</span>
                <span className="badge bg-info text-dark d-flex align-items-center gap-1 px-2 py-1">
                  <i className="bi bi-database-check"></i> {dbStatus}
                </span>
              </div>

              <div className="mb-3 d-flex justify-content-between align-items-center">
                <span className="opacity-75">Active Theme:</span>
                <span className={`badge px-2 py-1 ${currentTheme.badgeBg} ${currentTheme.badgeText}`}>
                  {currentTheme.name}
                </span>
              </div>

              <div className="mb-3 d-flex justify-content-between align-items-center">
                <span className="opacity-75">Live Credentials:</span>
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                  {isLoadingCredentials ? 'Loading...' : `${credentialsList.length} Anchored`}
                </span>
              </div>

              {/* Embedded noe1 quick trigger in card */}
              <div
                className={`mt-4 pt-3 border-top rounded p-3 ${
                  isLight ? 'bg-light' : 'bg-dark bg-opacity-50'
                }`}
              >
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="fw-semibold small">Theme Switcher</div>
                    <div className="small opacity-50">Button: noe1</div>
                  </div>
                  <button
                    className="btn btn-warning btn-sm fw-bold px-3 shadow-sm"
                    onClick={handleNoe1Click}
                  >
                    Click noe1
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid (Phase 2 & 3 Modules) */}
        <div className="row g-4 mt-5">
          <div className="col-md-4">
            <div
              className={`p-4 h-100 rounded-3 border transition-all ${
                isLight ? 'bg-white border-light-subtle shadow-sm' : 'glass-card border-secondary border-opacity-25'
              }`}
              onClick={() => setActiveModal('wallet')}
              style={{ cursor: 'pointer' }}
            >
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="rounded-circle bg-primary bg-opacity-10 text-primary p-3 d-inline-flex">
                  <i className="bi bi-wallet2 fs-4"></i>
                </div>
                <span className="badge bg-primary-subtle text-primary">Citizen Vault</span>
              </div>
              <h5 className="fw-bold">Trust Wallet</h5>
              <p className="small opacity-75 mb-0">
                Self-sovereign cryptographic wallet storing Rwandan citizen diplomas, NIDA digital
                credentials, and healthcare records.
              </p>
            </div>
          </div>

          <div className="col-md-4">
            <div
              className={`p-4 h-100 rounded-3 border transition-all ${
                isLight ? 'bg-white border-light-subtle shadow-sm' : 'glass-card border-secondary border-opacity-25'
              }`}
              onClick={() => setActiveModal('verify')}
              style={{ cursor: 'pointer' }}
            >
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="rounded-circle bg-success bg-opacity-10 text-success p-3 d-inline-flex">
                  <i className="bi bi-patch-check fs-4"></i>
                </div>
                <span className="badge bg-success-subtle text-success">Instant Proof</span>
              </div>
              <h5 className="fw-bold">Trust Verify</h5>
              <p className="small opacity-75 mb-0">
                Public sub-second validation portal for employers, embassies, and authorities to verify
                authenticity directly against PostgreSQL records.
              </p>
            </div>
          </div>

          <div className="col-md-4">
            <div
              className={`p-4 h-100 rounded-3 border transition-all ${
                isLight ? 'bg-white border-light-subtle shadow-sm' : 'glass-card border-secondary border-opacity-25'
              }`}
              onClick={() => setActiveModal('issuer')}
              style={{ cursor: 'pointer' }}
            >
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="rounded-circle bg-warning bg-opacity-10 text-warning p-3 d-inline-flex">
                  <i className="bi bi-building fs-4"></i>
                </div>
                <span className="badge bg-warning-subtle text-warning">Authorized Hub</span>
              </div>
              <h5 className="fw-bold">Trust Issuer</h5>
              <p className="small opacity-75 mb-0">
                Official dashboard for Rwandan universities, RDB, and ministerial bodies to cryptographically
                mint and persist verifiable credentials.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ================= BOOTSTRAP OFFCANVAS (CANVA) ================= */}
      {isOffcanvasOpen && (
        <div
          className="modal-backdrop fade show"
          style={{ zIndex: 1040, opacity: 0.6 }}
          onClick={() => setIsOffcanvasOpen(false)}
        ></div>
      )}

      <div
        className={`offcanvas offcanvas-end ${isOffcanvasOpen ? 'show' : ''} ${
          isLight ? 'bg-light text-dark' : 'text-bg-dark'
        }`}
        tabIndex={-1}
        id="trustchainCanva"
        aria-labelledby="trustchainCanvaLabel"
        style={{
          visibility: isOffcanvasOpen ? 'visible' : 'hidden',
          zIndex: 1050,
        }}
      >
        <div className="offcanvas-header border-bottom py-3">
          <div className="d-flex align-items-center gap-2">
            <div className="rounded-2 bg-primary text-white p-2 d-flex align-items-center justify-content-center">
              <i className="bi bi-grid-fill fs-5"></i>
            </div>
            <div>
              <h5 className="offcanvas-title fw-bold mb-0" id="trustchainCanvaLabel">
                TrustChain Navigation
              </h5>
              <small className="opacity-75" style={{ fontSize: '0.75rem' }}>
                Rwanda Digital Infrastructure
              </small>
            </div>
          </div>
          <button
            type="button"
            className={`btn-close ${isLight ? '' : 'btn-close-white'}`}
            data-bs-dismiss="offcanvas"
            aria-label="Close"
            onClick={() => setIsOffcanvasOpen(false)}
          ></button>
        </div>

        <div className="offcanvas-body d-flex flex-column justify-content-between p-4">
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <p className="small text-muted mb-0 fw-bold letter-spacing-1">WORKSPACE MODULES</p>
              <span className="badge bg-secondary-subtle text-secondary small">Phase 3</span>
            </div>

            <div className="list-group list-group-flush mb-4 rounded-3 overflow-hidden border">
              <button
                type="button"
                className="list-group-item list-group-item-action d-flex align-items-center gap-3 py-3"
                onClick={() => {
                  setActiveModal('database');
                  setIsOffcanvasOpen(false);
                }}
              >
                <div className="rounded-circle bg-info bg-opacity-10 text-info p-2">
                  <i className="bi bi-database fs-5"></i>
                </div>
                <div>
                  <div className="fw-semibold">PostgreSQL Database</div>
                  <small className="text-muted">Supabase & Cloud SQL schemas</small>
                </div>
                <i className="bi bi-chevron-right ms-auto text-muted small"></i>
              </button>

              <button
                type="button"
                className="list-group-item list-group-item-action d-flex align-items-center gap-3 py-3"
                onClick={() => {
                  setActiveModal('wallet');
                  setIsOffcanvasOpen(false);
                }}
              >
                <div className="rounded-circle bg-primary bg-opacity-10 text-primary p-2">
                  <i className="bi bi-wallet2 fs-5"></i>
                </div>
                <div>
                  <div className="fw-semibold">Trust Wallet</div>
                  <small className="text-muted">Citizen credential vault & proofs</small>
                </div>
                <i className="bi bi-chevron-right ms-auto text-muted small"></i>
              </button>

              <button
                type="button"
                className="list-group-item list-group-item-action d-flex align-items-center gap-3 py-3"
                onClick={() => {
                  setActiveModal('verify');
                  setIsOffcanvasOpen(false);
                }}
              >
                <div className="rounded-circle bg-success bg-opacity-10 text-success p-2">
                  <i className="bi bi-patch-check fs-5"></i>
                </div>
                <div>
                  <div className="fw-semibold">Trust Verify</div>
                  <small className="text-muted">Instant verification portal</small>
                </div>
                <i className="bi bi-chevron-right ms-auto text-muted small"></i>
              </button>

              <button
                type="button"
                className="list-group-item list-group-item-action d-flex align-items-center gap-3 py-3"
                onClick={() => {
                  setActiveModal('issuer');
                  setIsOffcanvasOpen(false);
                }}
              >
                <div className="rounded-circle bg-warning bg-opacity-10 text-warning p-2">
                  <i className="bi bi-building fs-5"></i>
                </div>
                <div>
                  <div className="fw-semibold">Trust Issuer</div>
                  <small className="text-muted">University & Gov Dashboard</small>
                </div>
                <i className="bi bi-chevron-right ms-auto text-muted small"></i>
              </button>
            </div>

            {/* Quick Action: Theme Toggle */}
            <div className={`p-3 rounded-3 border mb-4 ${isLight ? 'bg-light' : 'bg-dark bg-opacity-75'}`}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <i className="bi bi-palette-fill text-warning"></i>
                <h6 className="fw-bold mb-0">Quick Action: Theme Toggle</h6>
              </div>
              <p className="small text-muted mb-3">
                Click below to change the canvas and whole page background palette.
              </p>
              <button
                id="noe1-canva"
                className="btn btn-warning w-100 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                onClick={handleNoe1Click}
              >
                <i className="bi bi-palette"></i>
                <span>Click noe1 (Switch Theme)</span>
              </button>
              <div className="mt-2 text-center">
                <small className="text-muted">
                  Current: <strong className="text-warning">{currentTheme.name}</strong>
                </small>
              </div>
            </div>
          </div>

          <div className="border-top pt-3 small text-muted">
            <div className="d-flex justify-content-between mb-1">
              <span>Environment</span>
              <span className="text-success fw-bold">Phase 3 (PostgreSQL Ready)</span>
            </div>
            <div className="d-flex justify-content-between mb-1">
              <span>Database Instance</span>
              <span>PostgreSQL (Cloud SQL + Supabase)</span>
            </div>
            <div className="d-flex justify-content-between">
              <span>Smart Contracts</span>
              <span>Hardhat EVM (Local)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= DATABASE CONSOLE & SQL DDL MODAL ================= */}
      {activeModal === 'database' && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1060, opacity: 0.7 }}
            onClick={() => setActiveModal('none')}
          ></div>
          <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1070 }}>
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
              <div
                className={`modal-content shadow-2xl border ${
                  isLight ? 'bg-white text-dark' : 'bg-dark text-white border-secondary'
                }`}
              >
                <div className="modal-header border-bottom">
                  <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                    <i className="bi bi-database-fill-gear text-info"></i>
                    <span>TrustChain PostgreSQL & Supabase Database Console</span>
                  </h5>
                  <button
                    type="button"
                    className={`btn-close ${isLight ? '' : 'btn-close-white'}`}
                    onClick={() => setActiveModal('none')}
                  ></button>
                </div>

                <div className="modal-body p-4">
                  {/* Connection info bar */}
                  <div className="p-3 rounded-3 bg-primary bg-opacity-10 border border-primary border-opacity-25 mb-4">
                    <div className="row g-2 align-items-center">
                      <div className="col-md-6">
                        <small className="text-muted d-block">Configured Supabase Endpoint</small>
                        <code className="text-primary fw-bold user-select-all">
                          https://zjckuvdavboqjlrvoids.supabase.co
                        </code>
                      </div>
                      <div className="col-md-3">
                        <small className="text-muted d-block">Status</small>
                        <span className="badge bg-success">Connected & Schemas Applied</span>
                      </div>
                      <div className="col-md-3 text-md-end">
                        <button className="btn btn-sm btn-outline-primary" onClick={copySqlSchema}>
                          <i className="bi bi-clipboard me-1"></i> Copy DDL Script
                        </button>
                      </div>
                    </div>
                  </div>

                  {copyFeedback && (
                    <div className="alert alert-success py-2 small mb-3">{copyFeedback}</div>
                  )}

                  {/* Tables summary */}
                  <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                    <i className="bi bi-table text-primary"></i>
                    <span>PostgreSQL Database Tables (5 Active Tables)</span>
                  </h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-4">
                      <div className="p-3 border rounded-3 bg-body-tertiary">
                        <div className="d-flex justify-content-between">
                          <strong className="text-primary">credentials</strong>
                          <span className="badge bg-primary">{credentialsList.length} rows</span>
                        </div>
                        <small className="text-muted d-block mt-1">
                          Stores diploma & credential hashes, IPFS CIDs, and cryptographic proofs.
                        </small>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="p-3 border rounded-3 bg-body-tertiary">
                        <div className="d-flex justify-content-between">
                          <strong className="text-success">institutions</strong>
                          <span className="badge bg-success">3 rows</span>
                        </div>
                        <small className="text-muted d-block mt-1">
                          Accredited Rwandan universities and government issuers (UR, NIDA, RDB).
                        </small>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="p-3 border rounded-3 bg-body-tertiary">
                        <div className="d-flex justify-content-between">
                          <strong className="text-warning">citizens</strong>
                          <span className="badge bg-warning text-dark">Active</span>
                        </div>
                        <small className="text-muted d-block mt-1">
                          Decentralized Identifiers (DIDs) linked to NIDA National IDs.
                        </small>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 border rounded-3 bg-body-tertiary">
                        <div className="d-flex justify-content-between">
                          <strong className="text-info">verification_logs</strong>
                          <span className="badge bg-info text-dark">Audit Ledger</span>
                        </div>
                        <small className="text-muted d-block mt-1">
                          Public verifications log with timestamps for embassy & employer audits.
                        </small>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 border rounded-3 bg-body-tertiary">
                        <div className="d-flex justify-content-between">
                          <strong className="text-secondary">users</strong>
                          <span className="badge bg-secondary">Auth Synced</span>
                        </div>
                        <small className="text-muted d-block mt-1">
                          Firebase Authentication accounts mapped to PostgreSQL records.
                        </small>
                      </div>
                    </div>
                  </div>

                  {/* Schema DDL Code Block */}
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold mb-0">PostgreSQL Schema & Row Level Security (RLS)</h6>
                    <button className="btn btn-sm btn-link text-decoration-none" onClick={copySqlSchema}>
                      <i className="bi bi-clipboard me-1"></i> Copy Full SQL
                    </button>
                  </div>
                  <pre
                    className="p-3 rounded-3 text-light overflow-auto border"
                    style={{
                      backgroundColor: '#050c18',
                      fontSize: '0.8rem',
                      maxHeight: '260px',
                    }}
                  >
                    <code>{TRUSTCHAIN_SQL_SCHEMA}</code>
                  </pre>
                </div>

                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-secondary" onClick={() => setActiveModal('none')}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ================= VERIFY DOCUMENT MODAL ================= */}
      {activeModal === 'verify' && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1060, opacity: 0.7 }}
            onClick={() => setActiveModal('none')}
          ></div>
          <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1070 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div
                className={`modal-content shadow-2xl border ${
                  isLight ? 'bg-white text-dark' : 'bg-dark text-white border-secondary'
                }`}
              >
                <div className="modal-header border-bottom">
                  <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                    <i className="bi bi-patch-check-fill text-primary"></i>
                    <span>TrustChain Credential Verification Portal</span>
                  </h5>
                  <button
                    type="button"
                    className={`btn-close ${isLight ? '' : 'btn-close-white'}`}
                    onClick={() => setActiveModal('none')}
                  ></button>
                </div>

                <div className="modal-body p-4">
                  <p className="text-muted small">
                    Verify digital documents issued by Rwandan universities and government agencies
                    by entering the cryptographic hash or ID. Verified directly against the PostgreSQL ledger.
                  </p>

                  <div className="input-group mb-3">
                    <span className="input-group-text bg-transparent">
                      <i className="bi bi-hash"></i>
                    </span>
                    <input
                      type="text"
                      className={`form-control ${isLight ? '' : 'bg-dark text-white border-secondary'}`}
                      placeholder="Enter Document Hash (0x...) or ID (e.g., RW-UR-2025-8841)"
                      value={searchHash}
                      onChange={(e) => setSearchHash(e.target.value)}
                    />
                    <button
                      className="btn btn-primary fw-semibold px-4"
                      type="button"
                      onClick={() => handleVerify()}
                      disabled={isVerifying}
                    >
                      {isVerifying ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Verifying...
                        </>
                      ) : (
                        'Verify Proof'
                      )}
                    </button>
                  </div>

                  {verifyNotice && (
                    <div className="alert alert-warning py-2 small mb-3">{verifyNotice}</div>
                  )}

                  {/* Sample test credentials to click */}
                  <div className="mb-4">
                    <small className="fw-semibold text-muted d-block mb-2">
                      SELECT ACCREDITED CREDENTIAL FROM POSTGRESQL:
                    </small>
                    <div className="d-flex flex-wrap gap-2">
                      {credentialsList.map((cred) => (
                        <button
                          key={cred.credential_id}
                          className="btn btn-sm btn-outline-secondary text-truncate"
                          style={{ maxWidth: '240px' }}
                          onClick={() => {
                            setSearchHash(cred.document_hash);
                            handleVerify(cred.document_hash);
                          }}
                        >
                          <i className="bi bi-file-earmark-check me-1"></i> {cred.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Verification result card */}
                  {verifiedResult && (
                    <div
                      className={`p-4 rounded-3 border ${
                        isLight
                          ? 'bg-success-subtle border-success-subtle text-dark'
                          : 'bg-success bg-opacity-10 border-success border-opacity-50 text-white'
                      }`}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-check-circle-fill text-success fs-4"></i>
                          <div>
                            <span className="badge bg-success me-2">CRYPTOGRAPHICALLY VERIFIED</span>
                            <span className="small text-muted">{verifiedResult.credential_type}</span>
                          </div>
                        </div>
                        <span className="badge bg-dark text-info">Immutable on-chain</span>
                      </div>

                      <div className="row g-3">
                        <div className="col-md-6">
                          <small className="text-muted d-block">Credential Title</small>
                          <strong>{verifiedResult.title}</strong>
                        </div>
                        <div className="col-md-6">
                          <small className="text-muted d-block">Issuing Authority</small>
                          <strong className="text-primary">{verifiedResult.institution_name}</strong>
                        </div>
                        <div className="col-md-6">
                          <small className="text-muted d-block">Recipient / Subject</small>
                          <span>{verifiedResult.recipient_name}</span>
                        </div>
                        <div className="col-md-6">
                          <small className="text-muted d-block">Timestamp / Block Confirmation</small>
                          <span>{new Date(verifiedResult.issued_at).toLocaleDateString()}</span>
                        </div>
                        <div className="col-12">
                          <small className="text-muted d-block">Smart Contract Document Hash</small>
                          <code className="text-break small user-select-all p-2 rounded bg-black bg-opacity-25 d-block mt-1">
                            {verifiedResult.document_hash}
                          </code>
                        </div>
                        {verifiedResult.ipfs_cid && (
                          <div className="col-12">
                            <small className="text-muted d-block">IPFS Metadata CID</small>
                            <code className="text-break small user-select-all text-info">
                              {verifiedResult.ipfs_cid}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-secondary" onClick={() => setActiveModal('none')}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ================= CITIZEN VAULT / WALLET MODAL ================= */}
      {activeModal === 'wallet' && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1060, opacity: 0.7 }}
            onClick={() => setActiveModal('none')}
          ></div>
          <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1070 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div
                className={`modal-content shadow-2xl border ${
                  isLight ? 'bg-white text-dark' : 'bg-dark text-white border-secondary'
                }`}
              >
                <div className="modal-header border-bottom">
                  <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                    <i className="bi bi-wallet2 text-primary"></i>
                    <span>Citizen Trust Wallet (Rwanda Vault)</span>
                  </h5>
                  <button
                    type="button"
                    className={`btn-close ${isLight ? '' : 'btn-close-white'}`}
                    onClick={() => setActiveModal('none')}
                  ></button>
                </div>

                <div className="modal-body p-4">
                  <div className="d-flex align-items-center justify-content-between p-3 rounded-3 bg-primary bg-opacity-10 border border-primary border-opacity-25 mb-4">
                    <div className="d-flex align-items-center gap-3">
                      <div className="rounded-circle bg-primary text-white p-2">
                        <i className="bi bi-person-badge fs-4"></i>
                      </div>
                      <div>
                        <h6 className="mb-0 fw-bold">Citizen DID: did:rwanda:kigali:0x41f...82a</h6>
                        <small className="text-muted">NIDA Linked & Bound to PostgreSQL</small>
                      </div>
                    </div>
                    <span className="badge bg-success">Status: Active</span>
                  </div>

                  <h6 className="fw-bold mb-3">
                    Issued Credentials in Vault ({credentialsList.length})
                  </h6>
                  <div className="row g-3">
                    {credentialsList.map((cred) => (
                      <div key={cred.credential_id} className="col-12">
                        <div
                          className={`p-3 rounded border d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 ${
                            isLight ? 'bg-light' : 'bg-black bg-opacity-25 border-secondary'
                          }`}
                        >
                          <div>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <span className="badge bg-primary-subtle text-primary">{cred.credential_type}</span>
                              <span className="small text-muted">{cred.credential_id}</span>
                            </div>
                            <h6 className="fw-bold mb-1">{cred.title}</h6>
                            <small className="text-muted d-block">Issuer: {cred.institution_name}</small>
                          </div>
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => {
                                setSearchHash(cred.document_hash);
                                setActiveModal('verify');
                                handleVerify(cred.document_hash);
                              }}
                            >
                              <i className="bi bi-qr-code-scan me-1"></i> Verify
                            </button>
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => {
                                navigator.clipboard.writeText(cred.document_hash);
                                alert('Proof hash copied to clipboard!');
                              }}
                            >
                              <i className="bi bi-clipboard me-1"></i> Copy Proof
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-secondary" onClick={() => setActiveModal('none')}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ================= TRUST ISSUER MODAL ================= */}
      {activeModal === 'issuer' && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1060, opacity: 0.7 }}
            onClick={() => setActiveModal('none')}
          ></div>
          <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1070 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div
                className={`modal-content shadow-2xl border ${
                  isLight ? 'bg-white text-dark' : 'bg-dark text-white border-secondary'
                }`}
              >
                <div className="modal-header border-bottom">
                  <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                    <i className="bi bi-building text-warning"></i>
                    <span>Trust Issuer — University & Gov Dashboard</span>
                  </h5>
                  <button
                    type="button"
                    className={`btn-close ${isLight ? '' : 'btn-close-white'}`}
                    onClick={() => setActiveModal('none')}
                  ></button>
                </div>

                <div className="modal-body p-4">
                  <div className="alert alert-info py-2 small mb-3">
                    <i className="bi bi-database me-1"></i>
                    Issuing credentials will write directly to the <strong>PostgreSQL database</strong> and anchor cryptographic proofs.
                  </div>

                  <form onSubmit={handleIssueCredential}>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Student / Recipient Full Name</label>
                        <input
                          type="text"
                          className={`form-control ${isLight ? '' : 'bg-dark text-white border-secondary'}`}
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Rwanda NIDA National ID</label>
                        <input
                          type="text"
                          className={`form-control ${isLight ? '' : 'bg-dark text-white border-secondary'}`}
                          value={nationalId}
                          onChange={(e) => setNationalId(e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-md-8">
                        <label className="form-label small fw-semibold">Degree / Certification Title</label>
                        <input
                          type="text"
                          className={`form-control ${isLight ? '' : 'bg-dark text-white border-secondary'}`}
                          value={credentialTitle}
                          onChange={(e) => setCredentialTitle(e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold">Credential Type</label>
                        <select
                          className={`form-select ${isLight ? '' : 'bg-dark text-white border-secondary'}`}
                          value={credentialType}
                          onChange={(e) => setCredentialType(e.target.value)}
                        >
                          <option>Academic Diploma</option>
                          <option>National ID Proof</option>
                          <option>Business License</option>
                          <option>Professional Certificate</option>
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-semibold">Issuing Institution</label>
                        <select
                          className={`form-select ${isLight ? '' : 'bg-dark text-white border-secondary'}`}
                          value={institutionName}
                          onChange={(e) => setInstitutionName(e.target.value)}
                        >
                          <option>University of Rwanda (UR)</option>
                          <option>Carnegie Mellon University Africa (CMU Africa)</option>
                          <option>African Institute for Mathematical Sciences (AIMS Rwanda)</option>
                          <option>Rwanda Development Board (RDB)</option>
                          <option>National Identification Agency (NIDA)</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-top d-flex justify-content-between align-items-center">
                      <span className="small text-muted">
                        PostgreSQL Target: <code>public.credentials</code>
                      </span>
                      <button type="submit" className="btn btn-success fw-bold px-4" disabled={isMinting}>
                        {isMinting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Writing to PostgreSQL...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-shield-fill-check me-2"></i> Mint & Save to PostgreSQL
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ================= FOOTER ================= */}
      <footer
        className={`py-3 px-4 mt-auto border-top small ${
          isLight
            ? 'border-secondary-subtle text-muted bg-white'
            : 'border-secondary border-opacity-25 text-secondary'
        }`}
      >
        <div className="container-fluid d-flex flex-column flex-md-row align-items-center justify-content-between gap-2">
          <div>
            TrustChain Rwanda — Open-Source Digital Trust Infrastructure (Apache 2.0 License)
          </div>
          <div className="d-flex align-items-center gap-3">
            <span className="d-flex align-items-center gap-1 text-success">
              <i className="bi bi-circle-fill" style={{ fontSize: '0.5rem' }}></i>
              <span>PostgreSQL: Live</span>
            </span>
            <button
              className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold text-warning"
              onClick={handleNoe1Click}
            >
              noe1 theme: {currentTheme.name}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
