import './globals.css'

export const metadata = {
  title: 'Keeping It Cute Poster',
  description: 'Generate social media posts for Keeping It Cute Salon & Spa',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#fdf4f9] min-h-screen">{children}</body>
    </html>
  )
}
