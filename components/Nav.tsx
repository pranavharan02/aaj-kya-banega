'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/inventory', label: 'Pantry', icon: '🫙' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

export function Nav() {
  const pathname = usePathname()
  if (pathname?.startsWith('/maid')) return null

  return (
    <nav className="flex items-center justify-between py-5">
      <Link href="/" className="text-[22px] font-bold tracking-tight text-[#2D2A26]">
        आज क्या बनेगा?
      </Link>
      <div className="flex gap-1 p-1 rounded-2xl bg-[#FFFDF9] border border-[#E5DFD6]" style={{boxShadow:'0 1px 4px rgba(45,42,38,0.04)'}}>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-4 py-2 rounded-xl text-[14px] font-semibold transition-all ${
              pathname === link.href
                ? 'bg-[#2D2A26] text-white shadow-sm'
                : 'text-[#8C8680] hover:text-[#2D2A26]'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
