// File: js/supabase-client.js

// GANTI NILAI DI BAWAH INI DENGAN KREDENSIAL DARI DASHBOARD SUPABASE ANDA
const SUPABASE_URL = 'https://karmsqwusyqagyarglgw.supabase.co';
const SUPABASE_KUNCI_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imthcm1zcXd1c3lxYWd5YXJnbGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2OTM5MjcsImV4cCI6MjA4OTI2OTkyN30.yCYAjLD8VpRO8G_6lQSQCA1hNf8z3q5m24ENSnf-NNU';

// Inisialisasi Supabase Client
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KUNCI_ANON);
