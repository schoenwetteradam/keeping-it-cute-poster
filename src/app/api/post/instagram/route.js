import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { cleanText, isPublicHttpUrl } from '@/lib/validation'

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v19.0'

export async function POST(request) {
  try {
    const { message, imageUrl, postId: generatedPostId } = await request.json()
    const businessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
    const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN

    if (!businessAccountId || !accessToken) {
      return NextResponse.json(
        { error: 'Instagram is not configured. Add the account ID and access token to .env.local.' },
        { status: 400 }
      )
    }
    if (!cleanText(message, 2200)) {
      return NextResponse.json({ error: 'Caption is required.' }, { status: 400 })
    }
    if (!isPublicHttpUrl(imageUrl)) {
      return NextResponse.json(
        { error: 'Instagram requires an image hosted at a public HTTPS URL. Localhost images cannot be published.' },
        { status: 400 }
      )
    }

    const containerRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${businessAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: cleanText(message, 2200),
          access_token: accessToken,
        }),
      }
    )
    const containerData = await containerRes.json()
    if (!containerRes.ok || containerData.error) {
      return NextResponse.json(
        { error: containerData.error?.message || 'Failed to create the Instagram media container.' },
        { status: containerRes.status || 500 }
      )
    }

    const publishRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${businessAccountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerData.id,
          access_token: accessToken,
        }),
      }
    )
    const publishData = await publishRes.json()
    if (!publishRes.ok || publishData.error) {
      return NextResponse.json(
        { error: publishData.error?.message || 'Failed to publish the Instagram post.' },
        { status: publishRes.status || 500 }
      )
    }

    if (generatedPostId) {
      db.prepare(
        "UPDATE generated_posts SET posted = 1, external_post_id = ?, posted_at = datetime('now') WHERE id = ?"
      ).run(publishData.id, generatedPostId)
    }
    return NextResponse.json({
      success: true,
      postId: publishData.id,
      url: 'https://www.instagram.com/',
    })
  } catch (error) {
    console.error('Instagram post error:', error)
    return NextResponse.json({ error: error.message || 'Failed to post to Instagram.' }, { status: 500 })
  }
}
