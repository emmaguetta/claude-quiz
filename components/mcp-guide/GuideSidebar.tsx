'use client'

import { useEffect, useState } from 'react'

export type SidebarItem = { anchor: string; label: string }

export function GuideSidebar({ items, label }: { items: SidebarItem[]; label: string }) {
  const [active, setActive] = useState<string>(items[0]?.anchor ?? '')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.target.getBoundingClientRect().top - b.target.getBoundingClientRect().top)
        if (visible.length > 0) {
          setActive((visible[0].target as HTMLElement).id)
        }
      },
      { rootMargin: '-15% 0px -70% 0px' }
    )

    for (const { anchor } of items) {
      const el = document.getElementById(anchor)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [items])

  return (
    <nav aria-label={label} className="text-sm">
      <div className="text-xs uppercase tracking-wider text-zinc-500 mb-3 font-semibold">
        {label}
      </div>
      <ul className="space-y-0.5 border-l border-zinc-800">
        {items.map(item => {
          const isActive = active === item.anchor
          return (
            <li key={item.anchor}>
              <a
                href={`#${item.anchor}`}
                className={`block -ml-px pl-4 pr-2 py-1.5 border-l-2 transition-colors ${
                  isActive
                    ? 'border-amber-400 text-amber-200 font-medium'
                    : 'border-transparent text-zinc-500 hover:text-zinc-200 hover:border-zinc-600'
                }`}
              >
                {item.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
