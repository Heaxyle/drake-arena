// Drake Arena icon set: first batch (the 12 effects and the 6 class ultimates). Design only: the game doesn't load this yet.
// Same format as DRAKE_SPRITES: a palette plus rows of palette letters ('.' = transparent), drawn once to a canvas and
// cached, shown only at whole-number scales (see style.md). No frames: every effect glyph has the whole 10×10 (buff or
// debuff shows in the chip around it: CHIP_SHAPES below), every ultimate its own 12×12 silhouette.
// Colour = element: every effect and the ultimate of an element share its colour family (ELEMENT_COLORS). When this is wired
// in, these become the `color` values in EFFECTS / CLASS_ULTIMATES (a visual-only change), which stay the only source. The
// palette letters:
//   o outline, d dark, m colour, h light, w highlight, p accent (an icon's own second colour), q accent dark
(function (root) {
    // ----- Sizes by category -----
    const SIZES = { buff: 10, debuff: 10, ultimate: 12, note: 10, attack: 10, reel: 10, emblem: 10, bonus: 10, medal: 12, ui: 10 };

    // ----- Glyphs -----
    const GLYPHS = {
        // Rage: an angry face (V brows, eyes looking in, a frown)
        rage: [
            '..oooooo..',
            '.ohhhmmmo.',
            'ohommmmomo',
            'ommommommo',
            'omwwmmwwmo',
            'omwommowmo',
            'ommmmmmmdo',
            'ommoooomdo',
            '.omoddomo.',
            '..oooooo..',
        ],
        // Burn: a flame, yellow at the core
        burn: [
            '.....o....',
            '....omo...',
            '...ohmo.o.',
            '..ohmmoomo',
            '.ohmmhmmmo',
            'ohmhpphmmo',
            'omhppwphmo',
            'omhpwwpmdo',
            '.omdppddo.',
            '..oooooo..',
        ],
        // Shield: a heater shield with a boss, lit on its left half
        shield: [
            'oooooooooo',
            'ohhhhmmmmo',
            'ohwhhmmmdo',
            'ohhhwwmmdo',
            'ohhhwwmmdo',
            'ohhhhmmmdo',
            '.ohhhmmdo.',
            '.oohhmmdo.',
            '..oohmdo..',
            '....oo....',
        ],
        // Frost: a snowflake, eight arms with branch ticks
        frost: [
            'h...h...h.',
            '.h.hwh.h..',
            '..hhwhh...',
            '.hhwwwhh..',
            'hwwwmwwwh.',
            '.hhwwwhh..',
            '..hhwhh...',
            '.h.hwh.h..',
            'h...h...h.',
            '..........',
        ],
        // Shadow: an eclipse, a dark disc with a bright rim (the closest thing to 🌑)
        shadow: [
            '..oowwoo..',
            '.owwmmwho.',
            'owmmmdddho',
            'owmmddddmo',
            'wmmddddddm',
            'wmdddddddm',
            'owddddddmo',
            'ohddddddmo',
            '.ohmddmmo.',
            '..oommoo..',
        ],
        // Weakness: a bold arrow down
        weakness: [
            '..oooooo..',
            '..ohmmdo..',
            '..ohmmdo..',
            'ooohmmdooo',
            'ohhhmmmmdo',
            '.ohhmmmdo.',
            '..ohmmdo..',
            '...ohdo...',
            '....oo....',
            '..........',
        ],
        // Blessing: a gold five-point star
        blessing: [
            '....oo....',
            '...ohho...',
            '...ohdo...',
            '.ooowdooo.',
            'ohhhwmhhho',
            '.ohmmmmdo.',
            '..ohmmdo..',
            '..ohdddo..',
            '.ohdoohho.',
            '..oo..oo..',
        ],
        // Mark: a crosshair (ring, centre dot, four ticks)
        mark: [
            '...ohho...',
            '..oohhoo..',
            '.ommoommo.',
            'oomoooomoo',
            'hhoowwoohh',
            'hhoowwoohh',
            'oomoooomoo',
            '.ommoommo.',
            '..oohhoo..',
            '...ohho...',
        ],
        // Divine Might: a bold arrow up with a sparkle (the opposite of Weakness)
        divine: [
            '........w.',
            '....oo.www',
            '...ohdo.w.',
            '..ohhmdo..',
            '.ohhhmmdo.',
            'ohhhhmmmdo',
            'ooohmmdooo',
            '..ohmmdo..',
            '..ohmmdo..',
            '..oooooo..',
        ],
        // Dispel: Divine Might's arrow up with a slash through it (buffs cancelled)
        dispel: [
            '....oo..ow',
            '...ohdoowo',
            '..ohhmowo.',
            '.ohhhowoo.',
            'ohhhowomdo',
            'oooowodooo',
            '..owomdo..',
            '.owommdo..',
            'owohmmdo..',
            'wooooooo..',
        ],
        // Regeneration: a bold plus
        regen: [
            '...oooo...',
            '...ohho...',
            '...ohmo...',
            'oooohmoooo',
            'ohhhhwmmmo',
            'ohmmwmmmdo',
            'oooommoooo',
            '...ommo...',
            '...oddo...',
            '...oooo...',
        ],
        // Poison: a skull
        poison: [
            '..oooooo..',
            '.ohhhhhmo.',
            'ohhhhhmmmo',
            'ohooohoodo',
            'ohooomoodo',
            'ohmmooomdo',
            '.ommmmmdo.',
            '..ohohodo.',
            '..ooooooo.',
            '..........',
        ],
        // ----- Ultimates (12×12, each its own silhouette) -----
        // Firestorm: a meteor, a hot head at the bottom left and a flaming trail
        firestorm: [
            '.........oo.',
            '........ohho',
            '......oohhho',
            '....oohhhho.',
            '..oommppho..',
            '.ommppppho..',
            'oppppppmo...',
            'oppppppmo...',
            'opwwppmo....',
            'opwwppmo....',
            '.oppppo.....',
            '..oooo......',
        ],
        // Ice Mirror: a tall mirror shard with glints
        mirror: [
            '.....oo.....',
            '....ohwo....',
            '...ohhwmo...',
            '...ohwhmo...',
            '..ohwhhmdo..',
            '..ohhwhmdo..',
            '.ohhhhwmmdo.',
            '.ohhhhhwmdo.',
            '..ohhhhmwdo.',
            '..ohhhmmmo..',
            '...ohmmdo...',
            '....oooo....',
        ],
        // Shadow Theft: the classic bat: wings in a V with scalloped points, pointed ears, two bright eyes
        theft: [
            '............',
            '.o........o.',
            'oho.o..o.oho',
            'ohhohoohohdo',
            'ohmhmhhmhmdo',
            'ohmmymmymmdo',
            '.ohmdmmdmdo.',
            '..ohohdoho..',
            '...oohdoo...',
            '.....oo.....',
            '............',
            '............',
        ],
        // Jackpot: a slot reel window with a red seven
        jackpot: [
            'oooooooooooo',
            'ohhhhhhhhhmo',
            'ohwwwwwwwwdo',
            'ohwppppppwdo',
            'ohwqqqqppwdo',
            'ohwwwwppqwdo',
            'ohwwwppqwwdo',
            'ohwwwppwwwdo',
            'ohwwppqwwwdo',
            'ohwwwwwwwwdo',
            'ommddddddddo',
            'oooooooooooo',
        ],
        // Arcane Detonation: an uneven blast with a bright core
        detonation: [
            '...o....o...',
            '..omo..omo.o',
            'o.ohmooomoom',
            'omohhmmmhmo.',
            '.ohhwwhmmmo.',
            'ohhwwwwhmmdo',
            'ohmwwwwhmmdo',
            '.ommwwhmmdo.',
            '.ommmmmmmdoo',
            'omoommdmoomo',
            'oo.omo.omo.o',
            '....o...o...',
        ],
        // Bloom: a five-petal flower head, green petals with pink tips, a yellow centre, a short stem
        bloom: [
            '....oppo....',
            '..oohmmhoo..',
            '.opohmmdopo.',
            'opmhmmmmhmpo',
            'opmmmvymmmpo',
            'opdmmyymmdpo',
            '.oohmyymdoo.',
            '.ohmmmmmmho.',
            '.opmmddmmpo.',
            '..oppooppo..',
            '...ooodoo...',
            '.....odo....',
        ],
        // ----- Batch 2: log notes and title mechanics (10×10, bare) -----
        // Crit: a bold «!» with impact ticks
        crit: [
            'o...oo...o',
            'ho.ohho.oh',
            'ohoohdooho',
            '.o.ohdo.o.',
            '...ohdo...',
            '...ohdo...',
            '....oo....',
            '...ohho...',
            '...ohdo...',
            '....oo....',
        ],
        // Ultra-block (Black): a brick wall
        block: [
            '.oooooooo.',
            'ommmmmmmmo',
            'ommmdmmmmo',
            'oddddddddo',
            'omdmmmdmmo',
            'oddddddddo',
            'ommmdmmmmo',
            'ommmdmmmmo',
            '.oooooooo.',
            '..........',
        ],
        // Quantum Dodge: a figure stepping aside, after-images behind it
        dodge: [
            'o..o..oo..',
            'doomoowwo.',
            'odoomoowwo',
            '.odoomooww',
            '.odoomooww',
            'odoomoowwo',
            'doomoowwo.',
            'o..o..oo..',
            '..........',
            '..........',
        ],
        // Miss: an arrow flying over an empty target, a clear gap between them, motion lines behind it
        miss: [
            'ho...owo..',
            'oo.ooowwoo',
            'hhowwwwwww',
            'oo.ooowwoo',
            'ho...owo..',
            'o.ooooo...',
            '.ommmmo...',
            'omommomo..',
            'omommomo..',
            '.ommmmo...',
        ],
        // Unblockable: the brick wall crossed out
        unblockable: [
            'ppooooooo.',
            'oppmmmmmmo',
            'omppdmmmmo',
            'oddppddddo',
            'omdmppdmmo',
            'oddddppddo',
            'ommmdmppmo',
            'ommmdmmppo',
            '.ooooooopp',
            '........oo',
        ],
        // Immune: a bubble with a glint
        immune: [
            '..oommoo..',
            '.ommmmmmo.',
            'ommddddmmo',
            'omdwwdddmo',
            'mmdwddddmm',
            'mmddddddmm',
            'omddddhdmo',
            'ommddddmmo',
            '.ommmmmmo.',
            '..oommoo..',
        ],
        // Armour-piercing: a spear tip through a cracked armour plate
        pierce: [
            '........ow',
            '..ooo.ooww',
            '.odddowwmo',
            '.ododwwmo.',
            '.oddwwmo..',
            '.odwwmddo.',
            '.owwmoodo.',
            'owwmdddo..',
            'owmoooo...',
            'omo.......',
        ],
        // Execute: an axe
        execute: [
            '..oooppo..',
            '.owmmppo..',
            'owmmmppo..',
            'wwmmmppo..',
            'wwmmmppo..',
            'owmmmppo..',
            '.owmmqqo..',
            '..oooqqo..',
            '....oqqo..',
            '....oqqo..',
        ],
        // Sleep: «Zz»
        sleep: [
            'mmmmmo....',
            'ooomo.....',
            '.omo.ooo..',
            'omooohhho.',
            'mmmmmooho.',
            'ooooooho..',
            '....ohhho.',
            '.....ooo..',
            '..........',
            '..........',
        ],
        // Chaos: a lightning bolt
        chaos: [
            '....ohhho.',
            '...ohmdo..',
            '..ohmdoo..',
            '.ohdmmhho.',
            '..oohmdo..',
            '..ohmdo...',
            '.ohddo....',
            'ohdoo.....',
            'oho.......',
            '.o........',
        ],
        // Thorns: three thorns on a stem
        thorns: [
            '...ommoo..',
            '.oowmmowo.',
            'omoommomo.',
            'wmowmmmmo.',
            'ommmmmwo..',
            '.ooommo...',
            '..owmmo...',
            '...ommo...',
            '..oddddo..',
            '...oooo...',
        ],
        // Title lifesteal: a goblet of blood
        lifesteal: [
            '.ooooooo..',
            'ohhhhhhho.',
            'ohpppppho.',
            'ohppqppho.',
            '.ohqqqho..',
            '..ohmho...',
            '...omo....',
            '..oomoo...',
            '.ommmmmo..',
            '..ooooo...',
        ],
        // Vampire heal (a vampire attack's heal): a blood drop with a plus
        vampheal: [
            '..oho.....',
            '..oho.....',
            '.ohmho..o.',
            'ohmmmhoowo',
            'ohmhmdowww',
            'ohmmmdoowo',
            '.ohddo..o.',
            '..ooo.....',
            '..........',
            '..........',
        ],
        // Heads or tails: a coin with its star
        coin: [
            '..oooooo..',
            '.ohhhhhho.',
            'ohmdmmdmho',
            'ohdmmmmddo',
            'ohmmmwmmdo',
            'ohmmwwwmdo',
            'ohdmmwmddo',
            'ohmdmmdmdo',
            '.ohdddddo.',
            '..oooooo..',
        ],
        // Fortune (Gold: leaves 1 HP): a heart nearly empty, a sliver left
        fortune: [
            '.oo...oo..',
            'ommo.ommo.',
            'moomomoomo',
            'mo.omo.omo',
            'mo..o..omo',
            'omooooomo.',
            '.omhhhmo..',
            '..ommmo...',
            '...omo....',
            '....o.....',
        ],
        // The cat on the keyboard: a cat's head
        cat: [
            '.o......o.',
            'oho....oho',
            'ohhoooohdo',
            'ohmhhhhmdo',
            'ohymmmmydo',
            'hmmmmmmmmh',
            'ohmmddmmdo',
            '.ohdddddo.',
            '..oooooo..',
            '..........',
        ],
        // Guardian angel: an angel: a halo, a head between two wings, a robe
        guardian: [
            '.owwwwwwo.',
            '..owwwwo..',
            'o..ovvo..o',
            'hoovvvvooh',
            'hhoovvoohh',
            'hhhmmmmhhh',
            'ohhmmmmhho',
            '.ommmmmmo.',
            '.ommmmmmo.',
            '..oooooo..',
        ],
        // Opening buff: a sunrise
        opening: [
            '....o.....',
            '.o.oho.o..',
            'ohoohooho.',
            '.ohoooho..',
            'o.ohhho.o.',
            'hohmmmhoho',
            'ohmmmmmhoo',
            'dddddddddd',
            'oooooooooo',
            '..........',
        ],
        // The Sovereign's passive (the attack dissolves): its crown
        sovereign: [
            'o...o...o.',
            'wo.owo.owo',
            'hoohmhooho',
            'hhohmdohdo',
            'hmhmmmhmdo',
            'hmmpmpmmdo',
            'hmmmmmmmdo',
            'dddddddddo',
            'ooooooooo.',
            '..........',
        ],
        // Aether wrath: a beam of light striking down
        wrath: [
            'o...o...o.',
            'wooowooowo',
            'oommmmmmo.',
            'omoowwoomo',
            'moowkkwoom',
            'moowkkwoom',
            'omoowwoomo',
            '.ommmmmmo.',
            '..oooooo..',
            '..........',
        ],
        // Reflect (Blue): a U-turn arrow
        reflect: [
            '..ooooo...',
            '.ommmmmo..',
            'omooooomo.',
            'mo.....omo',
            'mo.o...omo',
            'moomo..omo',
            'ommmo..omo',
            'ommmo...o.',
            '.ooo......',
            '..........',
        ],
        // Sudden death: a warning triangle
        suddendeath: [
            '...ohho...',
            '...ohdo...',
            '..ohmmho..',
            '..ohvvdo..',
            '.ohmvvmho.',
            '.ohmvvmdo.',
            'ohmmmmmmho',
            'ohmmvvmmdo',
            'hddddddddh',
            'oooooooooo',
        ],
        // Knockout: a tombstone with a cross
        knockout: [
            '..ohhhho..',
            '.ohmmmmho.',
            'ohmmwmmmho',
            'ohmwwwmmdo',
            'ohmmwmmmdo',
            'ohmmwmmmdo',
            'ohmmmmmmdo',
            'ohmmmmmmdo',
            'dddddddddd',
            'oooooooooo',
        ],
        // ----- Batch 2: attack types (10×10) -----
        // Physical attack: three claw slashes
        physical: [
            '..o..o..o.',
            '.owoowoowo',
            '.omoomoomo',
            'ommommommo',
            'omoomoomo.',
            'mmommommo.',
            'moomoomo..',
            'moomoomo..',
            'o..o..o...',
            '..........',
        ],
        // Magical attack: an orb with a spark
        magical: [
            '.......owo',
            '...oooowww',
            '..ohhhhowo',
            '.ohwwmmho.',
            '.ohwmmmdo.',
            'ohmmmmmmho',
            '.ohmmmmdo.',
            '.ohmmmmdo.',
            '..ohdddo..',
            '...oooo...',
        ],
        // Vampire attack: two fangs
        vampire: [
            '.oooooooo.',
            'ommmmmmmmo',
            'mhhhhhhhhm',
            'mvvmmmmvvm',
            'ovvoooovvo',
            'oovo..ovoo',
            'moooooooom',
            'ommmmmmmmo',
            '.oooooooo.',
            '..........',
        ],
        // ----- Batch 3: reels, emblems, bonuses, medals, UI (10×10) -----
        // Jackpot's gem reel: a cut gem
        reelgem: [
            '..oooooo..',
            '.ohhhmmmo.',
            'ohwhhmmmdo',
            'hhhhmmmmdd',
            'ohhmmmmddo',
            '.ohmmmddo.',
            '..ommddo..',
            '...oddo...',
            '....oo....',
            '..........',
        ],
        // Jackpot's coin reel: two stacked coins (not Heads or tails' coin)
        reelcoin: [
            '..oooooo..',
            '.ohhhhhho.',
            'ohmmwmmmdo',
            'oddddddddo',
            '.ohhhhhho.',
            'ohmmwmmmdo',
            'oddddddddo',
            '.oooooooo.',
            '..........',
            '..........',
        ],
        // Jackpot's bust reel: a red X (the skull is Poison's)
        reelbust: [
            '.oo....oo.',
            'ommo..ommo',
            'ommmoommmo',
            '.ommmmmmo.',
            '..ommmmo..',
            '..ommmmo..',
            '.ommmmmmo.',
            'ommmoommmo',
            'ommo..ommo',
            '.oo....oo.',
        ],
        // Red Drake: fire on a rune tile
        emRed: [
            '.mmmmmmmm.',
            'mddddddddm',
            'mdddwddddm',
            'mdddwwdddm',
            'mddwwwwddm',
            'mdwwwwwwdm',
            'mdwwwwwwdm',
            'mddwwwwddm',
            'mddddddddm',
            '.mmmmmmmm.',
        ],
        // Blue Drake: waves on a rune tile
        emBlue: [
            '.mmmmmmmm.',
            'mddddddddm',
            'mddddddddm',
            'mdwwddwwdm',
            'mdddwwdddm',
            'mddddddddm',
            'mdwwddwwdm',
            'mdddwwdddm',
            'mddddddddm',
            '.mmmmmmmm.',
        ],
        // Black Drake: the night moon on a rune tile
        emBlack: [
            '.mmmmmmmm.',
            'mddddddddm',
            'mddwwwdddm',
            'mdwwdddddm',
            'mdwddddddm',
            'mdwddddddm',
            'mdwwdddddm',
            'mddwwwdddm',
            'mddddddddm',
            '.mmmmmmmm.',
        ],
        // Gold Drake: a coin on a rune tile
        emGold: [
            '.mmmmmmmm.',
            'mddddddddm',
            'mddwwwwddm',
            'mdwwwwwwdm',
            'mdwwddwwdm',
            'mdwwddwwdm',
            'mdwwwwwwdm',
            'mddwwwwddm',
            'mddddddddm',
            '.mmmmmmmm.',
        ],
        // Purple Drake: a crystal on a rune tile
        emPurple: [
            '.mmmmmmmm.',
            'mddddddddm',
            'mdddwwdddm',
            'mddwwwwddm',
            'mdwwwwwwdm',
            'mdwwwwwwdm',
            'mddwwwwddm',
            'mdddwwdddm',
            'mddddddddm',
            '.mmmmmmmm.',
        ],
        // Green Drake: a leaf on a rune tile
        emGreen: [
            '.mmmmmmmm.',
            'mddddddddm',
            'mdddddwwdm',
            'mdddwwwwdm',
            'mddwwwwddm',
            'mdwwwwdddm',
            'mdwwdddddm',
            'mdwddddddm',
            'mddddddddm',
            '.mmmmmmmm.',
        ],
        // The White Dragon: a wing on a rune tile
        emDragon: [
            '.mmmmmmmm.',
            'mddddddddm',
            'mdwddddddm',
            'mdwwdddddm',
            'mdwwwdwddm',
            'mdwwwwwddm',
            'mdwwwwwwdm',
            'mdwdwdwddm',
            'mddddddddm',
            '.mmmmmmmm.',
        ],
        // HP bonus: a heart
        hp: [
            '..oo..oo..',
            '.ohhoohho.',
            'ohmwhhmmho',
            'ohwmmmmmdo',
            'ohmmmmmmdo',
            '.ohmmmmdo.',
            '..ohmmdo..',
            '...ohdo...',
            '....oo....',
            '..........',
        ],
        // Defence bonus: a helmet
        defence: [
            '...oooo...',
            '..ohhhho..',
            '.ohhmmmmo.',
            'ohhmmmmmdo',
            'ohkkkkkkdo',
            'ohmmkkmmdo',
            'ohmmkkmmdo',
            'ohmmmmmmdo',
            '.oddooddo.',
            '..oo..oo..',
        ],
        // Effect chance bonus: a wand with a sparkle
        effect: [
            '.....oyo..',
            '....oyyyo.',
            '....ooyo..',
            '...oppo...',
            '..oppo....',
            '.oppo.....',
            'oppo......',
            'opo.......',
            '.o........',
            '..........',
        ],
        // Buff power bonus: a buff chip's rounded shape with an arrow up
        buffpower: [
            '.oooooooo.',
            'ohhhhhhhho',
            'hhoommoomm',
            'hoommmmood',
            'hommmmmmod',
            'hooommoood',
            'ho.ommo.od',
            'mmoommoodd',
            'oddddddddo',
            '.oooooooo.',
        ],
        // 1st place: a gold medal, round with a rim, a bold «1»; the same red ribbon with a white stripe as 2nd and 3rd
        medalGold: [
            '...opvvpo...',
            '...opvvpo...',
            '....oooo....',
            '...oddddo...',
            '..odhkkmdo..',
            '.odhkkkmmdo.',
            '.odhmkkmmdo.',
            '.odmmkkmmdo.',
            '.odmkkkkmdo.',
            '..odmmmmdo..',
            '...oddddo...',
            '....oooo....',
        ],
        // 2nd place: the silver medal, «2»
        medalSilver: [
            '...opvvpo...',
            '...opvvpo...',
            '....oooo....',
            '...oddddo...',
            '..odkkkmdo..',
            '.odhhmmkmdo.',
            '.odhmkkmmdo.',
            '.odmkmmmmdo.',
            '.odmkkkkmdo.',
            '..odmmmmdo..',
            '...oddddo...',
            '....oooo....',
        ],
        // 3rd place: the bronze medal, «3»
        medalBronze: [
            '...opvvpo...',
            '...opvvpo...',
            '....oooo....',
            '...oddddo...',
            '..odkkkmdo..',
            '.odhhmmkmdo.',
            '.odhmkkmmdo.',
            '.odmmmmkmdo.',
            '.odmkkkmmdo.',
            '..odmmmmdo..',
            '...oddddo...',
            '....oooo....',
        ],
        // The tournament: a trophy
        trophy: [
            '.oooooooo.',
            'ohhhmmmmdo',
            'hohhmmmdod',
            'hohhmmmdod',
            'ohhhmmmddo',
            '.ohhmmddo.',
            '..oomdoo..',
            '..oomdoo..',
            '.ohhmmddo.',
            '..oooooo..',
        ],
        // Ranked battle (counts for the Top): a podium
        ranked: [
            '...oooo...',
            '..ohmmdo..',
            '..ohwwdo..',
            'ooohmmdooo',
            'hhhhmmdddd',
            'hmmhmmdmmd',
            'hmmhmmdmmd',
            'hmmhmmdmmd',
            'dddddddddd',
            'oooooooooo',
        ],
        // Friendly duel: a smiling face (the opposite of Rage)
        friendly: [
            '.ohhhhhho.',
            'ohmmmmmmdo',
            'hmmkmmkmmd',
            'hmmkmmkmmd',
            'hmmmmmmmmd',
            'hmkmmmmkmd',
            'hmmkkkkmmd',
            'odmmmmmmdo',
            '.oddddddo.',
            '..oooooo..',
        ],
        // Victory: a laurel wreath tied at the bottom
        victory: [
            '.oho..odo.',
            'ohho..oddo',
            'hohhooddod',
            'hhoo..oodd',
            'hoho..odod',
            'hho....odd',
            'ohho..oddo',
            '.ohhooddo.',
            '..ohyydo..',
            '...oooo...',
        ],
        // Draw: balance scales
        draw: [
            '.ooowwooo.',
            'ommmmmmmmo',
            'omoommoomo',
            'mmmommommm',
            'dddommoddd',
            'oooommoooo',
            '..oommoo..',
            '.ommmmmmo.',
            '..oooooo..',
            '..........',
        ],
        // Waiting, time (betting window, up next, time-out): an hourglass
        hourglass: [
            'ddddddddo.',
            'ohmmmmdo..',
            '.ohyydo...',
            '..oyyo....',
            '.ohoodo...',
            'ohoyyodo..',
            'ohyyyydo..',
            'ddddddddo.',
            'oooooooo..',
            '..........',
        ],
        // The turn counter: a clock dial
        turn: [
            '..oooooo..',
            '.ommmmmmo.',
            'ommwwkwmmo',
            'omwwwkwwmo',
            'omwwwkwwmo',
            'omwwwkkkmo',
            'omwwwwwwmo',
            'ommwwwwmmo',
            '.ommmmmmo.',
            '..oooooo..',
        ],
        // Chance decides (first strike, the tournament draw, the title roulette): a die
        die: [
            '.oooooooo.',
            'owwwwwwwwo',
            'owkwwwwkwo',
            'owwwwwwwwo',
            'owwwkwwwwo',
            'owwwwwwwwo',
            'owkwwwwkwo',
            'owwwwwwwho',
            '.ohhhhhho.',
            '..oooooo..',
        ],
        // The fight is on: a bell
        bell: [
            '...ommo...',
            '..ohmmdo..',
            '.ohmmmmdo.',
            '.ohmmmmdo.',
            '.ohmmmmdo.',
            'ohmmmmmmdo',
            'hmmmmmmmmd',
            'dddddddddd',
            'ooooddoooo',
            '....oo....',
        ],
        // Level up: a double chevron up
        levelup: [
            '...ommo...',
            '..ommmmo..',
            '.ommoommo.',
            'ommoooommo',
            '.ooommooo.',
            '..ommmmo..',
            '.ommoommo.',
            'ommo..ommo',
            '.oo....oo.',
            '..........',
        ],
        // Hall of Fame: a temple
        hall: [
            '..oohhoo..',
            'oohhmmddoo',
            'hhmmmmmmdd',
            'dddddddddd',
            'owowoowowo',
            'owowoowowo',
            'owowoowowo',
            'owowoowowo',
            'dddddddddd',
            'oooooooooo',
        ],
        // A free title spin: a ticket
        ticket: [
            '..........',
            'oooooooooo',
            'hhhhhhhhhd',
            'hommmmmmod',
            'ommwmmmmdo',
            'ommmmmmmdo',
            'hommmmmmod',
            'hddddddddd',
            'oooooooooo',
            '..........',
        ],
        // Stats (!стата): a bar chart
        stats: [
            '.......o..',
            '......omo.',
            '....o.omo.',
            '...omoomo.',
            '.o.omoomo.',
            'omoomoomo.',
            'omoomoomo.',
            'omoomoomoo',
            'dddddddddd',
            'oooooooooo',
        ],
        // XP: a four-point sparkle
        xp: [
            '...omo....',
            '...omo....',
            'ooomwmooo.',
            'mmmwwwmmmo',
            'ooomwmooo.',
            '...omo....',
            '...omo....',
            '....o.....',
            '..........',
            '..........',
        ],
        // Reroll (!рерол): two arrows chasing round a circle
        reroll: [
            '.ommmmo...',
            'omoooomoo.',
            'mo..ommmmo',
            'mo...ommo.',
            'o.....oo..',
            '..oo.....o',
            '.ommo...om',
            'ommmmo..om',
            '.oomoooomo',
            '...ommmmo.',
        ],
        // ----- Batch 4: attacking, the title roulette (10×10) -----
        // Attacking (the card's «АТАКУЄ» tab, the log's «@x атакує…»): two crossed swords
        attacking: [
            '.o......o.',
            'owo....owo',
            '.owo..owo.',
            '..owoowo..',
            '..oohwoo..',
            '.opowhopo.',
            '..opoopo..',
            '.oqoppoqo.',
            'opo.oo.opo',
            '.o......o.',
        ],
        // The title roulette (!титул, !шанси, the reward): a prize wheel in the rarities’ colours, the pointer on top
        roulette: [
            '...ovvo...',
            '.oohvvmoo.',
            '.ohffggdo.',
            'ohfffgggdo',
            'oheewwaado',
            'oheewwaado',
            'omcccbbbdo',
            '.omccbbdo.',
            '.oommddoo.',
            '...oooo...',
        ],
    };

    // ----- Element colours: one family per element -----
    // Red, blue, purple and green are the card frames' light edges (.el-*), gold is ELEMENT_COLORS.gold (the card's #ae8513
    // is too dark on the dark UI), black is the card swatch's slate #4a4a60 lightened 45% towards white (the swatch itself
    // doesn't read on the dark UI; this stays a neutral grey, never a purple)
    const ELEMENT_COLORS = {
        red: '#ff4f5a', blue: '#4a98ff', black: '#9b9ba8', gold: '#f2c14e', purple: '#b47aff', green: '#6fe896',
    };

    // ----- The icons: kind + glyph + element (accent: an icon's own second colour, kept small) -----
    // was: the effect's own colour in EFFECTS / CLASS_ULTIMATES today
    const ICONS = {
        rage:       { kind: 'buff',     element: 'red',    name: { uk: 'Лють', en: 'Rage' },                  emoji: '💢', was: '#ff4d4d' },
        burn:       { kind: 'debuff',   element: 'red',    name: { uk: 'Підпал', en: 'Burn' },                emoji: '🔥', was: '#ff7a1a', accent: '#ffd23f' },
        shield:     { kind: 'buff',     element: 'blue',   name: { uk: 'Щит', en: 'Shield' },                 emoji: '🛡️', was: '#00bfff' },
        frost:      { kind: 'debuff',   element: 'blue',   name: { uk: 'Мороз', en: 'Frost' },                emoji: '❄️', was: '#9fe3ff' },
        shadow:     { kind: 'buff',     element: 'black',  name: { uk: 'Тінь', en: 'Shadow' },                emoji: '🌑', was: '#b27cff' },
        weakness:   { kind: 'debuff',   element: 'black',  name: { uk: 'Слабкість', en: 'Weakness' },         emoji: '🥀', was: '#c77dff' },
        blessing:   { kind: 'buff',     element: 'gold',   name: { uk: 'Благословіння', en: 'Blessing' },     emoji: '🍀', was: '#ffd700' },
        mark:       { kind: 'debuff',   element: 'gold',   name: { uk: 'Мітка', en: 'Mark' },                 emoji: '🎯', was: '#ffb000' },
        divine:     { kind: 'buff',     element: 'purple', name: { uk: 'Божественна міць', en: 'Divine Might' }, emoji: '🌟', was: '#e0a8ff' },
        dispel:     { kind: 'debuff',   element: 'purple', name: { uk: 'Розвіювання', en: 'Dispel' },         emoji: '💨', was: '#d0d0e0' },
        regen:      { kind: 'buff',     element: 'green',  name: { uk: 'Регенерація', en: 'Regeneration' },   emoji: '💚', was: '#41ff41' },
        poison:     { kind: 'debuff',   element: 'green',  name: { uk: 'Отруєння', en: 'Poison' },            emoji: '☠️', was: '#7dff4d' },
        firestorm:  { kind: 'ultimate', element: 'red',    name: { uk: 'Вогняний шторм', en: 'Firestorm' },   emoji: '☄️', was: '#ff6a3d', accent: '#ffd23f' },
        mirror:     { kind: 'ultimate', element: 'blue',   name: { uk: 'Крижане дзеркало', en: 'Ice Mirror' }, emoji: '💠', was: '#7fdcff' },
        theft:      { kind: 'ultimate', element: 'black',  name: { uk: 'Крадіжка тіні', en: 'Shadow Theft' }, emoji: '🦇', was: '#b27cff' },
        jackpot:    { kind: 'ultimate', element: 'gold',   name: { uk: 'Джекпот', en: 'Jackpot' },           emoji: '🎰', was: '#ffd700', accent: '#ff4f5a' },
        detonation: { kind: 'ultimate', element: 'purple', name: { uk: 'Арканна детонація', en: 'Arcane Detonation' }, emoji: '✴️', was: '#e0a8ff' },
        bloom:      { kind: 'ultimate', element: 'green',  name: { uk: 'Цвітіння', en: 'Bloom' },             emoji: '🌸', was: '#ff9ad5', accent: '#ff9ad5' },

        // ----- Batch 2: log notes and title mechanics (bare, 10×10; colour = what they belong to) -----
        // mechanic: the title mechanic this note is the badge of (TITLES_DB bonus.mechanic), so the badge and the note match
        crit:        { kind: 'note', color: '#ffd23f', name: { uk: 'Крит', en: 'Crit' },                         emoji: '💥' },
        block:       { kind: 'note', color: '#9b9ba8', name: { uk: 'Ультраблок', en: 'Ultra-block' },            emoji: '🚫' },
        dodge:       { kind: 'note', color: '#5ee0c8', name: { uk: 'Квантовий ухил', en: 'Quantum Dodge' },       emoji: '🚫', mechanic: 'quantum_dodge' },
        miss:        { kind: 'note', color: '#a9aecb', name: { uk: 'Промах', en: 'Miss' },                        emoji: '(word)' },
        unblockable: { kind: 'note', color: '#d9875f', name: { uk: 'Не блокується', en: 'Unblockable' },         emoji: '(word)', accent: '#ff4f5a' },
        immune:      { kind: 'note', color: '#bfe9ff', name: { uk: 'Імунітет', en: 'Immune' },                   emoji: '🐉', mechanic: 'debuff_immunity' },
        pierce:      { kind: 'note', color: '#c9cde6', name: { uk: 'Крізь броню', en: 'Armour-piercing' },       emoji: '⚡', mechanic: 'armor_piercer' },
        execute:     { kind: 'note', color: '#c9cde6', name: { uk: 'Добивання', en: 'Execute' },                 emoji: '⚰️', mechanic: 'executioner', accent: '#a0652a' },
        sleep:       { kind: 'note', color: '#8ea3cc', name: { uk: 'Проспав хід', en: 'Slept through it' },      emoji: '😴', mechanic: 'sleepy' },
        chaos:       { kind: 'note', color: '#ff7ad9', name: { uk: 'Хаос', en: 'Chaos' },                        emoji: '⚡', mechanic: 'chaotic_charge' },
        thorns:      { kind: 'note', color: '#7fd36b', name: { uk: 'Шипи', en: 'Thorns' },                       emoji: '🌵', mechanic: 'thorns' },
        lifesteal:   { kind: 'note', color: '#c9cde6', name: { uk: 'Вампіризм титулу', en: 'Title lifesteal' },  emoji: '🧛', mechanic: 'lifesteal', accent: '#ff3048' },
        vampheal:    { kind: 'note', color: '#ff3048', name: { uk: 'Лікування укусом', en: 'Vampire heal' },     emoji: '🩸' },
        coin:        { kind: 'note', color: '#f2c14e', name: { uk: 'Герб чи число', en: 'Heads or tails' },      emoji: '🪙', mechanic: 'coin_flip' },
        fortune:     { kind: 'note', color: '#f2c14e', name: { uk: 'Фортуна · 1 HP', en: 'Fortune · 1 HP' },     emoji: '🟨' },
        cat:         { kind: 'note', color: '#ffa64d', name: { uk: 'Кіт', en: 'Cat' },                           emoji: '🐈', mechanic: 'cat_keyboard' },
        guardian:    { kind: 'note', color: '#ffd978', name: { uk: 'Ангел-охоронець', en: 'Guardian angel' },    emoji: '👼', mechanic: 'guardian_shield' },
        opening:     { kind: 'note', color: '#ffb347', name: { uk: 'Баф на старті', en: 'Opening buff' },        emoji: '🌅', mechanic: 'opening_buff' },
        sovereign:   { kind: 'note', color: '#9fe3ff', name: { uk: 'Атака розсіюється', en: 'The attack dissolves' }, emoji: '👑', mechanic: 'streamer_god', accent: '#4a98ff' },
        wrath:       { kind: 'note', color: '#9fe3ff', name: { uk: 'Кара етеру', en: 'Aether wrath' },           emoji: '👑' },
        reflect:     { kind: 'note', color: '#4a98ff', name: { uk: 'Відбиває', en: 'Reflects' },                 emoji: '🟦' },
        suddendeath: { kind: 'note', color: '#ff4f5a', name: { uk: 'Раптова смерть', en: 'Sudden death' },       emoji: '💀' },
        knockout:    { kind: 'note', color: '#a7aab4', name: { uk: 'Нокаут', en: 'Knockout' },                   emoji: '💀' },
        // ----- Batch 2: attack types (line 1 of every log card) -----
        physical:    { kind: 'attack', color: '#e8e2d0', name: { uk: 'Фізична', en: 'Physical' },                emoji: '🗡️' },
        magical:     { kind: 'attack', color: '#b9a6ff', name: { uk: 'Магічна', en: 'Magical' },                 emoji: '🔮' },
        vampire:     { kind: 'attack', color: '#ff5d6c', name: { uk: 'Вампірська', en: 'Vampire' },              emoji: '🧛' },

        // ----- Batch 3: Jackpot's reels -----
        reelgem:     { kind: 'reel', color: '#7fdcff', name: { uk: 'Самоцвіт', en: 'Gem' },                      emoji: '💎' },
        reelcoin:    { kind: 'reel', color: '#f2c14e', name: { uk: 'Монети', en: 'Coins' },                     emoji: '🪙' },
        reelbust:    { kind: 'reel', color: '#ff4f5a', name: { uk: 'Невдача', en: 'Bust' },                     emoji: '💀' },
        // ----- Batch 3: drake emblems (in names, the intro banner, info cards) -----
        emRed:       { kind: 'emblem', element: 'red',    name: { uk: 'Червоний Дрейк', en: 'Red Drake' },       emoji: '🟥' },
        emBlue:      { kind: 'emblem', element: 'blue',   name: { uk: 'Синій Дрейк', en: 'Blue Drake' },         emoji: '🟦' },
        emBlack:     { kind: 'emblem', element: 'black',  name: { uk: 'Чорний Дрейк', en: 'Black Drake' },       emoji: '⬛' },
        emGold:      { kind: 'emblem', element: 'gold',   name: { uk: 'Золотий Дрейк', en: 'Gold Drake' },       emoji: '🟨' },
        emPurple:    { kind: 'emblem', element: 'purple', name: { uk: 'Фіолетовий Дрейк', en: 'Purple Drake' },  emoji: '🟪' },
        emGreen:     { kind: 'emblem', element: 'green',  name: { uk: 'Зелений Дрейк', en: 'Green Drake' },      emoji: '🟩' },
        emDragon:    { kind: 'emblem', color: '#bfe9ff',  name: { uk: 'Білий Дракон', en: 'White Dragon' },      emoji: '🐉' },
        // ----- Batch 3: title bonuses (crit's is the crit note) -----
        hp:          { kind: 'bonus', color: '#ff5d6c', name: { uk: 'HP', en: 'HP' },                            emoji: '❤️' },
        defence:     { kind: 'bonus', color: '#c9cde6', name: { uk: 'Захист', en: 'Defence' },                   emoji: '🛡️' },
        effect:      { kind: 'bonus', color: '#e0a8ff', name: { uk: 'Шанс ефекту', en: 'Effect chance' },        emoji: '(none)', accent: '#a0652a' },
        buffpower:   { kind: 'bonus', color: '#6bff9a', name: { uk: 'Сила бафів', en: 'Buff power' },            emoji: '(none)' },
        // ----- Batch 3: places and the tournament -----
        medalGold:   { kind: 'medal', color: '#f2c14e', name: { uk: '1-ше місце', en: '1st place' },             emoji: '🏆 / 🥇', accent: '#ff4f5a' },
        medalSilver: { kind: 'medal', color: '#c9cde6', name: { uk: '2-ге місце', en: '2nd place' },             emoji: '🥈', accent: '#ff4f5a' },
        medalBronze: { kind: 'medal', color: '#d69a5f', name: { uk: '3-тє місце', en: '3rd place' },             emoji: '🥉', accent: '#ff4f5a' },
        trophy:      { kind: 'ui', color: '#f2c14e', name: { uk: 'Турнір', en: 'Tournament' },                   emoji: '🏆' },
        // ----- Batch 3: UI (the plate, banners, the result card, the Top, info cards) -----
        ranked:      { kind: 'ui', color: '#f2c14e', name: { uk: 'Рейтинговий бій', en: 'Ranked battle' },       emoji: '🏆' },
        friendly:    { kind: 'ui', color: '#ffb36b', name: { uk: 'Товариська дуель', en: 'Friendly duel' },      emoji: '🤝' },
        victory:     { kind: 'ui', color: '#f2c14e', name: { uk: 'Перемога', en: 'Victory' },                    emoji: '🏆' },
        draw:        { kind: 'ui', color: '#c9cde6', name: { uk: 'Нічия', en: 'Draw' },                          emoji: '🤝' },
        hourglass:   { kind: 'ui', color: '#c9cde6', name: { uk: 'Очікування, час', en: 'Waiting, time' },       emoji: '⏳' },
        turn:        { kind: 'ui', color: '#c9cde6', name: { uk: 'Хід', en: 'Turn' },                            emoji: '⚔️' },
        die:         { kind: 'ui', color: '#e8e2d0', name: { uk: 'Жереб', en: 'Chance' },                        emoji: '🎲' },
        bell:        { kind: 'ui', color: '#f2c14e', name: { uk: 'Бій почався', en: 'The fight is on' },         emoji: '🔔' },
        levelup:     { kind: 'ui', color: '#ffd978', name: { uk: 'Новий рівень', en: 'Level up' },               emoji: '⬆️' },
        hall:        { kind: 'ui', color: '#e8e2d0', name: { uk: 'Зала слави', en: 'Hall of Fame' },             emoji: '🏛️' },
        ticket:      { kind: 'ui', color: '#f2c14e', name: { uk: 'Безкоштовний прокрут', en: 'Free spin' },      emoji: '🎟️' },
        stats:       { kind: 'ui', color: '#4a98ff', name: { uk: 'Стата', en: 'Stats' },                         emoji: '📊' },
        xp:          { kind: 'ui', color: '#ffd23f', name: { uk: 'Досвід', en: 'XP' },                           emoji: '✨' },
        reroll:      { kind: 'ui', color: '#b47aff', name: { uk: 'Рерол', en: 'Reroll' },                        emoji: '🔥' },
        // ----- Batch 4 -----
        attacking:   { kind: 'ui', color: '#c9cde6', name: { uk: 'Атакує', en: 'Attacking' },                    emoji: '⚔', accent: '#f2c14e' },
        roulette:    { kind: 'ui', color: '#f2c14e', name: { uk: 'Рулетка титулів', en: 'Title roulette' },     emoji: '🎰',
                       pal: { a: '#a0a0a0', b: '#2ecc71', c: '#3498db', e: '#b36bff', f: '#f1c40f', g: '#ff4757' } },   // the rarities' colours
    };
    Object.values(ICONS).forEach(ic => { if (ic.element) ic.color = ELEMENT_COLORS[ic.element]; });
    const EFFECT_ICON_IDS = ['rage', 'burn', 'shield', 'frost', 'shadow', 'weakness', 'blessing', 'mark', 'divine', 'dispel', 'regen', 'poison'];
    const ULTIMATE_ICON_IDS = ['firestorm', 'mirror', 'theft', 'jackpot', 'detonation', 'bloom'];
    const NOTE_ICON_IDS = Object.keys(ICONS).filter(id => ICONS[id].kind === 'note');
    const ATTACK_ICON_IDS = Object.keys(ICONS).filter(id => ICONS[id].kind === 'attack');
    const BATCH4_ICON_IDS = ['attacking', 'roulette'];
    const BATCH3_ICON_IDS = Object.keys(ICONS).filter(id => ['reel', 'emblem', 'bonus', 'medal', 'ui'].includes(ICONS[id].kind) && !BATCH4_ICON_IDS.includes(id));

    // ----- Palette from one colour -----
    const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
    const toHex = rgb => '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
    const mix = (a, b, t) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t));
    function paletteOf(color, accent = color) {
        return {
            o: mix(color, '#06070b', 0.84),   // outline
            d: mix(color, '#000000', 0.42),   // dark side (bottom right)
            m: color,                          // the colour
            h: mix(color, '#ffffff', 0.42),   // light side (top left)
            w: mix(color, '#ffffff', 0.8),    // highlight
            p: accent,                         // accent
            q: mix(accent, '#000000', 0.35),  // accent dark
            y: '#ffd23f',                      // yellow (Bloom's centre, the bat's eyes, the cat's eyes)
            k: '#0b0c10',                      // near-black (the eclipse's disc)
            v: '#ffffff',                      // white (the warning sign's «!»)
        };
    }

    // ----- Title badges: the mechanic's (or bonus's) 10×10 glyph in a 12×12 rarity frame -----
    // The frame is 1 pixel, so the glyph inside is the very same one as the log note: badge and note are one icon. Rarity shows
    // in the frame's pattern as well as its colour (colour-blind viewers), richer up the ladder: common plain with cut corners,
    // uncommon light corner studs, rare light studs mid-side, epic notched corners lit top-left, legendary a solid edge lit
    // top-left, mythic (the richest) a solid red edge with gold corners and a white gem on top; meme a dotted edge in pink and
    // yellow (confetti); divine white star points at the corners. In the Top (×1, 12 px) the frame is left out: the bare glyph.
    // Letters: A light, B colour, C dark, E the plaque inside, W white, Y gold.
    const RARITY_COLORS = { common: '#a0a0a0', uncommon: '#2ecc71', rare: '#3498db', epic: '#b36bff', legendary: '#f1c40f', mythic: '#ff4757', meme: '#ff66cc', divine: '#9fe3ff' };
    const TITLE_FRAMES = {
        common: [
            '.BBBBBBBBBB.',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            '.BBBBBBBBBB.',
        ],
        uncommon: [
            'AABBBBBBBBAA',
            'AEEEEEEEEEEA',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'AEEEEEEEEEEA',
            'AABBBBBBBBAA',
        ],
        rare: [
            '.BBBBAABBBB.',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'AEEEEEEEEEEA',
            'AEEEEEEEEEEA',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            '.BBBBAABBBB.',
        ],
        epic: [
            '..AAAAAAAA..',
            '.AEEEEEEEEC.',
            'AEEEEEEEEEEC',
            'AEEEEEEEEEEC',
            'AEEEEEEEEEEC',
            'AEEEEEEEEEEC',
            'AEEEEEEEEEEC',
            'AEEEEEEEEEEC',
            'AEEEEEEEEEEC',
            'AEEEEEEEEEEC',
            '.AEEEEEEEEC.',
            '..CCCCCCCC..',
        ],
        legendary: [
            'AAAAAAAAAAAB',
            'AEEEEEEEEEEC',
            'AEEEEEEEEEEC',
            'AEEEEEEEEEEC',
            'AEEEEEEEEEEC',
            'AEEEEEEEEEEC',
            'AEEEEEEEEEEC',
            'AEEEEEEEEEEC',
            'AEEEEEEEEEEC',
            'AEEEEEEEEEEC',
            'AEEEEEEEEEEC',
            'BCCCCCCCCCCC',
        ],
        mythic: [
            'YYAAAWWAAAYY',
            'YEEEEEEEEEEY',
            'AEEEEEEEEEEC',
            'AEEEEEEEEEEC',
            'AEEEEEEEEEEC',
            'AEEEEEEEEEEC',
            'AEEEEEEEEEEC',
            'AEEEEEEEEEEC',
            'AEEEEEEEEEEC',
            'AEEEEEEEEEEC',
            'YEEEEEEEEEEY',
            'YYCCCCCCCCYY',
        ],
        meme: [
            'B.Y.B.Y.B.Y.',
            '.EEEEEEEEEEB',
            'YEEEEEEEEEE.',
            '.EEEEEEEEEEY',
            'BEEEEEEEEEE.',
            '.EEEEEEEEEEB',
            'YEEEEEEEEEE.',
            '.EEEEEEEEEEY',
            'BEEEEEEEEEE.',
            '.EEEEEEEEEEB',
            'YEEEEEEEEEE.',
            '.Y.B.Y.B.Y.B',
        ],
        divine: [
            'WBBBBBBBBBBW',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'BEEEEEEEEEEB',
            'WBBBBBBBBBBW',
        ],
    };
    const framePalette = color => ({ A: mix(color, '#ffffff', 0.4), B: color, C: mix(color, '#000000', 0.4), E: mix(color, '#0b0c10', 0.86), W: '#ffffff', Y: '#ffd23f' });
    const titleCache = {};
    function makeTitleCanvas(id, rarity, doc = root.document) {
        const key = id + '|' + rarity;
        if (titleCache[key]) return titleCache[key];
        const frame = TITLE_FRAMES[rarity], fpal = framePalette(RARITY_COLORS[rarity]);
        const c = doc.createElement('canvas');
        c.width = c.height = 12;
        const g = c.getContext('2d');
        frame.forEach((row, y) => { for (let x = 0; x < 12; x++) if (row[x] !== '.') { g.fillStyle = fpal[row[x]]; g.fillRect(x, y, 1, 1); } });
        g.drawImage(makeIconCanvas(id, doc), 1, 1);
        return (titleCache[key] = c);
    }
    function titleImg(id, rarity, scale = 2, cls = 'px-icon') {
        const s = Math.max(1, Math.round(scale));
        return `<img class="${cls}" src="${makeTitleCanvas(id, rarity).toDataURL()}" width="${12 * s}" height="${12 * s}" alt="${ICONS[id].name.en}" style="image-rendering: pixelated">`;
    }

    // ----- Rows: the glyph itself (no frame), checked against its category's size -----
    function iconRows(id) {
        const rows = GLYPHS[id], size = SIZES[ICONS[id].kind];
        if (rows.length !== size || rows.some(r => r.length !== size)) throw new Error(`${id}: not ${size}×${size}`);
        return rows;
    }

    // Drawn once per icon at 1×; larger sizes are the same canvas drawn with image smoothing off, or CSS pixelated.
    // `pal` adds an icon's own letters (the roulette's rarity colours).
    const cache = {};
    function makeIconCanvas(id, doc = root.document) {
        if (cache[id]) return cache[id];
        const rows = iconRows(id), pal = Object.assign(paletteOf(ICONS[id].color, ICONS[id].accent), ICONS[id].pal);
        const c = doc.createElement('canvas');
        c.width = rows[0].length; c.height = rows.length;
        const g = c.getContext('2d');
        rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] !== '.') { g.fillStyle = pal[row[x]]; g.fillRect(x, y, 1, 1); } });
        return (cache[id] = c);
    }
    const iconURL = id => makeIconCanvas(id).toDataURL();
    // <img> at a whole-number scale (1, 2, 3 …), never anything in between
    function iconImg(id, scale = 2, cls = 'px-icon') {
        const c = makeIconCanvas(id), s = Math.max(1, Math.round(scale));
        return `<img class="${cls}" src="${iconURL(id)}" width="${c.width * s}" height="${c.height * s}" alt="${ICONS[id].name.en}" style="image-rendering: pixelated">`;
    }

    // ----- Chips: buff or debuff is the chip's shape, the element its colour -----
    // Every effect icon sits in a chip (card chips, log chips, ticks, compact chips). The chip is drawn like the icons, as a
    // small pixel image (both end caps and a 1-pixel middle), and stretched by CSS border-image, so the caps keep their shape
    // at any width: buff = rounded ends, debuff = angled (pointed) ends. 22 px tall, the caps 8 px wide; border and fill are
    // the element's colour (1 px border, a light tint inside).
    const CHIP = { h: 22, cap: 8 };
    const CHIP_SHAPES = {
        // How far each row of the left cap is cut in (0 = the full width): a quarter circle at each corner
        buff: y => { const r = CHIP.cap, d = y < r ? r - y - 0.5 : y >= CHIP.h - r ? y - (CHIP.h - r) + 0.5 : -1; return d < 0 ? 0 : Math.round(r - Math.sqrt(Math.max(0, r * r - d * d))); },
        // A straight slant from the middle out to both corners
        debuff: y => Math.round(Math.abs(y - (CHIP.h - 1) / 2) * (CHIP.cap - 1) / ((CHIP.h - 1) / 2)),
    };
    const rgba = (c, a) => `rgba(${hex(c).join(', ')}, ${a})`;
    const chipCache = {};
    function chipURL(element, kind, doc = root.document) {
        const key = element + '|' + kind;
        if (chipCache[key]) return chipCache[key];
        const w = CHIP.cap * 2 + 1, cut = CHIP_SHAPES[kind], color = ELEMENT_COLORS[element] || element;
        const inside = (x, y) => y >= 0 && y < CHIP.h && x >= 0 && x < w && Math.min(x, w - 1 - x) >= cut(y);
        const c = doc.createElement('canvas');
        c.width = w; c.height = CHIP.h;
        const g = c.getContext('2d');
        for (let y = 0; y < CHIP.h; y++) for (let x = 0; x < w; x++) {
            if (!inside(x, y)) continue;
            const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
            g.fillStyle = edge ? rgba(color, 0.62) : rgba(color, 0.12);
            g.fillRect(x, y, 1, 1);
        }
        return (chipCache[key] = c.toDataURL());
    }
    // The CSS for a chip of this element and kind (the element's text colour goes with it)
    const chipStyle = (element, kind) => `border-style: solid; border-width: 1px ${CHIP.cap}px; border-image: url(${chipURL(element, kind)}) 1 ${CHIP.cap} fill / 1px ${CHIP.cap}px stretch; color: ${mix(ELEMENT_COLORS[element], '#ffffff', 0.35)};`;

    root.DrakeIcons = { CHIP, CHIP_SHAPES, chipURL, chipStyle, SIZES, GLYPHS, ICONS, ELEMENT_COLORS, EFFECT_ICON_IDS, ULTIMATE_ICON_IDS, NOTE_ICON_IDS, ATTACK_ICON_IDS, BATCH3_ICON_IDS, BATCH4_ICON_IDS, RARITY_COLORS, TITLE_FRAMES, makeTitleCanvas, titleImg, paletteOf, iconRows, makeIconCanvas, iconURL, iconImg };
})(typeof window !== 'undefined' ? window : globalThis);
