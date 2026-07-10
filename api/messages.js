import { supabaseAdmin } from './supabase.js';

export default async function handler(request, response) {
  // CORS headers
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // Get token from Authorization header
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return response.status(401).json({ error: "Missing or invalid authorization token" });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return response.status(401).json({ error: "Unauthorized access: " + (authError?.message || "Invalid token") });
  }

  // GET: Fetch the latest 50 chat messages
  if (request.method === 'GET') {
    try {
      const { data: messages, error } = await supabaseAdmin
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Reverse to chronological order (ascending) for chat display
      const chronologicalMessages = messages.reverse();

      return response.status(200).json({ success: true, messages: chronologicalMessages });
    } catch (error) {
      console.error("Failed to fetch messages from Supabase:", error);
      return response.status(500).json({ error: error.message });
    }
  }

  // POST: Send a new message
  if (request.method === 'POST') {
    try {
      const { content } = request.body;

      if (!content || !content.trim()) {
        return response.status(400).json({ error: "Message content cannot be empty." });
      }

      const nickname = user.user_metadata?.nickname || user.user_metadata?.full_name || user.email.split('@')[0];

      const { data: insertedMsg, error } = await supabaseAdmin
        .from('messages')
        .insert({
          user_id: user.id,
          user_email: user.email,
          user_nickname: nickname,
          content: content.trim()
        })
        .select()
        .single();

      if (error) throw error;

      return response.status(200).json({ success: true, message: insertedMsg });
    } catch (error) {
      console.error("Failed to save message to Supabase:", error);
      return response.status(500).json({ error: error.message });
    }
  }

  return response.status(405).json({ error: "Method Not Allowed" });
}
