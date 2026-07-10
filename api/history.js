import { supabaseAdmin } from './supabase.js';

export default async function handler(request, response) {
  // CORS headers
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method Not Allowed. Please use GET.' });
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

  try {
    const { data: dbHistory, error } = await supabaseAdmin
      .from('diary_history')
      .select('*')
      .eq('user_id', userId)
      .order('key', { ascending: false });

    if (error) throw error;

    // app.js 가 기대하는 JSON 규격으로 변환
    const historyList = (dbHistory || []).map(item => ({
      key: item.key,
      content: item.content,
      aiResponse: item.ai_response
    }));

    return response.status(200).json({ success: true, history: historyList });
  } catch (error) {
    console.error("Failed to retrieve diary history from Supabase:", error);
    return response.status(500).json({ error: error.message });
  }
}
