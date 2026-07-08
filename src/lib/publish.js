import db from './db'
import { getLinkedInToken } from './linkedin'

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v19.0'

async function publishToFacebook(postText, imageUrl) {
  const pageId = process.env.FACEBOOK_PAGE_ID
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  if (!pageId || !accessToken) throw new Error('Facebook is not configured. Set FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN in .env.local.')

  const isPublic = imageUrl && /^https:\/\//.test(imageUrl)
  const endpoint = isPublic
    ? `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/photos`
    : `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/feed`
  const payload = isPublic
    ? { url: imageUrl, caption: postText, access_token: accessToken }
    : { message: postText, access_token: accessToken }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error?.message || 'Facebook publish failed.')
  return { postId: data.id, url: `https://www.facebook.com/${String(data.id).replace('_', '/posts/')}` }
}

async function publishToInstagram(postText, imageUrl) {
  const businessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  if (!businessAccountId || !accessToken) throw new Error('Instagram is not configured. Set INSTAGRAM_BUSINESS_ACCOUNT_ID and FACEBOOK_PAGE_ACCESS_TOKEN in .env.local.')
  if (!imageUrl || !/^https:\/\//.test(imageUrl)) throw new Error('Instagram requires a public HTTPS image URL.')

  const containerRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${businessAccountId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption: postText, access_token: accessToken }),
  })
  const containerData = await containerRes.json()
  if (!containerRes.ok || containerData.error) throw new Error(containerData.error?.message || 'Instagram container creation failed.')

  const publishRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${businessAccountId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: containerData.id, access_token: accessToken }),
  })
  const publishData = await publishRes.json()
  if (!publishRes.ok || publishData.error) throw new Error(publishData.error?.message || 'Instagram publish failed.')
  return { postId: publishData.id, url: 'https://www.instagram.com/' }
}

async function publishToLinkedIn(postText) {
  const token = await getLinkedInToken()
  if (!token) throw new Error('LinkedIn not connected or token expired. Visit /api/linkedin/auth to connect.')

  const companyId = process.env.LINKEDIN_COMPANY_ID
  let author
  if (companyId) {
    author = `urn:li:organization:${companyId}`
  } else {
    const profileRes = await fetch('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    })
    const profile = await profileRes.json()
    if (!profile.id) throw new Error('Could not determine LinkedIn author URN.')
    author = `urn:li:person:${profile.id}`
  }

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: postText },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || data.serviceErrorCode || 'LinkedIn publish failed.')
  return { postId: data.id || '', url: 'https://www.linkedin.com/feed/' }
}

export async function publishPost(platform, postText, imageUrl) {
  switch (platform) {
    case 'facebook': return publishToFacebook(postText, imageUrl)
    case 'instagram': return publishToInstagram(postText, imageUrl)
    case 'linkedin': return publishToLinkedIn(postText)
    default: throw new Error(`Unknown platform: ${platform}`)
  }
}

export async function markPosted(postId, platform, externalId) {
  await db.posts.markPosted(postId, platform, externalId)
}

export async function markFailed(postId) {
  await db.posts.markFailed(postId)
}
