"use client"

/*
 * A picture opened from fsn, framed the way IRIX framed it. 4Dwm windows had a
 * thick bevelled border and a title bar naming the program and the file, and
 * that frame is what tells the room this came out of the same machine. The
 * picture is the T-rex scene from two slides back, so it moves, and it takes
 * no pointer input because nobody should be able to click it mid-talk.
 */
export function ImageWindow({
  open,
  file,
  src,
}: {
  open: boolean
  file: string
  src: string
}) {
  return (
    <div
      className="absolute top-1/2 right-[var(--slide-padding-inline)] w-[40%] transition-[opacity,transform] duration-500 ease-out"
      style={{
        opacity: open ? 1 : 0,
        transform: `translateY(-50%) scale(${open ? 1 : 0.92})`,
      }}
      aria-hidden={!open}
    >
      <div className="border-4 border-[#8a8a8a] border-t-[#c8c8c8] border-l-[#c8c8c8] bg-[#5a5a5a] p-1 shadow-[0_1.5rem_4rem_rgb(0_0_0/0.6)]">
        <div className="flex items-center gap-3 bg-[#5f7f9f] px-3 py-1 font-mono text-[length:var(--slide-support-size)] text-white">
          <span className="size-3 shrink-0 border border-white/70" />
          <span className="truncate">{`imgview: ${file}`}</span>
        </div>
        <div className="aspect-video w-full overflow-hidden bg-black">
          {open ? (
            <iframe
              className="pointer-events-none h-full w-full border-0"
              src={src}
              title={file}
              tabIndex={-1}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
