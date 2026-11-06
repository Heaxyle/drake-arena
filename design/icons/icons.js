// Drake Arena icon set: the glyphs, the set's record (each icon's size, names, element colour, its chip). The overlay draws
// the V2 set drawn from them (design/icons/v2/: 4× denser, a still and an idle loop each; style.md, "V2"); the review page
// and the player guide draw these. Same format as DRAKE_SPRITES: a palette plus rows of palette letters ('.' = transparent),
// drawn once to a canvas and cached, shown only at whole-number scales (see style.md). No frames: every effect glyph has the
// whole 10×10 (buff or debuff shows in the chip around it: CHIP_SHAPES below), every ultimate its own 12×12 silhouette.
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
        // The title roulette (!титул, !шанси, the reward): a prize wheel, 11×11 so it has a centre pixel and its spokes are clean
        // 1-pixel lines: eight sectors in the rarities' colours split by dark spokes, a gold rim and hub, a white pointer
        // triangle on top pointing down into the wheel
        roulette: [
            '..ovvvvvo..',
            '..oovvvoo..',
            '.ohgovonmo.',
            'ohfogonormo',
            'ohffooorrdo',
            'oooooyooooo',
            'oheeoooaado',
            'omeocoboado',
            '.omccobbdo.',
            '..ommoddo..',
            '...ooooo...',
        ],
        // ----- The White Drake: white steel, the green accent (notes and the badge 10×10, the anvil 12×12) -----
        // The White Drake's scales («Луска Дракона», the bar's number on its card): a white-steel scale over a darker one, layered
        scales: [
            'oooooooooo',
            'odohwmmodo',
            'odohhmdodo',
            'odohhmdodo',
            'oddohdoddo',
            'odddooddso',
            '.odddddso.',
            '..oddsso..',
            '...oooo...',
            '..........',
        ],
        // A debuff bounced off the scales: an arrow glancing off a steel plate, a green spark where it hits
        bounce: [
            'vvv...oooo',
            'vv....ohdo',
            'v.v...ohdo',
            '...v..ohdo',
            '....vpohdo',
            '...d..ohdo',
            '..d....oo.',
            '.d........',
            'd.........',
            '..........',
        ],
        // The scales cracked: the scale split down a red crack, the right half dropped a pixel
        cracked: [
            'ooooor....',
            'odohwroooo',
            'odohrmmodo',
            'odohhrdodo',
            'oddormdodo',
            'odddoroddo',
            '.oddroddso',
            '..oddrdso.',
            '...orsso..',
            '....roo...',
        ],
        // Перекування (Reforging): a sledgehammer tilted 45°, head up, green sparks off its striking face
        reforge: [
            '...odho...',
            '..odmmho..',
            '..odmmmho.',
            '...odmmmho',
            '...oddmmho',
            '..odsodhop',
            '.odso.oo..',
            'odso....p.',
            'dso...p..v',
            'so........',
        ],
        // Магніт (Magnet): a horseshoe magnet, its poles green
        magnet: [
            'pppp..pppp',
            'pqqp..pqqp',
            'oooo..oooo',
            'ohmo..omdo',
            'ohmo..omdo',
            'ohmmoomddo',
            'ohwmmmmddo',
            '.ohmmmmdo.',
            '..oooooo..',
            '..........',
        ],
        // Удар ковадла (Anvil Strike): an anvil, sparks flying off its face
        anvil: [
            '....v.p.v...',
            '.....pvp....',
            '..p...p...p.',
            '..oooooooooo',
            'oohwwwwwhhmo',
            '.oohhmmmmmdo',
            '...ooohmmddo',
            '....ohhmdo..',
            '....ohmmdo..',
            '...ohhmmmdo.',
            '..ohhmmmmddo',
            '..oooooooooo',
        ],
        // «Біла сталь» (title 998): an upright sword in white steel, a green gem in the guard
        whiteSteel: [
            '....oo....',
            '...ohwo...',
            '...ohmo...',
            '...ohmo...',
            '...ohmo...',
            '...ohdo...',
            '.oooooooo.',
            '.ohhppmdo.',
            '.ooossooo.',
            '....pp....',
        ],
        // ----- The titles' own icons: a title's badge, and the note its ability fires (the ICONS records say whose) -----
        // Незламний модератор (title 176): a shield with the moderator's sword across it; a glint runs down the blade
        modShield: [
            '.oooooooo.',
            'ohhhvvmmmo',
            'ohhmvwmmdo',
            'ohmmvwmmdo',
            'ommmvwmmdo',
            'omyyyyyydo',
            '.ommpqmdo.',
            '.ommpqmdo.',
            '..odpqdo..',
            '...oooo...',
        ],
        // Надмозок всесвіту (title 97): a violet brain with a little galaxy in it; stars twinkle, a moon orbits
        bigBrain: [
            '..........',
            '..oooooo..',
            '.ohhwhhmo.',
            'ohhmhmhmmo',
            'ohmpmdmvdo',
            'omhmdmmmdo',
            'omdmmmdmdo',
            'ommdmpmddo',
            '.oddmddddo',
            '..oooooo..',
        ],
        // Дзен при 1 HP (title 178): a lotus, one tiny heart floating above it, bobbing
        zenLotus: [
            '...p..p...',
            '...pppp...',
            '....pp....',
            '....oo....',
            '.o.ohmo.o.',
            'oh.ohmo.do',
            'ohmohmomdo',
            'ohmmmmmmdo',
            '.oddddddo.',
            '..oooooo..',
        ],
        // Привид лагу (title 179): a pixel ghost that stutters like lag, a ping meter beside it
        lagGhost: [
            '.ooooo....',
            'ohhwmdo...',
            'ohhmmdo...',
            'ohkmkdo...',
            'ohmmmdo..p',
            'ommmmdo..p',
            'ommmmdo.pp',
            'ommmmdo.pp',
            'omdmdmoppp',
            'o.o.o.oqqq',
        ],
        // Феєрверк хаосу (title 180): a rocket climbs and bursts into sparks that fade
        chaosFirework: [
            'y...p...y.',
            '.h..v..h..',
            '..myvym...',
            'pvyvwvyvp.',
            '..myvym...',
            '.h..v..h..',
            'y...p...y.',
            '....o.....',
            '....d.....',
            '....o.....',
        ],
        // Перша кава дня (title 182): a mug of coffee, steam curling; once a loop a lightning bolt jumps out
        firstCoffee: [
            '..v..v....',
            '...v..v...',
            '..v..v....',
            'oooooooo..',
            'opppppqo..',
            'ohmmmmdoo.',
            'ohyyyydo.o',
            'ohmmmmdoo.',
            '.ohmmdo...',
            '..oooo....',
        ],
        // Їжак-ображака (title 184): a hedgehog with an apple on its spines; it huffs, the spines bristle, the apple hops
        grumpyHedgehog: [
            '..k.......',
            '.ppq......',
            '.pqqd.d...',
            'dmdmdmdo..',
            'mdmdmdwwo.',
            'dmdmdwkwwo',
            'mdmdwwwwwk',
            'odmdwwwwo.',
            '.oooooooo.',
            '..o....o..',
        ],
        // Енергетичний вампір (title 185): a battery with a bite out of it, its charge draining bar by bar
        energyVampire: [
            '..........',
            '..........',
            'ooooo..oo.',
            'ohhho.ohdo',
            'opppqkkkoo',
            'opppqkkkoo',
            'opppqkkkoo',
            'odddddddo.',
            'ooooooooo.',
            '..........',
        ],
        // Кат лоу-хп (title 188): a skull over an almost empty HP bar, the last sliver blinking
        lowHpSkull: [
            '..oooooo..',
            '.ohhwhhmo.',
            'ohhmmmmmdo',
            'ohppmmppdo',
            'ohmmkkmmdo',
            '.ovdvdvdo.',
            '..oooooo..',
            'oooooooooo',
            'opkkkkkkko',
            'oooooooooo',
        ],
        // Картопля Шредінгера (title 190): a box whose lid flips open: once a potato, once a «?»
        schrodPotato: [
            '...pqp....',
            '..pqpqp...',
            'oho.pp.oho',
            'ohhooooodo',
            'ohmmmmmmdo',
            'ohmddmmmdo',
            'ohmmmmmmdo',
            'ohmmmmmmdo',
            'oddddddddo',
            'oooooooooo',
        ],
        // Лінивець-берсерк (title 192): a sloth in a red headband dozing, then snapping awake, furious
        berserkSloth: [
            '..oooooo..',
            '.ohhhhhmo.',
            'ppppppppqp',
            'ohwwwwwwdo',
            'ohkwwwwkdo',
            'ohwwkkwwdo',
            'ohmwwwwmdo',
            '.ohmmmmdo.',
            '..oooooo..',
            '..........',
        ],
        // Код-спагеті (title 194): spaghetti on a plate in a terminal window; steam rises, the «>_» prompt blinks
        spaghettiCode: [
            'oooooooooo',
            'omvmymmmmo',
            'owwkkkkkko',
            'okkkpppkko',
            'okkppqppko',
            'okpqppqpko',
            'okvvvvvvko',
            'okkvvvvkko',
            'okkkkkkkko',
            'oooooooooo',
        ],
        // The Legendary titles 205–244, one each
        // Три в ряд (title 205): three pink candy tiles in a row, lighting up one after another; a full row sparkles
        matchThree: [
            '..........',
            '..........',
            '.v..v..v..',
            '..........',
            'oooooooooo',
            'owhowhowho',
            'ohmohmohmo',
            'omdomdomdo',
            'oooooooooo',
            '..........',
        ],
        // Ритм-машина (title 206): a wooden metronome, its arm swinging to the beat
        metronome: [
            '....oo....',
            '...ohdo...',
            '...opko...',
            '..ohpkdo..',
            '..ohpydo..',
            '.ohppkpdo.',
            '.ohpkppdo.',
            'ohmmkmmmdo',
            'oddddddddo',
            'oooooooooo',
        ],
        // Третій удар — мій (title 207): a big comic-book «3», sparks bursting around it on the beat
        thirdHit: [
            '..........',
            'y..mmmm...',
            '..mmppmm.y',
            '...pp.mmp.',
            '....mmmpp.',
            '.....pmm..',
            'y.mm..mmp.',
            '...mmmmpp.',
            '....pppp..',
            '.........y',
        ],
        // Швидкий палець (title 208): a finger jabbing a red button, a sparkle popping off
        quickFinger: [
            '...wwww...',
            '..ohmmmo..',
            '.ohmmmmdo.',
            '.ohmhmhdo.',
            '..ohmmdo..',
            '...hdo....',
            '.v.hd...v.',
            '..pvpppp..',
            '.oqqqqqqo.',
            '..oooooo..',
        ],
        // Перший у черзі (title 209): a traffic light going from red, then red and yellow, to green
        trafficLight: [
            '..oooooo..',
            '..ohkkdo..',
            '..ohkkdo..',
            '..ohmmdo..',
            '..ohkkdo..',
            '..ohkkdo..',
            '..ohmmdo..',
            '..ohwpdo..',
            '..ohpqdo..',
            '..oooooo..',
        ],
        // Рання пташка (title 210): a robin on a branch with a worm in its beak
        earlyBird: [
            '..........',
            '....ooo...',
            '...ohmmo..',
            '...ohmkow.',
            '..ohmmppow',
            '.ohmmdppo.',
            'ohmmddppo.',
            '.oddddqo..',
            'ohhhhhhhho',
            '.oooooooo.',
        ],
        // Залізна шкура (title 211): a riveted steel plate, a glint running along its edge
        ironPlate: [
            '..........',
            'oooooooooo',
            'owhhhhhhwo',
            'ohmmmmmwdo',
            'ohmmmmwmdo',
            'ohmmmwmmdo',
            'ohmmwmmmdo',
            'owddddddwo',
            'oooooooooo',
            '..........',
        ],
        // Бетонний дрейк (title 212): a concrete cinder block, a chip flicking off its corner
        cinderBlock: [
            '..........',
            '..........',
            '..oooooooo',
            '.ohkkhkkdo',
            'ohhhhhhhdo',
            'ommhmmmhdo',
            'omhmmhmmdo',
            'ommmmmmmdo',
            'oddddddddo',
            'oooooooooo',
        ],
        // Танк чату (title 213): a purple tank, a chat bubble popping up over its turret
        chatTank: [
            '.......vvv',
            '.......vmv',
            '...oooov..',
            '..ohhmmo..',
            '..ohmmmodd',
            '.ohhhhhhdo',
            'ohmmmmmmdo',
            'oppppppppo',
            'opwpwpwpqo',
            '.oooooooo.',
        ],
        // Останній бастіон (title 214): a stone tower, its red flag fluttering
        bastion: [
            '....opp...',
            '....oq....',
            '.hh.hh.hd.',
            '.hhhhhhhd.',
            '.hmmmmmmd.',
            '.hmhmmhmd.',
            '.hmmkkmmd.',
            '.hmmkkmmd.',
            '.hmmkkmmd.',
            '.dddddddd.',
        ],
        // Ще не кінець (title 215): a candle stub whose flame flares up again
        candleStub: [
            '..........',
            '.....p..v.',
            '....pyp...',
            '....pyp...',
            '.....k....',
            '...hwmd...',
            '...hmmd...',
            '...hmmd...',
            '.yyyyyyyy.',
            '..qqqqqq..',
        ],
        // Камбек року (title 216): a red boxing glove rising in an uppercut
        uppercut: [
            '...oooo...',
            '..ohhmmo..',
            '.ohhmmmdo.',
            '.ohmmmmdo.',
            '.odmmmddo.',
            '..opppqo..',
            '..ommmdo..',
            '..opppqo..',
            '..d.d.d...',
            '..d...d...',
        ],
        // Відповідь не забариться (title 217): a tennis racket, a ball bouncing back off it
        racket: [
            '.ommmmo...',
            'omkpkpmo.y',
            'mkpkpkpm..',
            'mpkpkpkm..',
            'mkpkpkpm..',
            'omkpkpmo..',
            '.ommmmdo..',
            '......dp..',
            '.......pq.',
            '........qo',
        ],
        // Відбиваю, не дивлячись (title 218): a blindfolded head, a sword raised to parry, sparks off the blade
        blindfold: [
            '........v.',
            '..oooo..v.',
            '.oddddo.v.',
            'qpppppp.v.',
            '.ohmmmdov.',
            '.ohmmmdov.',
            '..ommdo.v.',
            '...oo..yyy',
            '........d.',
            '........y.',
        ],
        // Фехтувальник (title 219): a fencing foil, a glint running up the blade to a spark at the tip
        fencingFoil: [
            '.........y',
            '........v.',
            '.......w..',
            '......h...',
            '.....h....',
            '..ohm.....',
            '..hwmd....',
            '..odd.....',
            '.k........',
            'k.........',
        ],
        // Пожирач бафів (title 220): a toothy red mouth chomping down on a gold star
        buffEater: [
            '..........',
            '..oooooo..',
            '.ohhhhhmo.',
            'ohmmmmmmdo',
            'ovkvyyvkvo',
            'okkyyyykko',
            'ovkvyyvkvo',
            'ommmmmmmdo',
            '.oddddddo.',
            '..oooooo..',
        ],
        // Збирач чужих бонусів (title 221): a burlap sack, stars dropping into it
        bonusSack: [
            '.......y..',
            '...ohmo..y',
            '....pp....',
            '...ohmo...',
            '..ohmmmo..',
            '.ohmmmmdo.',
            '.ohmmmmdo.',
            '.ohmmmddo.',
            '..oddddo..',
            '...oooo...',
        ],
        // Податківець (title 222): a purse taking in coins, a «%» tax tag hanging off it
        taxPurse: [
            '...y......',
            '..oyyo....',
            '.oyyyyo...',
            'ohhhhhmo..',
            'ohmmmmmdo.',
            'ohmmmmmdo.',
            'ohmmmmdvvv',
            '.oddddovpv',
            '..oooo.vvv',
            '..........',
        ],
        // Заряджений на повну (title 223): an amber crystal cluster glowing brighter, pulse by pulse
        chargeCrystal: [
            '....wm..v.',
            '.v.hwmd...',
            '...hwmd.d.',
            '.h.hwmdmd.',
            '.hmhwmdmd.',
            '.hmhwmdmd.',
            '.hmhwmdmd.',
            '.hmhwmdmd.',
            '.pppppppp.',
            '..qqqqqq..',
        ],
        // Турборежим (title 224): a turbine spinning fast
        turbine: [
            '...pppp...',
            '.ppkkwmpp.',
            '.pkmkkmkp.',
            'pmmwmkwmkp',
            'pwkkvvmkkp',
            'pkkmvvkkwp',
            'pkmwkmwmmp',
            '.pkmkkmkp.',
            '.ppmwkkpp.',
            '...pppp...',
        ],
        // Завжди напоготові (title 225): a drawn bow with an arrow nocked, the string trembling
        drawnBow: [
            '...hw.....',
            '..h.w.....',
            '.h..w.....',
            '.h..w...v.',
            '.phhhhhhvv',
            '.q..w...v.',
            '.d..w.....',
            '.d..w.....',
            '..d.w.....',
            '...dw.....',
        ],
        // Снігова куля (title 226): a snowball rolling down a snowy slope
        snowball: [
            '..........',
            '....oooo..',
            '...ovwwho.',
            'w.owwwwhmo',
            '..owwwhmmo',
            'w.ohwhhmdo',
            '...ohmmdo.',
            '....oooo..',
            'hwwwhwwwhw',
            'mhhmhhmhhm',
        ],
        // Розгін до сотні (title 227): a speedometer, its needle climbing into the red
        speedometer: [
            '..........',
            '..........',
            '..mmmmmm..',
            '.mhyyyppd.',
            'mhkkkkkkpd',
            'mkkkkkkpkd',
            'mkkkkkpkkd',
            'mkkkkvkkkd',
            'mddddddddd',
            '..........',
        ],
        // Невпинний (title 228): a boulder rolling on, dust kicking up behind it
        boulder: [
            '..........',
            '..........',
            '....oooo..',
            '...ohhhmo.',
            '..ohhmdmdo',
            '..ohmmmmdo',
            '.hohmdmddo',
            'h..oddddo.',
            'dddddddddd',
            '..........',
        ],
        // Чистий сигнал (title 229): a monitor where a noisy waveform smooths into a clean wave
        cleanSignal: [
            '..........',
            'hhhhhhhhhd',
            'hkkkkkkkkd',
            'hkkpkkkkkd',
            'hkpkpkkkpd',
            'hpkkkpkpkd',
            'hkkkkkpkkd',
            'hkkkkkkkkd',
            'dddddddddd',
            '..........',
        ],
        // Антидот (title 230): a flask of teal antidote, bubbles rising
        antidote: [
            '....pp..v.',
            '...oqqo...',
            '...owvo...',
            '...owwo...',
            '..owwwwo..',
            '.owhmwmmo.',
            '.ohmmmvdo.',
            '.ohmmmmdo.',
            '..oddddo..',
            '...oooo...',
        ],
        // Вічно свіжий (title 231): a pink bar of soap, bubbles rising off it
        soapBar: [
            '.......v..',
            '....v.....',
            '......w...',
            '..........',
            '..oooooo..',
            '.ohwwhhmo.',
            'ohhhhmmmdo',
            'ommmmmmddo',
            '.oddddddo.',
            '..oooooo..',
        ],
        // Довгограйний (title 232): a vinyl record spinning under the tonearm
        vinylRecord: [
            '.........v',
            '...oooo..w',
            '.oodmmdoow',
            'odmhmmmmwo',
            'omhmppmvmo',
            'ommmpqmmmo',
            'ommmmmhmmo',
            'odmmmmmmdo',
            '.oodmmdoo.',
            '...oooo...',
        ],
        // Вічний двигун (title 233): two gears, gold and steel, turning together
        gears: [
            '......p.p.',
            '.....ppppq',
            '......pkq.',
            '.h.m.dpqqq',
            'hhhmmdd.q.',
            '.hmmmd....',
            'hmmkmdd...',
            '.mmmdd....',
            'mmddddd...',
            '.m.d.d....',
        ],
        // Бонус на бонус (title 234): three gold stars stacked up, a fourth landing on top
        starStack: [
            '.v...w....',
            '...ymmmd.v',
            '....mmd...',
            '....mwd...',
            '...ymmmd..',
            '....mmd...',
            '....mwd...',
            '...ymmmd..',
            '....mmd...',
            '....m.d...',
        ],
        // Друге дихання (title 235): a striped windsock on its pole, sagging and filling with wind again
        windsock: [
            '.v........',
            '.whmppmmp.',
            '.wmmppmmpp',
            '.wddqqdd..',
            '.w........',
            '.w...ww...',
            '.w........',
            '.w.ww.....',
            '.w........',
            '.w........',
        ],
        // Аптечка в кишені (title 236): a red first-aid kit with a white cross, sticking out of a jeans pocket
        pocketKit: [
            '...oooo...',
            '...o..o...',
            '.ohhhhhmo.',
            '.ohmvvmdo.',
            '.ohvvvvdo.',
            '.ohmvvmdo.',
            'oypppppyqo',
            'opppppppqo',
            '.oppppppo.',
            '..oqqqqo..',
        ],
        // Відкривачка (title 237): a can opener prying the lid off a can
        canOpener: [
            '...oo...p.',
            '..ovwo.pq.',
            '.ohwo.vp..',
            '.okkkkkdo.',
            '.ohmmmmdo.',
            '.opppppqo.',
            '.owwwwwdo.',
            '.opppppqo.',
            '.ohmmmmdo.',
            '..oddddo..',
        ],
        // Свердло (title 238): a spinning drill bit, shavings curling off
        drillBit: [
            '...ohmo...',
            '...ohmo...',
            '...ohmo...',
            '...ohpo...',
            '...opho...',
            '...ohpo...',
            '...opho...',
            '...ohpo...',
            '.y..oo..y.',
            '..y.....y.',
        ],
        // Тефлоновий (title 239): a frying pan, a water drop sliding off it
        teflonPan: [
            '..........',
            '..........',
            '..........',
            '..........',
            '..oooo....',
            '.ohhhhho..',
            'ohkkkkkdhm',
            'ohkkkkkdo.',
            '.oddddo.p.',
            '..........',
        ],
        // Імунітет до токсичності (title 240): a gas mask, green toxic puffs drifting past
        gasMask: [
            '...oooo...',
            '..ohhmmo..',
            '.ohmmmmdo.',
            '.ovpmmvpo.',
            '.opqmmpqo.',
            '.ohmmmmdo.',
            '..odmmdo..',
            '...wkkw...',
            '...wwww...',
            '...oooo...',
        ],
        // Невловимий (title 241): a red sneaker dashing off, its afterimage left behind
        sneakerDash: [
            '..........',
            '..........',
            '..........',
            'qp.ohho...',
            'pp.ohmmho.',
            'ppoohmmmmo',
            'ppovvvvvvo',
            '.q.oooooo.',
            '..........',
            '..........',
        ],
        // Міраж (title 242): a palm on a sand island, wavering and fading in the heat haze
        mirage: [
            '..........',
            '...pppp...',
            '.pppqqppp.',
            '.p..dd..p.',
            '....d.....',
            '....dd....',
            '.....d....',
            '.....d....',
            '..hhhmmm..',
            'hhmmmmmmdd',
        ],
        // Генератор рандому (title 243): a silver ball bouncing between three bumpers
        pinball: [
            '..........',
            '.pp....yy.',
            'pvpp..yvyy',
            'pppq..yyyo',
            '.qq....oo.',
            '.....v....',
            '....mm....',
            '...mwmm...',
            '...mmmd...',
            '....dd....',
        ],
        // Баг на ніжках (title 244): a beetle scuttling along, sparks popping off its back
        bugLegs: [
            '..k....k..',
            '...k..k...',
            '...oddo.y.',
            'k.ohhmdo.k',
            '.kohwmdok.',
            '..ohmmdo..',
            '.kohmmdok.',
            'k.ohmddo.k',
            '...oddo...',
            '..k....k..',
        ],
        // ----- Emblems: the drakes’ heads, each from its sprite, facing left like the sprites, on its colour tile (10×10) -----
        // Red: the cream horn upright from the skull, its tip curving back; the crest behind it, its flame tips orange
        emRed: [
            '.mmmmmmmm.',
            'msssssppsm',
            'mssssspssm',
            'mssshhpcsm',
            'mshhhkhcqm',
            'mwhhhhhnsm',
            'msnnnnnncm',
            'mssssnnnqm',
            'mssssnnnsm',
            '.mmmmmmmm.',
        ],
        // Blue: the teal fin crest, a fan over the back of the head
        emBlue: [
            '.mmmmmmmm.',
            'msssssqssm',
            'msssspqqsm',
            'mssshpqqqm',
            'mshhhkpqqm',
            'mwhhhhhpqm',
            'msnnnnnnpm',
            'mssssnnnsm',
            'mssssnnnsm',
            '.mmmmmmmm.',
        ],
        // Black: the near-black head with a violet rim, the pale-violet horns flat and short, straight back
        emBlack: [
            '.mmmmmmmm.',
            'mssggggssm',
            'msghhhpppm',
            'mghhkhhgsm',
            'mhhhhhhgsm',
            'msnnnnnngm',
            'mssgnnngsm',
            'msssgnnngm',
            'msssgnnngm',
            '.mmmmmmmm.',
        ],
        // Gold: the cream ram's horn curling round behind the eye
        emGold: [
            '.mmmmmmmm.',
            'msssspppsm',
            'mssspssspm',
            'mssshhpspm',
            'mshhhkhpqm',
            'mwhhhhhnsm',
            'msnnnnnnnm',
            'mssssnnnsm',
            'mssssnnnsm',
            '.mmmmmmmm.',
        ],
        // Purple: the long horns swept back to the corner, longer than Black's
        emPurple: [
            '.mmmmmmmm.',
            'mssssssppm',
            'mssssppssm',
            'mssshhhppm',
            'mshhhkhqsm',
            'mwhhhhhnsm',
            'msnnnnnnnm',
            'mssssnnnsm',
            'mssssnnnsm',
            '.mmmmmmmm.',
        ],
        // Green: the leaf blades fanning back from the head, gaps between them
        emGreen: [
            '.mmmmmmmm.',
            'mssssspppm',
            'msssspsssm',
            'mssshhqppm',
            'mshhhkhssm',
            'mwhhhhhqpm',
            'msnnnnnnsm',
            'mssssnnqpm',
            'mssssnnnsm',
            '.mmmmmmmm.',
        ],
        // The White Dragon: the longer, lower snout, the green crown horns standing up
        emDragon: [
            '.mmmmmmmm.',
            'mssssssssm',
            'msspspspsm',
            'msshphphpm',
            'mhhhhhkhnm',
            'mwhhhhhnnm',
            'mssnnnnnnm',
            'msssssnnnm',
            'msssssnnnm',
            '.mmmmmmmm.',
        ],
        // The White Drake: the six drakes' head in white steel, the green eye, three green mane spikes swept back from the back of
        // the head and down the neck, each growing from it; a dark steel fill (never the Dragon's navy), so the jaw and neck show
        emSteel: [
            '.mmmmmmmm.',
            'mssssssspm',
            'mssssssppm',
            'mssshhhpsm',
            'mshhhphdpm',
            'mwhhhhhppm',
            'msddddddsm',
            'mssssdddpm',
            'mssssddppm',
            '.mmmmmmmm.',
        ],
    };

    // ----- Element colours: one family per element -----
    // Red, blue, purple and green are the card frames' light edges (.el-*), gold is ELEMENT_COLORS.gold (the card's #ae8513
    // is too dark on the dark UI), black is the card swatch's slate #4a4a60 lightened 45% towards white (the swatch itself
    // doesn't read on the dark UI; this stays a neutral grey, never a purple)
    const ELEMENT_COLORS = {
        red: '#ff4f5a', blue: '#4a98ff', black: '#9b9ba8', gold: '#f2c14e', purple: '#b47aff', green: '#6fe896',
        orange: '#ff8a1f', cherry: '#b8304f', pink: '#f78fbf', turquoise: '#26c2b0',
        steel: '#cdd6e4',   // the White Drake: its scale bar's white steel; never Black's grey (bluer, much lighter, green accents)
    };
    // The White Drake's own letters: the sprite's navy outline and slate shade (not a neutral grey), pure white, the crack's red
    const STEEL = { accent: '#58e888', pal: { o: '#151b30', d: '#6a78a2', s: '#3a466e', h: '#e8eef6', w: '#ffffff', r: '#ff8a8a' } };

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
        roulette:    { kind: 'ui', size: 11, color: '#f2c14e', name: { uk: 'Рулетка титулів', en: 'Title roulette' }, emoji: '🎰',
                       pal: { a: '#a0a0a0', b: '#2ecc71', c: '#3498db', e: '#b36bff', f: '#f1c40f', g: '#ff4757', n: '#ff66cc', r: '#9fe3ff' } },   // the rarities' colours
        // ----- The White Drake (white steel, the green accent) -----
        scales:      { kind: 'note',     element: 'steel', name: { uk: 'Луска Дракона', en: 'Dragon Scales' },      emoji: '🤍', ...STEEL },
        bounce:      { kind: 'note',     element: 'steel', name: { uk: 'Відскочило від луски', en: 'Bounced off the scales' }, emoji: '🤍', ...STEEL },
        cracked:     { kind: 'note',     element: 'steel', name: { uk: 'Луска розкололася', en: 'The scales cracked' }, emoji: '💔', ...STEEL },
        reforge:     { kind: 'buff',     element: 'steel', name: { uk: 'Перекування', en: 'Reforging' },            emoji: '⚒️', was: '#dfeaf0', ...STEEL },
        magnet:      { kind: 'debuff',   element: 'steel', name: { uk: 'Магніт', en: 'Magnet' },                    emoji: '🔗', was: '#9fe0c4', ...STEEL },
        anvil:       { kind: 'ultimate', element: 'steel', name: { uk: 'Удар ковадла', en: 'Anvil Strike' },         emoji: '🔨', was: '#e4eef2', ...STEEL },
        whiteSteel:  { kind: 'note',     element: 'steel', name: { uk: 'Біла сталь', en: 'White Steel' },           emoji: '👑', title: 998, ...STEEL },
        // ----- The titles' own icons (bare, 10×10). title: the title (TITLES_DB id) this icon belongs to, its badge everywhere
        // and the icon on the notes its ability fires, with the ability's words; the title's names are the icon's -----
        modShield:     { kind: 'note', color: '#3fae6a', accent: '#8a5a2a', name: { uk: "Незламний модератор", en: "Unbreakable Moderator" }, emoji: '🛡️', title: 176 },
        bigBrain:      { kind: 'note', color: '#9b6bff', accent: '#ffd23f', name: { uk: "Надмозок всесвіту", en: "Universal Superbrain" }, emoji: '🧠', title: 97 },
        zenLotus:      { kind: 'note', color: '#ff7ab0', accent: '#ff4757', name: { uk: "Дзен при 1 HP", en: "Zen at 1 HP" }, emoji: '🧘', title: 178 },
        lagGhost:      { kind: 'note', color: '#b6aee6', accent: '#3ddc84', name: { uk: "Привид лагу", en: "Lag Ghost" }, emoji: '👻', title: 179 },
        chaosFirework: { kind: 'note', color: '#ff9a2e', accent: '#b47aff', name: { uk: "Феєрверк хаосу", en: "Chaos Fireworks" }, emoji: '🎆', title: 180 },
        firstCoffee:   { kind: 'note', color: '#e6dcc8', accent: '#6a3a1a', name: { uk: "Перша кава дня", en: "First Coffee of the Day" }, emoji: '☕', title: 182 },
        grumpyHedgehog:{ kind: 'note', color: '#8a5a30', accent: '#cc2a34', name: { uk: "Їжак-ображака", en: "Grumpy Hedgehog" }, emoji: '🦔', title: 184 },
        energyVampire: { kind: 'note', color: '#a8b0c0', accent: '#46d160', name: { uk: "Енергетичний вампір", en: "Energy Vampire" }, emoji: '🧛', title: 185 },
        lowHpSkull:    { kind: 'note', color: '#e8e4d6', accent: '#ff4757', name: { uk: "Кат лоу-хп", en: "Low-HP Executioner" }, emoji: '🪓', title: 188 },
        schrodPotato:  { kind: 'note', color: '#b8884a', accent: '#e0b070', name: { uk: "Картопля Шредінгера", en: "Schrödinger's Potato" }, emoji: '🥔', title: 190 },
        berserkSloth:  { kind: 'note', color: '#a07a56', accent: '#ff4757', name: { uk: "Лінивець-берсерк", en: "Berserk Sloth" }, emoji: '🦥', title: 192 },
        spaghettiCode: { kind: 'note', color: '#3a4a6a', accent: '#ebb63c', name: { uk: "Код-спагеті", en: "Spaghetti Code" }, emoji: '🍝', title: 194 },
        // The Legendary titles 205–244, one each
        matchThree:    { kind: 'note', color: '#e43c98', name: { uk: "Три в ряд", en: "Three in a Row" }, emoji: '🥁', title: 205 },
        metronome:     { kind: 'note', color: '#8a5a36', accent: '#f6ead0', name: { uk: "Ритм-машина", en: "Rhythm Machine" }, emoji: '🥁', title: 206 },
        thirdHit:      { kind: 'note', color: '#f6ead0', accent: '#d8283a', name: { uk: "Третій удар — мій", en: "The Third Hit Is Mine" }, emoji: '🥁', title: 207 },
        quickFinger:   { kind: 'note', color: '#e2a476', accent: '#d8283a', name: { uk: "Швидкий палець", en: "Quick Finger" }, emoji: '🐦', title: 208 },
        trafficLight:  { kind: 'note', color: '#4a5266', accent: '#3ddc84', name: { uk: "Перший у черзі", en: "First in Line" }, emoji: '🐦', title: 209 },
        earlyBird:     { kind: 'note', color: '#734325', accent: '#ee6a34', name: { uk: "Рання пташка", en: "Early Bird" }, emoji: '🐦', title: 210 },
        ironPlate:     { kind: 'note', color: '#56637e', name: { uk: "Залізна шкура", en: "Iron Hide" }, emoji: '🧱', title: 211 },
        cinderBlock:   { kind: 'note', color: '#8e9196', name: { uk: "Бетонний дрейк", en: "Concrete Drake" }, emoji: '🧱', title: 212 },
        chatTank:      { kind: 'note', color: '#8a4cf0', accent: '#393b4a', name: { uk: "Танк чату", en: "Chat Tank" }, emoji: '🧱', title: 213 },
        bastion:       { kind: 'note', color: '#a8a4b0', accent: '#d8283a', name: { uk: "Останній бастіон", en: "Last Bastion" }, emoji: '🏰', title: 214 },
        candleStub:    { kind: 'note', color: '#f6ead0', accent: '#ff9a2e', name: { uk: "Ще не кінець", en: "It's Not Over Yet" }, emoji: '🏰', title: 215 },
        uppercut:      { kind: 'note', color: '#d8283a', accent: '#f6ead0', name: { uk: "Камбек року", en: "Comeback of the Year" }, emoji: '🏰', title: 216 },
        racket:        { kind: 'note', color: '#c8303e', accent: '#c8d0e0', name: { uk: "Відповідь не забариться", en: "Reply Incoming" }, emoji: '🤺', title: 217 },
        blindfold:     { kind: 'note', color: '#e2a476', accent: '#2c3150', name: { uk: "Відбиваю, не дивлячись", en: "Parry Without Looking" }, emoji: '🤺', title: 218 },
        fencingFoil:   { kind: 'note', color: '#a8b4cc', name: { uk: "Фехтувальник", en: "The Fencer" }, emoji: '🤺', title: 219 },
        buffEater:     { kind: 'note', color: '#c03458', name: { uk: "Пожирач бафів", en: "Buff Eater" }, emoji: '😋', title: 220 },
        bonusSack:     { kind: 'note', color: '#b88a52', accent: '#5a3a22', name: { uk: "Збирач чужих бонусів", en: "Bonus Collector" }, emoji: '😋', title: 221 },
        taxPurse:      { kind: 'note', color: '#8a4e2a', accent: '#d8283a', name: { uk: "Податківець", en: "Tax Collector" }, emoji: '😋', title: 222 },
        chargeCrystal: { kind: 'note', color: '#f0a830', accent: '#675b54', name: { uk: "Заряджений на повну", en: "Fully Charged" }, emoji: '🏹', title: 223 },
        turbine:       { kind: 'note', color: '#cdd6e4', accent: '#2c3242', name: { uk: "Турборежим", en: "Turbo Mode" }, emoji: '🏹', title: 224 },
        drawnBow:      { kind: 'note', color: '#a86a34', accent: '#d8283a', name: { uk: "Завжди напоготові", en: "Always Ready" }, emoji: '🏹', title: 225 },
        snowball:      { kind: 'note', color: '#a8bcd6', name: { uk: "Снігова куля", en: "Snowball" }, emoji: '⛄', title: 226 },
        speedometer:   { kind: 'note', color: '#a6a8aa', accent: '#ff7a1a', name: { uk: "Розгін до сотні", en: "Zero to a Hundred" }, emoji: '⛄', title: 227 },
        boulder:       { kind: 'note', color: '#8a7a6a', name: { uk: "Невпинний", en: "Unstoppable" }, emoji: '⛄', title: 228 },
        cleanSignal:   { kind: 'note', color: '#8a90a0', accent: '#7dffc4', name: { uk: "Чистий сигнал", en: "Clean Signal" }, emoji: '🧪', title: 229 },
        antidote:      { kind: 'note', color: '#30d6b8', accent: '#c89a5a', name: { uk: "Антидот", en: "Antidote" }, emoji: '🧪', title: 230 },
        soapBar:       { kind: 'note', color: '#f07aa8', name: { uk: "Вічно свіжий", en: "Ever Fresh" }, emoji: '🧪', title: 231 },
        vinylRecord:   { kind: 'note', color: '#3a3a48', accent: '#d8283a', name: { uk: "Довгограйний", en: "Long-Playing" }, emoji: '💿', title: 232 },
        gears:         { kind: 'note', color: '#c8963a', accent: '#97a3c0', name: { uk: "Вічний двигун", en: "Perpetual Motion" }, emoji: '💿', title: 233 },
        starStack:     { kind: 'note', color: '#d0a024', name: { uk: "Бонус на бонус", en: "Bonus on Bonus" }, emoji: '💿', title: 234 },
        windsock:      { kind: 'note', color: '#f07a30', accent: '#f6ead0', name: { uk: "Друге дихання", en: "Second Wind" }, emoji: '🩹', title: 235 },
        pocketKit:     { kind: 'note', color: '#d8283a', accent: '#3a62a8', name: { uk: "Аптечка в кишені", en: "Pocket First Aid" }, emoji: '🩹', title: 236 },
        canOpener:     { kind: 'note', color: '#c2c6ce', accent: '#e46770', name: { uk: "Відкривачка", en: "Can Opener" }, emoji: '🔩', title: 237 },
        drillBit:      { kind: 'note', color: '#cdd6e4', accent: '#6a78a2', name: { uk: "Свердло", en: "The Drill" }, emoji: '🔩', title: 238 },
        teflonPan:     { kind: 'note', color: '#8a90a0', accent: '#3aa0ff', name: { uk: "Тефлоновий", en: "Teflon" }, emoji: '😷', title: 239 },
        gasMask:       { kind: 'note', color: '#5a6050', accent: '#3a8ab0', name: { uk: "Імунітет до токсичності", en: "Immune to Toxicity" }, emoji: '😷', title: 240 },
        sneakerDash:   { kind: 'note', color: '#e03a4a', accent: '#6a3a5a', name: { uk: "Невловимий", en: "Elusive" }, emoji: '🌫️', title: 241 },
        mirage:        { kind: 'note', color: '#e0b46a', accent: '#58a860', name: { uk: "Міраж", en: "Mirage" }, emoji: '🌫️', title: 242 },
        pinball:       { kind: 'note', color: '#2d71c1', accent: '#bd3546', name: { uk: "Генератор рандому", en: "Random Generator" }, emoji: '🎱', title: 243 },
        bugLegs:       { kind: 'note', color: '#3a4ab8', name: { uk: "Баг на ніжках", en: "Bug on Legs" }, emoji: '🎱', title: 244 },
        // ----- Emblems: the drakes' heads (in names, the queue, the intro banner, info cards, the plate; m the tile, s its fill,
        // h / n the head, k the eye, p / q the drake's own mark) -----
        emRed:       { kind: 'emblem', element: 'red', name: { uk: 'Червоний Дрейк', en: 'Red Drake' }, emoji: '🟥', pal: { p: '#f3e2bd', q: '#ffb030', s: '#2a0a0d', h: '#ff7a82', n: '#c92f3a', k: '#ffd23f', w: '#ffd0d3', c: '#8f1c32' } },
        emBlue:      { kind: 'emblem', element: 'blue', name: { uk: 'Синій Дрейк', en: 'Blue Drake' }, emoji: '🟦', pal: { p: '#8ff0ff', q: '#2fb6d8', s: '#081a33', h: '#7fb8ff', n: '#2c6fd0', k: '#ffd23f', w: '#d6ecff' } },
        emBlack:     { kind: 'emblem', element: 'black', name: { uk: 'Чорний Дрейк', en: 'Black Drake' }, emoji: '⬛', pal: { p: '#cbbcff', s: '#55566a', h: '#2a2346', n: '#0e0c16', k: '#ff7ad9', w: '#6a5aa8', g: '#7a52d6' } },
        emGold:      { kind: 'emblem', element: 'gold', name: { uk: 'Золотий Дрейк', en: 'Gold Drake' }, emoji: '🟨', pal: { p: '#f6ead0', q: '#c9b48a', s: '#2d2006', h: '#ffd970', n: '#c08a1a', k: '#b36bff', w: '#fff4c8' } },
        emPurple:    { kind: 'emblem', element: 'purple', name: { uk: 'Фіолетовий Дрейк', en: 'Purple Drake' }, emoji: '🟪', pal: { p: '#eadcff', q: '#a98be0', s: '#1d0c33', h: '#c79bff', n: '#7d45c9', k: '#5ee0f0', w: '#efe2ff' } },
        emGreen:     { kind: 'emblem', element: 'green', name: { uk: 'Зелений Дрейк', en: 'Green Drake' }, emoji: '🟩', pal: { p: '#c4ff8f', q: '#2f9a3e', s: '#0a2412', h: '#8ff0a8', n: '#2f9c55', k: '#ffd23f', w: '#dcffe4' } },
        emDragon:    { kind: 'emblem', color: '#bfe9ff', name: { uk: 'Білий Дракон', en: 'White Dragon' }, emoji: '🐉', pal: { p: '#58e888', s: '#16264a', h: '#f2f8ff', n: '#8fb2dc', k: '#1a2044', w: '#ffffff' } },
        emSteel:     { kind: 'emblem',   element: 'steel', name: { uk: 'Білий Дрейк', en: 'White Drake' },          emoji: '🤍', ...STEEL, pal: { ...STEEL.pal, s: '#1a1e28' } },
    };
    Object.values(ICONS).forEach(ic => { if (ic.element) ic.color = ELEMENT_COLORS[ic.element]; });
    const EFFECT_ICON_IDS = ['rage', 'burn', 'shield', 'frost', 'shadow', 'weakness', 'blessing', 'mark', 'divine', 'dispel', 'regen', 'poison'];
    const ULTIMATE_ICON_IDS = ['firestorm', 'mirror', 'theft', 'jackpot', 'detonation', 'bloom'];
    const NOTE_ICON_IDS = Object.keys(ICONS).filter(id => ICONS[id].kind === 'note' && ICONS[id].element !== 'steel' && !ICONS[id].title);
    const TITLE_ICON_IDS = Object.keys(ICONS).filter(id => ICONS[id].title && ICONS[id].element !== 'steel');   // «Біла сталь»'s is with the White Drake's kit
    const ATTACK_ICON_IDS = Object.keys(ICONS).filter(id => ICONS[id].kind === 'attack');
    const BATCH4_ICON_IDS = ['attacking', 'roulette'];
    const STEEL_ICON_IDS = ['scales', 'bounce', 'cracked', 'reforge', 'magnet', 'anvil', 'whiteSteel', 'emSteel'];
    // The emblems: the drakes' heads, every drake's in the game's order, then the streamer's two forms
    const EMBLEM_IDS = ['emRed', 'emBlue', 'emBlack', 'emGold', 'emPurple', 'emGreen', 'emDragon', 'emSteel'];
    const BATCH3_ICON_IDS = Object.keys(ICONS).filter(id => ['reel', 'bonus', 'medal', 'ui'].includes(ICONS[id].kind) && !BATCH4_ICON_IDS.includes(id) && ICONS[id].element !== 'steel');

    // ----- Stand-ins: Season 2's icons until their art is drawn -----
    // The one list: each new icon id and the icon of today's set drawn in its place. The game asks for the new id everywhere
    // (an id here has no record in ICONS, no glyph and no V2 art of its own) and pxIcon draws the stand-in, so when the art
    // lands the id gets its record, glyph, V2 still and loop, its line goes from this list, and nothing else changes. A stand-in
    // is shared with the icon it borrows, so on a log card its compact form keeps its words. inventory.md lists them.
    const STAND_INS = {
        emOrange: 'emGold', emCherry: 'emRed', emPink: 'emPurple', emTurquoise: 'emBlue',
        heat: 'burn', stoke: 'divine', melt: 'mark', eruption: 'firestorm',
        frenzy: 'rage', bloodprice: 'vampire', bleed: 'poison', lastbreath: 'crit',
        illusion: 'theft', borrowed: 'theft', fairydust: 'blessing', infatuation: 'weakness',
        nacre: 'shield', clearwater: 'regen', seaweed: 'frost', hightide: 'bloom',
    };

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

    // ----- Title badges: the title's 10×10 glyph (its own icon, its mechanic's or its bonus's) in a 12×12 rarity frame -----
    // The frame is 1 pixel, so the glyph inside is the very same one as the note its ability fires: for each fighter, badge and
    // note match. Rarity shows
    // in the frame's pattern as well as its colour (colour-blind viewers), richer up the ladder: common plain with cut corners,
    // uncommon light corner studs, rare light studs mid-side, epic notched corners lit top-left, legendary a solid edge lit
    // top-left, mythic (the richest) a solid red edge with gold corners and a white gem on top; meme a dotted edge in pink and
    // yellow (confetti); divine white star points at the corners.
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
    // The badge's data URL, made once per glyph and rarity
    const titleURLs = {};
    const titleURL = (id, rarity) => titleURLs[id + '|' + rarity] || (titleURLs[id + '|' + rarity] = makeTitleCanvas(id, rarity).toDataURL());
    function titleImg(id, rarity, scale = 2, cls = 'px-icon') {
        const s = Math.max(1, Math.round(scale));
        return `<img class="${cls}" src="${titleURL(id, rarity)}" width="${12 * s}" height="${12 * s}" alt="${ICONS[id].name.en}" style="image-rendering: pixelated">`;
    }

    // ----- Rows: the glyph itself (no frame), checked against its category's size -----
    function iconRows(id) {
        const rows = GLYPHS[id], size = ICONS[id].size || SIZES[ICONS[id].kind];
        if (rows.length !== size || rows.some(r => r.length !== size)) throw new Error(`${id}: not ${size}×${size}`);
        return rows;
    }

    // Drawn once per icon at 1×; larger sizes are the same canvas drawn with image smoothing off, or CSS pixelated.
    // `pal` adds an icon's own letters (the roulette's rarity colours, the White Drake's steel).
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
    // The icon's data URL, made once (every <img> of an icon shares it)
    const iconURLs = {};
    const iconURL = id => iconURLs[id] || (iconURLs[id] = makeIconCanvas(id).toDataURL());
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

    root.DrakeIcons = { CHIP, CHIP_SHAPES, chipURL, chipStyle, SIZES, GLYPHS, ICONS, STAND_INS, ELEMENT_COLORS, EFFECT_ICON_IDS, ULTIMATE_ICON_IDS, NOTE_ICON_IDS, TITLE_ICON_IDS, ATTACK_ICON_IDS, BATCH3_ICON_IDS, BATCH4_ICON_IDS, STEEL_ICON_IDS, EMBLEM_IDS, RARITY_COLORS, TITLE_FRAMES, makeTitleCanvas, titleURL, titleImg, paletteOf, iconRows, makeIconCanvas, iconURL, iconImg };
})(typeof window !== 'undefined' ? window : globalThis);
