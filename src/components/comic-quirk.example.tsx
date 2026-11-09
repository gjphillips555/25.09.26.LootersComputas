import { ComicQuirk } from "./ComicQuirk";

export function ComicQuirkExamples() {
  return (
    <div className="p-8 space-y-8 bg-neutral-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold">ComicQuirk examples</h1>

      {/* Basic button */}
      <div>
        <p className="mb-2 text-sm text-neutral-400">Basic button</p>
        <ComicQuirk>
          <button className="px-5 py-2.5 rounded-lg font-semibold bg-purple-600 hover:bg-purple-500 transition-colors">
            Click me
          </button>
        </ComicQuirk>
      </div>

      {/* Custom phrases + no auto-hide */}
      <div>
        <p className="mb-2 text-sm text-neutral-400">Custom phrases, stays until next click</p>
        <ComicQuirk
          phrases={["Gosh!", "What the heck?!", "Your mom goes to college."]}
          duration={0}
        >
          <button className="px-5 py-2.5 rounded-lg font-semibold bg-violet-600">
            Persistent bubble
          </button>
        </ComicQuirk>
      </div>

      {/* Image / character */}
      <div>
        <p className="mb-2 text-sm text-neutral-400">On an image</p>
        <ComicQuirk offset={{ x: 20, y: -70 }}>
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl">
            🤖
          </div>
        </ComicQuirk>
      </div>

      {/* No glow */}
      <div>
        <p className="mb-2 text-sm text-neutral-400">noGlow</p>
        <ComicQuirk noGlow>
          <span className="underline">No glow on this one</span>
        </ComicQuirk>
      </div>
    </div>
  );
}
