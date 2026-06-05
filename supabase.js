const supabaseUrl = "https://wvfqmbwazpjbiutijlqs.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2ZnFtYndhenBqYml1dGlqbHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNzgxNTQsImV4cCI6MjA5NTk1NDE1NH0.W7oh47HhgIVixJ0iZT4tKOa_MxTzwfsa0v4RlyQOgCs";

let client = null;

function initializeSupabaseClient() {
  if (client) return client;
  
  if (typeof supabase !== "undefined" && supabase?.createClient) {
    try {
      client = supabase.createClient(supabaseUrl, supabaseKey);
      console.log("✅ Supabase client initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Supabase client:", error);
      client = null;
    }
  }
  return client;
}

// Initialize immediately if supabase is available
initializeSupabaseClient();

// Fallback: Initialize when supabase library loads
if (!client) {
  const checkSupabase = () => {
    if (typeof supabase !== "undefined" && !client) {
      initializeSupabaseClient();
    }
  };
  
  // Check periodically for a short time
  const checker = setInterval(checkSupabase, 100);
  setTimeout(() => clearInterval(checker), 3000);
}
