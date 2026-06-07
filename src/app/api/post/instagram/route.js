import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { message, imageUrl } = await request.json()

    const businessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
    const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN

    if (!businessAccountId) {
      return NextResponse.json(
        { error: 'Instagram not configured — add INSTAGRAM_BUSINESS_ACCOUNT_ID to .env.local' },
        { status: 400 }
      )
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Instagram requires a publicly accessible image URL. Provide imageUrl in the request body.' },
        { status: 400 }
      )
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Instagram not configured — add FACEBOOK_PAGE_ACCESS_TOKEN to .env.local' },
        { status: 400 }
      )
    }

    // Step 1: Create media container
    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${businessAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: message,
          access_token: accessToken,
        }),
      }
    )

    const containerData = await containerRes.json()

    if (!containerRes.ok || containerData.error) {
      const errMsg = containerData.error?.message || 'Failed to create Instagram media container'
      return NextResponse.json({ error: errMsg }, { status: containerRes.status || 500 })
    }

    const creationId = containerData.id

    // Step 2: Publish the container
    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${businessAccountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: accessToken,
        }),
      }
    )

    const publishData = await publishRes.json()

    if (!publishRes.ok || publishData.error) {
      const errMsg = publishData.error?.message || 'Failed to publish Instagram post'
      return NextResponse.json({ error: errMsg }, { status: publishRes.status || 500 })
    }

    const postId = publishData.id
    return NextResponse.json({
      success: true,
      postId,
      url: `https://www.instagram.com/p/${postId}/`,
    })
  } catch (error) {
    console.error('Instagram post error:', error)
    return NextResponse.json({ error: error.message || 'Failed to post to Instagram' }, { status: 500 })
  }
}
