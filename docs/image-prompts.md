# Jewelry Match: AI image prompts

How to use this file
1. Open your AI image tool (ChatGPT images, Gemini, Adobe Firefly, Midjourney, etc.).
2. For each piece, paste the STYLE BLOCK first, then that piece's SUBJECT line.
3. Set the aspect ratio to 4:5 (portrait). Ask for the largest size the tool allows.
4. Generate 3-4 options per piece, keep the best, and save it as a JPG with the EXACT
   file name shown below, inside assets/images/.
5. Do all 12 in one sitting, with the same tool and the same style block, so the set
   looks like one photo shoot.

Rules that keep this honest (and keep your teacher happy)
- Do not upload the inspiration images to the tool and do not ask for "identical" copies.
  Describe the style in words, as below. The goal is a consistent editorial look, not a copy.
- Anonymous models only: crop out faces, never ask for a real person or a celebrity.
- No logos, text, watermarks or brand names inside the image.
- Keep a record: tool name, date and the prompt you used. It goes in your process document
  and in the "credit" field of data.js (example at the bottom).
- Ask your teacher in one line whether AI-generated images are allowed for the website.

## STYLE BLOCK (paste before every subject)

High-contrast black-and-white fashion editorial photograph, macro detail, shallow depth
of field, hard directional flash with crisp shadows, fine film grain, pale off-white
background, tight crop on the skin and the jewelry, no face visible, no text, no logo,
no watermark. Vertical 4:5 composition with the jewelry slightly off-centre and some empty
space around it. Accent color only where stated, everything else strictly black and white.

## SUBJECT LINES

| File name | Subject line |
|---|---|
| kite-pinky.jpg | A hand seen from the side, only the little finger wearing a sharp kite-shaped gold ring with a single bright yellow diamond. The yellow of the stone is the only color in the image. Other fingers bare. |
| orbit-signet.jpg | Close-up of a little finger wearing a soft, rounded, slightly lumpy polished silver signet ring, like a small planet. Quiet, calm, understated. |
| twin-line.jpg | The back of a hand with two very fine silver chains running from a ring on one finger to a thin bracelet at the wrist. Delicate, romantic, light catching the chain links. |
| vertebra-chain.jpg | A hand resting on a black sleeve, a heavy silver chain with knuckle-like linked segments draped across the back of the hand. Dark, moody, after-dark atmosphere, strong shadows. |
| emerald-fold.jpg | Profile close-up of an ear with an angular, folded silver ear piece holding one deep green emerald. The green of the emerald is the only color. Hair pulled back, hard edge against the jaw. |
| drop-study.jpg | An ear with a single liquid-looking silver drop earring, like a drop of metal about to fall. Soft, quiet, minimal. Slight asymmetry. |
| deep-v.jpg | A collarbone and open neckline with a very fine gold necklace falling into a V shape. Delicate, romantic. Warm gold tone is allowed here as the only color accent. |
| night-cross.jpg | A dark knit neckline with an angular, geometric silver pendant resting on the chest. Hard silver edges, strong contrast, late-night mood. |
| melt-collar.jpg | The base of a neck wearing a liquid gold collar that looks poured rather than made, glossy reflections. Sharp, minimal outfit. Warm gold is the only color. |
| green-thread.jpg | A bare ankle wearing a thin anklet with small emerald beads, on a pale floor with a hard shadow. The green beads are the only color. Romantic and light. |
| chrome-arc.jpg | An ankle bone framed by a clean, angular silver arc-shaped cuff, above a plain flat shoe. Quiet, precise, chrome reflections. |
| afterimage.jpg | A hand moving through low light wearing a liquid gold hand piece across the back of the hand, a faint motion trail behind it. Dark background, glowing gold, bare nails. |

## Finished? Switch the photos on

1. Put the 12 JPG files in assets/images/ (exact names above).
2. Run:  node tools/check-images.js   (it lists anything missing or suspiciously small)
3. In js/data.js change  JM.SHOW_IMAGES = false;  to  JM.SHOW_IMAGES = true;
4. In js/data.js replace each credit: 'TBD' with something like:
   credit: 'AI-generated with <tool name>, November 2026'
5. Re-check the alt text of each image: it should describe what the picture really shows.

If one image fails to load, the site automatically shows the colored placeholder for it.
