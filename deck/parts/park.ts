import type { FsNode } from "@fsn/core"

/*
 * The park's filesystem, as Lex might have found it. fsn takes a node's kind
 * from its extension, so the names decide the colours: code, documents,
 * pictures, archives and models each get the site's own palette. A file's
 * size is its tower's height, on a log scale, so security is kept small: the
 * camera lands close to the door locks, and they should fit the frame.
 */

type Entry = [name: string, size: number] | [name: string, Entry[]]

const kb = 1024
const mb = 1024 * kb

const tree: Entry[] = [
  ["bin", [["csh", 180 * kb], ["ls", 40 * kb], ["sh", 90 * kb], ["vi", 260 * kb]]],
  ["etc", [["fstab", 2 * kb], ["hosts", 4 * kb], ["inittab", 6 * kb], ["passwd", 3 * kb]]],
  [
    "home",
    [
      ["arnold", [["checklist.txt", 18 * kb], ["shutdown.sh", 9 * kb]]],
      ["lex", [["doom.sh", 6 * kb], ["hiscores.txt", 2 * kb]]],
      [
        "nedry",
        [
          ["barbasol.txt", 1 * kb],
          ["dennis.c", 48 * kb],
          ["dodgson.eml", 12 * kb],
          ["whte_rbt.obj", 2 * mb],
        ],
      ],
    ],
  ],
  [
    "usr",
    [
      ["bin", [["awk", 120 * kb], ["make", 210 * kb], ["perl", 900 * kb]]],
      [
        "park",
        [
          ["control.c", 180 * kb],
          ["control.h", 22 * kb],
          ["README.txt", 6 * kb],
          [
            "genetics",
            [
              ["amber.tif", 9 * mb],
              ["frog.dna", 30 * mb],
              ["sequence.dat", 64 * mb],
              ["mr_dna.mov", 120 * mb],
            ],
          ],
          [
            "paddocks",
            [
              ["brachio.cfg", 4 * kb],
              ["dilopho.cfg", 4 * kb],
              ["raptor.cfg", 6 * kb],
              ["rex.cfg", 5 * kb],
              ["trike.cfg", 4 * kb],
              ["fences.log", 3 * mb],
            ],
          ],
          [
            "power",
            [
              ["grid.c", 120 * kb],
              ["breakers.log", 2 * mb],
              ["reboot.sh", 4 * kb],
            ],
          ],
          [
            "security",
            [
              ["badges.db", 96 * kb],
              ["cameras.c", 24 * kb],
              ["doors", 160 * kb],
              ["fences.c", 32 * kb],
              ["motion.log", 64 * kb],
              ["lobby.jpg", 48 * kb],
              ["visitor.jpg", 40 * kb],
              ["velociraptor.webp", 237 * kb],
            ],
          ],
          [
            "tour",
            [
              ["route.c", 40 * kb],
              ["jeep01.log", 1 * mb],
              ["jeep02.log", 1 * mb],
              ["welcome.mp3", 8 * mb],
            ],
          ],
        ],
      ],
    ],
  ],
  ["var", [["log", [["messages", 4 * mb], ["syslog", 6 * mb]]]]],
]

function build(name: string, path: string, parentId: string | null, entries: Entry[]): FsNode {
  return {
    children: entries.map(([child, value]) => {
      const id = path === "/" ? `/${child}` : `${path}/${child}`
      return typeof value === "number"
        ? { id, kind: "file", name: child, parentId: path, size: value }
        : build(child, id, path, value)
    }),
    id: path,
    kind: "directory",
    name,
    parentId,
  }
}

export const park = build("/", "/", null, tree)

export const parkHome = "/usr/park"
export const parkSecurity = "/usr/park/security"
export const parkDoors = "/usr/park/security/doors"
export const parkRaptor = "/usr/park/security/velociraptor.webp"
