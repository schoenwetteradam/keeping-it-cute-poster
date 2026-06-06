import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const employeeName = formData.get('employeeName')
    const context = formData.get('context')
    const goal = formData.get('goal') || 'showcase'
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

    const goalInstructions = {
      booth_renters: {
        summary: 'attract booth renters — licensed stylists and beauty professionals who are looking for a chair or booth to rent',
        audience: 'other hair stylists, cosmetologists, estheticians, nail techs, and beauty pros who are independent or thinking about going independent',
        angle: `Speak stylist-to-stylist. Highlight what makes renting a booth at Keeping It Cute Salon & Spa amazing: the community, the vibe, the freedom of being your own boss, the support, the clientele in the area. Make them WANT to be part of this family. Mention things like flexible schedules, great location, supportive team culture, professional environment. Don't make it sound like an ad — make it sound like ${employeeName} genuinely loves working here and wants to share that with fellow beauty pros. A subtle call to action like "DM me if you're looking for a booth" or "reach out if you're ready to level up" works great.`,
        linkedinAngle: 'Position this as a professional opportunity. Speak to the business side: building your own clientele, setting your own rates, growing your brand under a reputable salon name. Stylists on LinkedIn are often business-minded — appeal to entrepreneurship and professional growth.',
        instagramHashtags: '#boothrental #salonlife #hairstylist #beautypro #independentstylist #salonbooth #cosmetologist #hairboss #keepingitcute #salonculture #boothrentals #hairsalon #beautyentrepreneur #stylistlife #hairstylistlife #licensedcosmetologist #salonowner #beautylife #hairpro #stylists',
      },
      new_clients: {
        summary: 'attract new salon clients — people looking for a great stylist or a new salon home',
        audience: 'potential clients: people who want a fresh look, are new to the area, are unhappy with their current stylist, or just want to treat themselves',
        angle: `Make them feel welcome and excited to book. Highlight the transformation, the experience, the vibe of the salon. Use warm, inviting language. Include a clear but natural call to action — "link in bio to book", "DM me to get on my books", "comment below if you want this look". Make the reader feel like booking with ${employeeName} would be a treat, not a chore.`,
        linkedinAngle: 'Keep it professional but warm — speak to the craft and quality of service. Good for reaching professionals who take their appearance seriously.',
        instagramHashtags: '#hairtransformation #newhair #salonlife #hairgoals #balayage #highlights #haircolor #brazilianblowout #keratin #keepingitcutesalon #hairsalon #booknow #hairinspo #hairofinstagram #freshcut #naturalhair #protectivestyles #healthyhair #haircare #salonvibes',
      },
      showcase: {
        summary: 'showcase beautiful work — a transformation, a new style, or a service — without a specific sales pitch',
        audience: 'current followers, fellow stylists, and anyone who appreciates great hair and beauty work',
        angle: `Let the work speak for itself. Be descriptive and passionate about the technique, the colors, the result. Tell the story behind it if there is one. Express genuine pride and joy in the craft. No hard sell — just authentic sharing of something ${employeeName} is proud of.`,
        linkedinAngle: 'Frame it as craft and skill — the artistry behind the work, what techniques were used, why this kind of work takes training and talent.',
        instagramHashtags: '#hairoftheday #hairgoals #hairtransformation #salonlife #keepingitcute #hairinspo #beautysalon #hairstylist #haircolor #hairart #fresh #hairofinstagram #transformationtuesday #hairtok #salonvibes #beautycommunity #hairporn #glam #hairlove #stylistlife',
      },
      community: {
        summary: 'build community — engage followers, share tips, celebrate the salon culture, or connect authentically',
        audience: 'existing followers, the local community, fellow beauty lovers, and anyone who follows the salon or stylist',
        angle: `Be real, warm, and human. Ask questions, share something personal about the journey, celebrate a milestone, give a tip, or hype up the team. Make followers feel like they're part of something. Community posts are about connection, not conversion — though genuine community always leads to more business over time.`,
        linkedinAngle: 'Share something meaningful about the industry, the business of beauty, or the community behind the salon. Thought leadership or authentic reflection works well here.',
        instagramHashtags: '#salonlife #beautycom #keepingitcute #hairsalon #salonculture #beautylife #haircommunity #salonteam #smallbusiness #localbusiness #beautytips #haircare #stylistlife #salonvibes #beautylover #hairenthusiast #salongoals #girlboss #beautybusiness #hairgang',
      },
    }

    const platformDescriptions = {
      facebook: 'Facebook — conversational, warm, up to 350 words, use emojis sparingly, personal storytelling tone, community-focused. End with a natural call to action suited to the goal.',
      instagram: 'Instagram — visually descriptive, energetic, 120-200 words of caption, then a line break, then a block of 20 relevant hashtags on their own lines. Heavy use of emojis throughout the caption.',
      linkedin: 'LinkedIn — professional yet personable, 100-180 words, 1-2 emojis max, focus on craft/skill/professionalism/entrepreneurship depending on goal. End with 3-5 targeted hashtags only.',
    }

    const goalInfo = goalInstructions[goal] || goalInstructions.showcase
    const platformsToGenerate = platforms.filter(p => ['facebook', 'instagram', 'linkedin'].includes(p))

    const prompt = `You are a social media copywriter for ${employeeName}, a stylist at "Keeping It Cute Salon & Spa".

## Your Goal
Write posts designed to: ${goalInfo.summary}

## Target Audience
${goalInfo.audience}

## How to write these posts
${goalInfo.angle}

For LinkedIn specifically: ${goalInfo.linkedinAngle}

## Employee Context
Name: ${employeeName}
Post context / notes: ${context || 'No additional context — use what you know about the goal to craft the post.'}
${file && file.type && file.type.startsWith('image/') ? 'An image was uploaded — reference what you see in it naturally within the post.' : ''}

## Platform Instructions
${platformsToGenerate.map(p => `### ${p}\n${platformDescriptions[p]}`).join('\n\n')}

For Instagram, use these hashtags as a starting point but adapt them to fit the content:
${goalInfo.instagramHashtags}

## Rules
- Write in first person as ${employeeName} — authentic, NOT corporate
- Match the tone to the goal and platform
- Make it feel like a real person wrote this, not a marketing team
- Do NOT use generic filler phrases like "I am passionate about" or "I take pride in"
- Be specific, vivid, and real

Return ONLY a valid JSON object with no markdown, no code blocks — raw JSON:
{"facebook": "...", "instagram": "...", "linkedin": "..."}

Only include keys for the requested platforms: ${platformsToGenerate.join(', ')}`

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
