/* ==========================================================
   data.js  -  the single source of truth for Jewelry Match
   ----------------------------------------------------------
   Every page (quiz, archive, object story, saved) reads from
   this file. If you change a piece here, it changes everywhere.
   ========================================================== */

// A "namespace": one box called JM that holds everything we share
// between files, so our names never collide with anything else.
var JM = (typeof window !== 'undefined' && window.JM) || {};

/* ----------------------------------------------------------
   1. The quiz options, the weights and the labels.
   "value" is what we store and compare (lowercase, no spaces).
   "label" is what a human reads on screen.
   ---------------------------------------------------------- */
JM.WEIGHTS = {
  placement: 40,
  form: 25,
  material: 20,
  mood: 15
};

// Photos switch. true = show the photos in assets/images/.
// false = show styled colour placeholders instead (useful while testing).
// If one photo fails to load, the site shows its placeholder automatically.
JM.SHOW_IMAGES = true;

// One credit line for every generated image. Details live in docs/image-generation-record.md.
JM.IMAGE_CREDIT = 'AI-generated with OpenAI image generation, November 2026';

// The full-length photo used on the Body Map step.
JM.BODY_MAP_IMAGE = 'assets/images/body-map-model.jpg';

// The order here is also the order of the quiz steps.
JM.DIMENSIONS = ['placement', 'form', 'material', 'mood'];

JM.OPTIONS = {
  placement: [
    { value: 'ear',           label: 'Ear' },
    { value: 'little-finger', label: 'Little finger' },
    { value: 'across-hand',   label: 'Across the hand' },
    { value: 'neckline',      label: 'Neckline' },
    { value: 'ankle',         label: 'Ankle' }
  ],
  form: [
    { value: 'angular',  label: 'Angular' },
    { value: 'liquid',   label: 'Liquid' },
    { value: 'delicate', label: 'Delicate' },
    { value: 'organic',  label: 'Organic' }
  ],
  material: [
    { value: 'silver',       label: 'Silver' },
    { value: 'gold',         label: 'Gold' },
    { value: 'emerald',      label: 'Emerald' },
    { value: 'yellow-stone', label: 'Yellow stone' }
  ],
  mood: [
    { value: 'quiet',      label: 'Quiet' },
    { value: 'sharp',      label: 'Sharp' },
    { value: 'romantic',   label: 'Romantic' },
    { value: 'after-dark', label: 'After dark' }
  ]
};

/* ----------------------------------------------------------
   2. The 12 objects.
   ORDER MATTERS: the position in this list is the tie-breaker
   when two pieces get the same score. Do not reorder casually.
   IDs never change once links are published.

   The "images" are placeholders for now. We will replace the
   src values once you have chosen photos and checked credits.
   ---------------------------------------------------------- */
