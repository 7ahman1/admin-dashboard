const supabaseUrl = "https://wvfqmbwazpjbiutijlqs.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2ZnFtYndhenBqYml1dGlqbHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNzgxNTQsImV4cCI6MjA5NTk1NDE1NH0.W7oh47HhgIVixJ0iZT4tKOa_MxTzwfsa0v4RlyQOgCs";

let client = null;
let retryInit = null;

function initializeSupabaseClient() {
  // Avoid re-initialization
  if (client) return client;
  
  if (typeof supabase !== "undefined" && supabase.createClient) {
    try {
      client = supabase.createClient(supabaseUrl, supabaseKey);
      // Clean up retry timer if it exists
      if (retryInit) {
        clearInterval(retryInit);
        retryInit = null;
      }
      console.log("✅ Supabase client initialized successfully");
      return client;
    } catch (error) {
      console.error("❌ Failed to initialize Supabase client:", error);
      return null;
    }
  }
  
  return null;
}

// Initialize on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeSupabaseClient);
} else {
  // DOM already loaded
  initializeSupabaseClient();
}

// If still not initialized after DOM load, wait for window load
if (!client) {
  window.addEventListener("load", initializeSupabaseClient, { once: true });
}
