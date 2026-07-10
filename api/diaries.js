import { supabaseAdmin } from './supabase.js';

export default async function handler(request, response) {
  // CORS headers
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
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

  const userId = user.id;

  // GET: Fetch all diaries for the logged in user
  if (request.method === 'GET') {
    try {
      const { data: entries, error } = await supabaseAdmin
        .from('diaries')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true });

      if (error) throw error;

      // app.js가 기대하는 데이터 포맷(CamelCase 감정 키 이름 등)으로 매핑
      const formattedEntries = entries.map(item => ({
        date: item.date,
        content: item.content,
        weather: item.weather,
        primaryEmotion: item.primary_emotion,
        positivity: item.positivity,
        keywords: item.keywords || [],
        aiResponse: item.ai_response,
        recommendation: item.recommendation,
        createdAt: item.created_at
      }));

      return response.status(200).json({ success: true, entries: formattedEntries });
    } catch (error) {
      console.error("Failed to fetch diaries from Supabase:", error);
      return response.status(500).json({ error: error.message });
    }
  }

  // POST: Save or update a single diary entry for the logged in user
  if (request.method === 'POST') {
    try {
      const { entry } = request.body;

      if (!entry || !entry.date) {
        return response.status(400).json({ error: "Invalid diary entry data." });
      }

      const { data, error } = await supabaseAdmin
        .from('diaries')
        .upsert({
          user_id: userId,
          date: entry.date,
          content: entry.content,
          weather: entry.weather,
          primary_emotion: entry.primaryEmotion,
          positivity: entry.positivity,
          keywords: entry.keywords,
          ai_response: entry.aiResponse,
          recommendation: entry.recommendation
        });

      if (error) throw error;

      return response.status(200).json({ success: true });
    } catch (error) {
      console.error("Failed to save diary to Supabase:", error);
      return response.status(500).json({ error: error.message });
    }
  }

  return response.status(405).json({ error: "Method Not Allowed" });
}
