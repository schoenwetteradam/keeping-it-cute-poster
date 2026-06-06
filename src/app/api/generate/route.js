import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const employeeName = formData.get('employeeName')
    const context = formData.get('context')
    const platforms = JSON.parse(formData.get('platforms'))
    const file = formData.get('file') // may be null

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    // Build the message content
    const content = []

    // If there's an image, include it
    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')
      const mediaType = file.type

      // Only include image types (videos can't be sent to Claude vision)
      if (mediaType.startsWith('image/')) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64,
          },
        })
      }
    }

    const platformDescriptions = {
      facebook: 'Facebook - conversational, warm, can be longer (up to 400 words), use emojis sparingly, personal and community-focused',
      instagram: 'Instagram - visually descriptive, energetic, 150-220 words max, heavy use of relevant emojis, end with 20-25 hashtags relevant to hair/beauty/salon',
      linkedin: 'LinkedIn - professional yet personable, 100-200 words, minimal emojis, focus on craft/skill/professionalism, no hashtag spam (3-5 max relevant ones)',
    }

    const platformsToGenerate = platforms.filter(p => ['facebook', 'instagram', 'linkedin'].includes(p))

    const prompt = `You are a social media copywriter for a hair salon employee named ${employeeName} at "Keeping It Cute Salon & Spa".

Your job is to write social media posts that sound AUTHENTICALLY like ${employeeName} - a passionate, skilled salon professional. The posts should feel personal, genuine, and NOT like corporate marketing copy.

Context about this post: ${context || 'No additional context provided.'}
${file && file.type && file.type.startsWith('image/') ? 'Note: An image has been provided - reference it naturally in the posts.' : ''}

Generate posts for these platforms:
${platformsToGenerate.map(p => `- ${platformDescriptions[p]}`).join('\n')}

IMPORTANT GUIDELINES:
- Write in first person as ${employeeName}
- Sound like a real person, not a brand account
- Show genuine passion for the craft
- Be specific and descriptive about hair/beauty work
- For Facebook: warm, story-telling, community feel
- For Instagram: exciting, visual, emoji-rich, end with hashtag block
- For LinkedIn: professional pride in craft, skill showcase

Return ONLY a valid JSON object with no markdown formatting, no code blocks, just raw JSON like this:
{"facebook": "post text here", "instagram": "post text here", "linkedin": "post text here"}

Only include keys for the requested platforms.`

    content.push({ type: 'text', text: prompt })

    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2000,
      messages: [{ role: 'user', content }],
    })

    const responseText = message.content[0].text

    // Parse JSON response
    let posts
    try {
      posts = JSON.parse(responseText)
    } catch {
      // Try to extract JSON if there's extra text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        posts = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Failed to parse AI response')
      }
    }

    return NextResponse.json({ posts })
  } catch (error) {
    console.error('Generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate posts' },
      { status: 500 }
    )
  }
}
