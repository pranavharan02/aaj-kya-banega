'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Home' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/settings', label: 'Settings' },
]

export function Nav() {
  const pathname = usePathname()

  // Hide nav on maid view
  if (pathname?.startsWith('/maid')) return null

  return (
    <nav className="flex items-center justify-between py-5 border-b border-[#E0E0E0]">
      <Link href="/" className="text-xl font-semibold tracking-tight">
        Aaj Kya Banega
      </Link>
      <div className="flex gap-4 text-sm">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              pathname === link.href
                ? 'bg-[#1A1A1A] text-white'
                : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
