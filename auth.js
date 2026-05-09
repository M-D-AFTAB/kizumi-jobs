// ═══════════════════════════════════════════════════════════
//  auth.js  —  Firebase Authentication Layer for Kizumi Jobs
//  Import this script in every page that needs auth awareness
// ═══════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ── Firebase config ──────────────────────────────────────
// These values come from your .env file at build time,
// OR you paste them directly here for a static/Vercel deploy.
// See SETUP.md for instructions.
const firebaseConfig = {
  apiKey:            window.__ENV__?.FIREBASE_API_KEY            || "AIzaSyAe7x5VyFDTHSsNPq6HhYb3z-NZt-5-4FI",
  authDomain:        window.__ENV__?.FIREBASE_AUTH_DOMAIN        || "kizumi-jobs.firebaseapp.com.firebaseapp.com",
  projectId:         window.__ENV__?.FIREBASE_PROJECT_ID         || "kizumi-jobs",
  storageBucket:     window.__ENV__?.FIREBASE_STORAGE_BUCKET     || "kizumi-jobs.firebasestorage.app",
  messagingSenderId: window.__ENV__?.FIREBASE_MESSAGING_SENDER_ID|| "342400140339",
  appId:             window.__ENV__?.FIREBASE_APP_ID             || "1:342400140339:web:11604ba565dbd20df38f46"
};

const app       = initializeApp(firebaseConfig);
const auth      = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// ── Theme ────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('kizumi-theme', theme);
}

function initTheme() {
  const saved = localStorage.getItem('kizumi-theme');
  if (saved) { applyTheme(saved); return; }
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light');
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
  updateThemeIcon();
}

function updateThemeIcon() {
  const btn = document.querySelector('.theme-toggle');
  if (!btn) return;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  btn.textContent = isDark ? '☀️' : '🌙';
  btn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
}

// ── Auth Guard (for protected pages) ────────────────────
// Call this on pages that REQUIRE login (e.g. index.html/dashboard)
function requireAuth(onAuthed) {
  document.body.classList.add('auth-checking');
  onAuthStateChanged(auth, (user) => {
    document.body.classList.remove('auth-checking');
    if (!user) {
      window.location.replace('login.html');
    } else {
      onAuthed(user);
    }
  });
}

// ── Redirect if already logged in (for login/signup pages)
function redirectIfAuthed(dest = 'dashboard.html') {
  onAuthStateChanged(auth, (user) => {
    if (user) window.location.replace(dest);
  });
}

// ── Sign out ─────────────────────────────────────────────
async function logout() {
  await signOut(auth);
  window.location.replace('login.html');
}

// ── Google sign-in ───────────────────────────────────────
async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

// ── Exports ──────────────────────────────────────────────
export {
  auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signInWithGoogle,
  requireAuth,
  redirectIfAuthed,
  logout,
  initTheme,
  toggleTheme,
  updateThemeIcon,
  applyTheme
};
