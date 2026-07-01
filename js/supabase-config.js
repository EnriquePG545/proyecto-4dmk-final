// =========================================================
// CONFIGURACIÓN SUPABASE - 4DMK
// =========================================================

// URL correcta del proyecto Supabase
const SUPABASE_URL = "https://ooysgrjgdyifmnkrtgvi.supabase.co";

// Clave pública anon de Supabase
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXNncmpnZHlpZm1ua3J0Z3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NjE5MTgsImV4cCI6MjA5NDAzNzkxOH0.Elef44jw69U7VGrtqJrMXPpMXUeQQYnZn3gIuGamSnw";

// Crear cliente Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("Supabase conectado correctamente:", SUPABASE_URL);