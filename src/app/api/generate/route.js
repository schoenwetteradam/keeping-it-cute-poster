import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { uploadToR2, keyFromUrl } from '@/lib/storage'
import { cleanText, validateUpload } from '@/lib/validation'
import { rateLimit } from '@/lib/rateLimit'
import { v4 as uuidv4 } from 'uuid'

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
  facebook: 'Conversational and warm. Use a short story, readable paragraphs, restrained emojis, and a natural call to action. Aim for 120-250 words. Do NOT add hashtags to Facebook posts.',
  instagram: 'Visual and energetic. Lead with a strong first-line hook (it appears before "more"). Use readable line breaks. End with a line break then 10-15 highly targeted hashtags — mix niche tags (#btccuts #protectivestyles) with local and salon tags. Aim for 90-180 caption words before hashtags.',
  linkedin: 'Professional but human. Emphasize craft, entrepreneurship, service, or professional growth. Open with a hook. Use at most two emojis. End with 3-5 focused hashtags. Aim for 90-160 words.',
}

const HASHTAG_SETS = {
  booth_renters: {
    instagram: '#boothrental #salonlife #independentstylist #beautyentrepreneur #salonowner #hairstylistlife #btccuts #modernsalon #suitelife #beautybusiness',
    linkedin: '#boothrental #beautyentrepreneur #salonlife #hairstylist',
  },
  new_clients: {
    instagram: '#newhair #hairtransformation #hairgoals #salonlife #btccuts #modernsalon #haircolor #freshcut #naturalhair #haircare',
    linkedin: '#salon #haircare #beauty #clientlove',
  },
  showcase: {
    instagram: '#btccuts #hairinspo #hairtransformation #hairgoals #naturalhair #salonlife #modernsalon #haircolor #colorist #hairart',
    linkedin: '#craftandskill #beautyprofessional #hairstylist #salonwork',
  },
  community: {
    instagram: '#salonteam #beautycommunity #haircare #salonlife #tipsandtricks #behindthechair #hairadvice #beautytips #naturalhair',
    linkedin: '#beauty #community #teamwork #salonsuccess',
  },
}

async function readBrandSettings() {
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
  const rows = await db.settings.getAll()
  for (const row of rows) defaults[row.key] = row.value
  return defaults
}

const UPLOAD_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
}

async function saveUploadedMedia(file, bytes, employeeName) {
  const id = uuidv4()
  const filename = `media/${id}${UPLOAD_EXTENSIONS[file.type]}`
  const url = await uploadToR2(filename, bytes, file.type)
  await db.media.insert({
    id, filename, original_name: file.name, mime_type: file.type, size: file.size, uploaded_by: employeeName,
  })
  return url
}

async function addImageFromLibrary(content, libraryImageUrl) {
  if (!libraryImageUrl) return
  const key = keyFromUrl(libraryImageUrl)
  const row = key ? await db.media.getByFilename(key) : null
  if (!row?.mime_type?.startsWith('image/')) return
  const res = await fetch(libraryImageUrl)
  if (!res.ok) return
  const bytes = Buffer.from(await res.arrayBuffer())
  content.push({
    type: 'image',
    source: {
      type: 'base64',
      media_type: row.mime_type,
      data: bytes.toString('base64'),
    },
  })
}

export async function POST(request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!rateLimit(ip, 5)) {
      return NextResponse.json({ error: 'Too many requests. Please wait a minute and try again.' }, { status: 429 })
    }

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
      mediaUrl = await saveUploadedMedia(file, Buffer.from(bytes), employeeName)
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
      await addImageFromLibrary(content, libraryImageUrl)
    }

    const brand = await readBrandSettings()
    const goalInfo = GOALS[goal]

    const platformSections = (await Promise.all(platforms.map(async platform => {
      const examples = await db.posts.topExamples(platform, goal, 3)
      const hashtagHint = HASHTAG_SETS[goal]?.[platform]
        ? `\nSuggested hashtag pool (pick the most relevant): ${HASHTAG_SETS[goal][platform]}`
        : ''
      const examplesText = examples.length
        ? examples.map((example, index) => {
            const feedback = example.rating_notes
              ? example.rating_notes.split(' | ').filter(Boolean).join('; ')
              : ''
            return `Example ${index + 1} (${example.variant || 'balanced'}, rating ${Number(example.avg_rating || 0).toFixed(1)})${feedback ? ` — team feedback: "${feedback}"` : ''}:\n${example.post_text}`
          }).join('\n\n')
        : 'No proven examples yet. Establish a natural, memorable salon voice.'
      return `### ${platform}
${PLATFORM_GUIDANCE[platform]}${hashtagHint}

Past examples that earned strong ratings or engagement:
${examplesText}`
    }))).join('\n\n')

    const prompt = `You are the in-house social media strategist for ${brand.salonName}.

## Brand identity
Voice: ${brand.voice}
Services offered: ${brand.services}
Location: ${brand.location || 'Not specified — keep location references general'}
Booking URL: ${brand.bookingUrl || 'Not specified — omit booking links'}
${brand.signaturePhrases ? `Signature phrases to weave in naturally: ${brand.signaturePhrases}` : ''}
Phrases and claims to NEVER use: ${brand.avoidPhrases || 'generic corporate filler, vague superlatives'}
${brand.boothBenefits ? `Booth renter benefits (use only for booth_renters goal): ${brand.boothBenefits}` : ''}

## This post
Written by: ${employeeName} (write in their first-person voice)
Goal: ${goalInfo.summary}
Strategy: ${goalInfo.guidance}
Post notes from ${employeeName}: ${context || 'None provided — keep claims conservative and do not invent details.'}
${mediaUrl ? 'Photo/video is attached. Reference only what is clearly visible or stated in the notes.' : 'No media attached — do not describe visuals.'}

## Platform requirements
${platformSections}

## Instructions
Write three genuinely distinct directions for every platform:
- balanced: polished, warm, broadly appealing — a reliable safe bet
- personal: conversational, story-driven, intimate — reads like a real person
- bold: confident opener, higher energy, stronger hook — still 100% truthful

Hard rules:
- First-person voice as ${employeeName} throughout
- Never invent prices, availability, credentials, results, timelines, or client quotes
- No generic filler phrases ("passionate about", "I take pride in", "elevate your look")
- Every variant must be publish-ready as written
- Return ONLY raw valid JSON — no markdown, no commentary

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

    const postIds = {}
    const rows = []
    for (const platform of platforms) {
      postIds[platform] = {}
      for (const variant of ['balanced', 'personal', 'bold']) {
        const postText = cleanText(posts?.[platform]?.[variant], 8000)
        if (!postText) continue
        const id = uuidv4()
        rows.push({
          id, employee_name: employeeName, platform, goal, post_text: postText, context,
          media_url: mediaUrl, variant,
        })
        postIds[platform][variant] = id
        posts[platform][variant] = postText
      }
    }
    if (rows.length) await db.posts.insertMany(rows)

    return NextResponse.json({ posts, postIds, mediaUrl })
  } catch (error) {
    console.error('Generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate posts.' },
      { status: 500 }
    )
  }
}
