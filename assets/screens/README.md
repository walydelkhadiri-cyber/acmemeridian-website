Drop-in artwork for the device screens.

To replace one, put the image here and name it in `manifest.json`:

    {
      "web": "web.png",
      "ai":  "assistant.jpg"
    }

Keys — each one is a button in the capabilities chapters:

    code   Custom software        (laptop)   2048 x 1280
    web    Web platforms          (laptop)   2048 x 1280
    dash   SaaS products          (laptop)   2048 x 1280
    app    Mobile applications    (phone)     780 x 1690
    flow   Business digitalization(tablet)   1600 x 1200
    ai     AI & automation        (tablet)   1600 x 1200

Anything not listed in the manifest keeps the painted version. Match the aspect
ratio or the image is stretched to the screen.

The manifest exists so a missing file never prints a 404 — the page reads it
once instead of probing for every possible filename.
