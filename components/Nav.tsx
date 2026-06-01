'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Home' },
  { href: '/inventory', label: 'Pantry' },
  { href: '/settings', label: 'Settings' },
]

export function Nav() {
  const pathname = usePathname()
  if (pathname?.startsWith('/maid')) return null

  return (
    <nav className="flex items-center justify-between py-6">
      <Link href="/" className="text-[22px] font-bold tracking-tight text-[#2D2A26]">
        आज क्या बनेगा?
      </Link>
      <div className="flex gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-4 py-2 rounded-full text-[15px] font-medium transition-all ${
              pathname === link.href
                ? 'bg-[#2D2A26] text-white'
                : 'text-[#8C8680] hover:text-[#2D2A26] hover:bg-[#F0EDE8]'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