JM.jewelry = [
  {
    id: 'kite-pinky', catalogNo: 'JM-001', name: 'Kite Pinky',
    placement: 'little-finger', form: 'angular', material: 'yellow-stone', mood: 'sharp',
    materialNote: 'Gold / yellow diamond',
    images: [{ src: 'assets/images/kite-pinky.jpg', alt: 'Lowered hand in black and white wearing a kite-shaped gold ring set with a bright yellow diamond, the only colour in the image', credit: JM.IMAGE_CREDIT }],
    story: 'A flash at the edge of the hand.',
    stylingNote: 'Wear it alone on the little finger and let the rest of the hand stay bare.',
    relatedIds: ['twin-line', 'emerald-fold', 'deep-v']
  },
  {
    id: 'orbit-signet', catalogNo: 'JM-002', name: 'Orbit Signet',
    placement: 'little-finger', form: 'organic', material: 'silver', mood: 'quiet',
    images: [{ src: 'assets/images/orbit-signet.jpg', alt: 'Back of a hand in black and white with a soft, rounded polished-silver signet ring on one finger', credit: JM.IMAGE_CREDIT }],
    story: 'A small silver planet that sits where a signet usually would.',
    stylingNote: 'Stack it with a thin band on the next finger for a calm, balanced hand.',
    relatedIds: ['kite-pinky', 'drop-study', 'chrome-arc']
  },
  {
    id: 'twin-line', catalogNo: 'JM-003', name: 'Twin Line',
    placement: 'across-hand', form: 'delicate', material: 'silver', mood: 'romantic',
    images: [{ src: 'assets/images/twin-line.jpg', alt: 'Raised hand in black and white wearing two slim silver rings joined by fine chains to a thin bracelet at the wrist', credit: JM.IMAGE_CREDIT }],
    story: 'Two fine lines that join the finger to the wrist.',
    stylingNote: 'Let it catch the light against bare skin or a dark sleeve.',
    relatedIds: ['vertebra-chain', 'deep-v', 'kite-pinky']
  },
  {
    id: 'vertebra-chain', catalogNo: 'JM-004', name: 'Vertebra Chain',
    placement: 'across-hand', form: 'organic', material: 'silver', mood: 'after-dark',
    images: [{ src: 'assets/images/vertebra-chain.jpg', alt: 'Hand resting on a black sleeve wearing a heavy oxidised-silver hand chain made of bone-like linked segments', credit: JM.IMAGE_CREDIT }],
    story: 'Linked like a spine, made to move with the hand.',
    stylingNote: 'Best at night, with black sleeves and nothing else competing.',
    relatedIds: ['afterimage', 'night-cross', 'twin-line']
  },
  {
    id: 'emerald-fold', catalogNo: 'JM-005', name: 'Emerald Fold',
    placement: 'ear', form: 'angular', material: 'emerald', mood: 'sharp',
    images: [{ src: 'assets/images/emerald-fold.jpg', alt: 'Close crop of an ear and jawline with an angular folded-silver ear piece holding a deep green emerald, the only colour in the image', credit: JM.IMAGE_CREDIT }],
    story: 'A green stone folded into a hard silver edge.',
    stylingNote: 'Pull the hair back so the angle reads against the jaw.',
    relatedIds: ['drop-study', 'green-thread', 'kite-pinky']
  },
  {
    id: 'drop-study', catalogNo: 'JM-006', name: 'Drop Study',
    placement: 'ear', form: 'liquid', material: 'silver', mood: 'quiet',
    images: [{ src: 'assets/images/drop-study.jpg', alt: 'Close crop of an ear wearing one polished-silver drop earring shaped like molten metal, its shadow falling on the neck', credit: JM.IMAGE_CREDIT }],
    story: 'A single drop of metal, caught just before it falls.',
    stylingNote: 'Wear one on its own for a quiet, asymmetrical look.',
    relatedIds: ['emerald-fold', 'melt-collar', 'orbit-signet']
  },
  {
    id: 'deep-v', catalogNo: 'JM-007', name: 'Deep V',
    placement: 'neckline', form: 'delicate', material: 'gold', mood: 'romantic',
    images: [{ src: 'assets/images/deep-v.jpg', alt: 'Torso in a black halter top wearing a very fine gold necklace that falls in a long, precise V', credit: JM.IMAGE_CREDIT }],
    story: 'A fine gold line that points toward the heart.',
    stylingNote: 'Pair with an open neckline so the V has room.',
    relatedIds: ['twin-line', 'melt-collar', 'green-thread']
  },
  {
    id: 'night-cross', catalogNo: 'JM-008', name: 'Night Cross',
    placement: 'neckline', form: 'angular', material: 'silver', mood: 'after-dark',
    images: [{ src: 'assets/images/night-cross.jpg', alt: 'Black ribbed knit with a heavy silver chain and an abstract angular silver pendant of interlocking bars', credit: JM.IMAGE_CREDIT }],
    story: 'Hard silver geometry for the end of the evening.',
    stylingNote: 'Wear over black knit; the contrast does the work.',
    relatedIds: ['vertebra-chain', 'melt-collar', 'chrome-arc']
  },
  {
    id: 'melt-collar', catalogNo: 'JM-009', name: 'Melt Collar',
    placement: 'neckline', form: 'liquid', material: 'gold', mood: 'sharp',
    images: [{ src: 'assets/images/melt-collar.jpg', alt: 'Neck and shoulder in a black garment wearing a sculptural liquid-gold collar with irregular, poured reflections', credit: JM.IMAGE_CREDIT }],
    story: 'Gold that looks poured rather than made.',
    stylingNote: 'Keep everything else minimal; this is the whole outfit.',
    relatedIds: ['deep-v', 'night-cross', 'afterimage']
  },
  {
    id: 'green-thread', catalogNo: 'JM-010', name: 'Green Thread',
    placement: 'ankle', form: 'delicate', material: 'emerald', mood: 'romantic',
    images: [{ src: 'assets/images/green-thread.jpg', alt: 'Bare ankle and foot in black and white wearing a thin silver anklet with three small green emerald beads, the only colour', credit: JM.IMAGE_CREDIT }],
    story: 'A thin green line around the ankle.',
    stylingNote: 'Visible with a cropped trouser or bare feet.',
    relatedIds: ['chrome-arc', 'emerald-fold', 'deep-v']
  },
  {
    id: 'chrome-arc', catalogNo: 'JM-011', name: 'Chrome Arc',
    placement: 'ankle', form: 'angular', material: 'silver', mood: 'quiet',
    images: [{ src: 'assets/images/chrome-arc.jpg', alt: 'Ankle above a black flat shoe wearing an angular polished-silver arc cuff', credit: JM.IMAGE_CREDIT }],
    story: 'A clean silver arc that frames the ankle bone.',
    stylingNote: 'Wear above a plain shoe and let it be the only shine.',
    relatedIds: ['green-thread', 'orbit-signet', 'night-cross']
  },
  {
    id: 'afterimage', catalogNo: 'JM-012', name: 'Afterimage',
    placement: 'across-hand', form: 'liquid', material: 'gold', mood: 'after-dark',
    images: [{ src: 'assets/images/afterimage.jpg', alt: 'Hand against a black background wearing an open liquid-gold hand piece, with a blurred golden motion trail behind it', credit: JM.IMAGE_CREDIT }],
    story: 'The glow that stays after the hand moves away.',
    stylingNote: 'Made for low light, bare nails and a dark background.',
    relatedIds: ['vertebra-chain', 'melt-collar', 'kite-pinky']
  }
];

// Let Node (our test runner) load this file as well as the browser.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = JM;
}
