import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { cleanText, validateUpload } from '@/lib/validation'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs'

const UPLOADS_DIR = path.join(process.cwd(), 'uploads')
const SUPPORTED_PLATFORMS = new Set(['facebook', 'instagram', 'linkedin'])

const GOALS = {
  booth_renters: {
    summary: 'Attract licensed beauty professionals who may want to rent a booth.',
    guidance: 'Speak peer-to-peer about independence, community, support, professionalism, location, and business growth. Use a natural invitation to ask about availability.',
  },
  new_clients: {
    summary: 'Attract new salon clients.',
    guidance: 'Make the experience feel welcoming and specific. Describe the result and include a clear, natural booking action.',
  },
  showcase: {
    summary: 'Showcase excellent work without forcing a sales pitch.',
    guidance: 'Describe the transformation, technique, creative decisions, and client story. Let genuine pride in the craft carry the post.',
  },
  community: {
    summary: 'Build a stronger local and online community.',
    guidance: 'Share something useful, celebratory, personal, or discussion-worthy. Prioritize connection over conversion.',
  },
}

const PLATFORM_GUIDANCE = {
  facebook: 'Conversational and warm. Use a short story, readable paragraphs, restrained emojis, and a natural call to action. Aim for 120-250 words.',
  instagram: 'Visual and energetic. Lead with a hook, use readable line breaks, and finish with 8-15 highly relevant hashtags rather than a generic block. Aim for 90-180 caption words.',
  linkedin: 'Professional but human. Emphasize craft, entrepreneurship, service, or professional growth. Use no more than two emojis and finish with 3-5 focused hashtags. Aim for 90-160 words.',
}

function readBrandSettings() {
  const defaults = {
    salonName: 'Keeping It Cute Salon & Spa',
    voice: 'Warm, confident, welcoming, playful, specific, and never corporate.',
    services: 'Hair, beauty, salon, and spa services.',
    location: '',
    bookingUrl: '',
    signaturePhrases: '',
    avoidPhrases: 'I am passionate about; I take pride in; elevate your look',
    boothBenefits: 'Supportive culture, flexible schedules, professional environment, and room to grow.',
  }
  const rows = db.prepare('SELECT key, value FROM brand_settings').all()
  for (const row of rows) defaults[row.key] = row.value
  return defaults
}

