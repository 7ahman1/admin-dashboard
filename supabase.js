const supabaseUrl = "https://wvfqmbwazpjbiutijlqs.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2ZnFtYndhenBqYml1dGlqbHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNzgxNTQsImV4cCI6MjA5NTk1NDE1NH0.W7oh47HhgIVixJ0iZT4tKOa_MxTzwfsa0v4RlyQOgCs";


const client = supabase.createClient(supabaseUrl, supabaseKey);const supabaseUrl = "https://wvfqmbwazpjbiutijlqs.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2ZnFtYndhenBqYml1dGlqbHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNzgxNTQsImV4cCI6MjA5NTk1NDE1NH0.W7oh47HhgIVixJ0iZT4tKOa_MxTzwfsa0v4RlyQOgCs";

let client = null;
let initAttempts = 0;
const maxRetries = 5;

function initializeSupabaseClient() {
  if (client) return client;
  
  if (typeof supabase !== "undefined" && supabase.createClient) {
    try {
      client = supabase.createClient(supabaseUrl, supabaseKey);
      console.log("✅ Supabase client initialized successfully");
      return client;
    } catch (error) {
      console.error("❌ Failed to initialize Supabase client:", error);
      return null;
    }
  }
  
  return null;
}

// Try to initialize immediately
initializeSupabaseClient();

// If not initialized, wait for Supabase library to load
if (!client) {
  const retryInit = setInterval(() => {
    initAttempts++;
    if (initializeSupabaseClient()) {
      clearInterval(retryInit);
    } else if (initAttempts >= maxRetries) {
      clearInterval(retryInit);
      console.warn("⚠️ Could not initialize Supabase client after multiple attempts");
    }
  }, 500);

  // Also try on load event
  window.addEventListener("load", () => {
    if (!client) {
      initializeSupabaseClient();
    }
  });
}
