export default function handler(req, res) {
  res.json({
    openai_key_present: !!process.env.OPENAI_API_KEY,
    key_first5: process.env.OPENAI_API_KEY?.slice(0, 5) || null
  });
}