function saveUploadedMedia(file, bytes, employeeName) {
  const extensions = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
  }
  const id = uuidv4()
  const filename = `${id}${extensions[file.type]}`
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), Buffer.from(bytes))
  db.prepare(`
    INSERT INTO media (id, filename, original_name, mime_type, size, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, filename, file.name, file.type, file.size, employeeName)
  return `/uploads/${filename}`
}

function addImageFromLibrary(content, libraryImageUrl) {
  if (!libraryImageUrl) return
  const filename = path.basename(libraryImageUrl)
  const row = db.prepare('SELECT mime_type FROM media WHERE filename = ?').get(filename)
  if (!row?.mime_type?.startsWith('image/')) return
  const filepath = path.join(UPLOADS_DIR, filename)
  if (!fs.existsSync(filepath)) return
  content.push({
    type: 'image',
    source: {
      type: 'base64',
      media_type: row.mime_type,
      data: fs.readFileSync(filepath).toString('base64'),
    },
  })
}

export async function POST(request) {
  try {
    const formData = await request.formData()
    const employeeName = cleanText(formData.get('employeeName'), 100)
    const context = cleanText(formData.get('context'), 4000)
    const goal = GOALS[formData.get('goal')] ? formData.get('goal') : 'showcase'
    const platforms = JSON.parse(formData.get('platforms') || '[]')
      .filter(platform => SUPPORTED_PLATFORMS.has(platform))
    const file = formData.get('file')
    const libraryImageUrl = cleanText(formData.get('libraryImageUrl'), 500)

    if (!employeeName) {
      return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 })
    }
    if (platforms.length === 0) {
      return NextResponse.json({ error: 'Select at least one platform.' }, { status: 400 })
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 503 })
    }

    const content = []
    let mediaUrl = libraryImageUrl

    if (file && file.size > 0) {
      const validationError = validateUpload(file)
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 })
      }
      const bytes = await file.arrayBuffer()
      mediaUrl = saveUploadedMedia(file, bytes, employeeName)
      if (file.type.startsWith('image/')) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: file.type,
            data: Buffer.from(bytes).toString('base64'),
          },
        })
      }
    } else {
      addImageFromLibrary(content, libraryImageUrl)
    }

    const brand = readBrandSettings()
    const goalInfo = GOALS[goal]
    const exampleQuery = db.prepare(`
      SELECT gp.post_text, gp.variant, gp.likes, gp.comments, gp.shares,
             AVG(pr.rating) AS avg_rating
      FROM generated_posts gp
      LEFT JOIN post_ratings pr ON pr.post_id = gp.id
      WHERE gp.platform = ? AND gp.goal = ?
      GROUP BY gp.id
      HAVING avg_rating >= 4 OR (gp.likes + gp.comments * 2 + gp.shares * 3) >= 15
      ORDER BY avg_rating DESC, (gp.likes + gp.comments * 2 + gp.shares * 3) DESC
      LIMIT 3
    `)

    const platformSections = platforms.map(platform => {
      const examples = exampleQuery.all(platform, goal)
      const examplesText = examples.length
        ? examples.map((example, index) => (
          `Example ${index + 1} (${example.variant || 'balanced'}, rating ${Number(example.avg_rating || 0).toFixed(1)}):\n${example.post_text}`
        )).join('\n\n')
        : 'No proven examples yet. Establish a natural, memorable salon voice.'
      return `### ${platform}
${PLATFORM_GUIDANCE[platform]}

Past examples that earned strong ratings or engagement:
${examplesText}`
    }).join('\n\n')

    const prompt = `You are the social media strategist for ${brand.salonName}.

Brand voice: ${brand.voice}
Services: ${brand.services}
Location: ${brand.location || 'Not specified'}
Booking URL: ${brand.bookingUrl || 'Not specified'}
Signature phrases: ${brand.signaturePhrases || 'None specified'}
Never use these phrases: ${brand.avoidPhrases || 'Generic corporate filler'}
Booth benefits: ${brand.boothBenefits}

Employee: ${employeeName}
Goal: ${goalInfo.summary}
Goal guidance: ${goalInfo.guidance}
Post notes: ${context || 'No extra notes were provided. Keep claims conservative and do not invent details.'}
${mediaUrl ? 'Media is attached. Refer only to details that are clearly visible or included in the notes.' : 'No media is attached.'}

${platformSections}

For every requested platform, write three genuinely different options:
- balanced: polished, warm, and broadly useful
- personal: conversational, story-led, and intimate
- bold: a strong truthful hook with more energy

Rules:
- Write in first person as ${employeeName}.
- Never invent prices, availability, credentials, results, or client quotes.
- Avoid generic marketing filler.
- Keep every option ready to publish.
- Return only raw valid JSON.

Required JSON shape:
${JSON.stringify(Object.fromEntries(platforms.map(platform => [
  platform,
  { balanced: '...', personal: '...', bold: '...' },
])))}
`
    content.push({ type: 'text', text: prompt })

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-8',
      max_tokens: 5000,
      messages: [{ role: 'user', content }],
    })
    const responseText = message.content.find(item => item.type === 'text')?.text || ''
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('The AI returned an invalid response. Please try again.')
    const posts = JSON.parse(jsonMatch[0])

    const insert = db.prepare(`
      INSERT INTO generated_posts
        (id, employee_name, platform, goal, post_text, context, media_url, variant)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const postIds = {}
    for (const platform of platforms) {
      postIds[platform] = {}
      for (const variant of ['balanced', 'personal', 'bold']) {
        const postText = cleanText(posts?.[platform]?.[variant], 8000)
        if (!postText) continue
        const id = uuidv4()
        insert.run(id, employeeName, platform, goal, postText, context, mediaUrl, variant)
        postIds[platform][variant] = id
        posts[platform][variant] = postText
      }
    }

    return NextResponse.json({ posts, postIds, mediaUrl })
  } catch (error) {
    console.error('Generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate posts.' },
      { status: 500 }
    )
  }
}
