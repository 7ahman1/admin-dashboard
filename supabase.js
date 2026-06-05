const supabaseUrl = "https://wvfqmbwazpjbiutijlqs.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2ZnFtYndhenBqYml1dGlqbHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNzgxNTQsImV4cCI6MjA5NTk1NDE1NH0.W7oh47HhgIVixJ0iZT4tKOa_MxTzwfsa0v4RlyQOgCs";

let client = null;

// Create client immediately - Supabase CDN is loaded before this script
try {
  if (typeof supabase !== "undefined" && supabase.createClient) {
    client = supabase.createClient(supabaseUrl, supabaseKey);
    console.log("✅ Supabase client initialized");
  } else {
    console.warn("⚠️ Supabase library not available yet");
  }
} catch (error) {
  console.error("❌ Failed to initialize Supabase:", error);
}
