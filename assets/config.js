/* One place to point the site at its backend.

   The anon key below is meant to be public — it is the key client code is
   supposed to carry. It grants nothing on its own: `briefs` has row level
   security on with no policies at all, so this key can read and write exactly
   nothing there. Everything that touches the table goes through an Edge
   Function holding the service role key, which never leaves the server. */
export const SUPABASE_URL = 'https://slkyivycuxbjigwqpyzd.supabase.co';
export const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsa3lpdnljdXhiamlnd3FweXpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1MTIxMTIsImV4cCI6MjEwMzA4ODExMn0.jxA5h4ntrF4RNzn9Aw0gATM05x4RXjtkMVWyKAp8J7Q';
export const API = SUPABASE_URL + '/functions/v1';
