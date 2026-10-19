"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/*
 * fsn's own viewer window, redrawn at slide scale. The colours, the pinstriped
 * title bar, the toolbar and the footer are lifted from vendor/fsn's style.css
 * so the window reads as the one fsn.thebuilder.dk opens. It is drawn here
 * rather than mounted from fsn because fsn's viewer is a dialog wired to its
 * navigator, and the slide only needs what is inside it. It takes no pointer
 * input, since nobody should click it mid-talk.
 */
export function FsnWindow({
  open,
  path,
  mode,
  size,
  status,
  className,
  children,
}: {
  open: boolean
  path: string
  mode: string
  size: string
  status: string
  className?: string
  children: ReactNode
}) {
  const name = path.slice(path.lastIndexOf("/") + 1)

  return (
    <div
      className={cn(
        "pointer-events-none absolute font-mono transition-[opacity,scale] duration-200 ease-[steps(4,end)]",
        className
      )}
      style={{ opacity: open ? 1 : 0, scale: open ? 1 : 0.96 }}
      aria-hidden={!open}
    >
      <div className="border-[5px] border-[#263d38] border-double bg-[#b6c4be] text-[#0d1c19] shadow-[0_1.5rem_4rem_rgb(0_0_0/0.6)]">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-[#1b302b] border-b-2 bg-[repeating-linear-gradient(#c3cfca_0_1px,#a2b4ac_1px_3px)] px-3 py-2">
          <div className="flex gap-3 justify-self-start bg-[#b6c4be] p-1.5">
            {["#ff5d7f", "#ffd45d", "#68d9b4"].map((colour) => (
              <i
                key={colour}
                className="block size-4 border border-[#2b443e]"
                style={{ background: colour }}
              />
            ))}
          </div>
          <div className="grid justify-items-center gap-1 bg-[#b6c4be] px-4 py-1">
            <span className="font-bold text-[#38544d] text-[0.8rem] tracking-[0.12em]">
              {mode}
            </span>
            <span className="font-bold text-[1.35rem] leading-tight">{name}</span>
          </div>
          <span className="justify-self-end bg-[#b6c4be] px-2 text-[#3d5a52] text-xl">
            ×
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 border-[#5e756e] border-b bg-[#a4b5ae] px-3 py-2 font-semibold text-[0.9rem]">
          <span className="truncate">{path}</span>
          <span className="whitespace-nowrap">{size}</span>
        </div>
        <div className="m-2 border-2 border-[#d8e2de] border-inset bg-[#0c1715]">
          {children}
        </div>
        <div className="flex items-center justify-between gap-4 border-[#536c65] border-t px-3 py-2 font-bold text-[#263e38] text-[0.8rem]">
          <span className="flex items-center gap-2">
            <i className="block size-2 rounded-full bg-[#16b688] shadow-[0_0_4px_#16b688]" />
            LOCAL READ-ONLY CHANNEL
          </span>
          <span>{status}</span>
        </div>
      </div>
    </div>
  )
}
