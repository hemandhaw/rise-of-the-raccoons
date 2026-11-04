/**
 * Rise of the Raccoons! - Level Configuration & Future Roster
 * 
 * Levels:
 * 1. St. Paul, Minnesota Skyscraper (Playable - Where it all began!)
 * 2-44. Coming Soon Future Levels with procedural previews & thematic art
 */

export interface LevelConfig {
  id: string;
  name: string;
  subtitle: string;
  location: string;
  description: string;
  status: 'playable' | 'coming_soon';
  badge: string;
  themeColor: string;
  accentColor: string;
  gradient: string;
  totalFloors?: number;
  heightLabel?: string;
  iconType: string;
}

export const LEVELS_ROSTER: LevelConfig[] = [
  // 1. Playable Launch Level
  {
    id: 'st_paul',
    name: 'St. Paul Skyscraper',
    subtitle: '(where it all began...)',
    location: 'St. Paul, Minnesota, USA',
    description: 'The legendary 25-floor UBS skyscraper in downtown St. Paul where a wild raccoon scaled sheer concrete and captured the hearts of millions.',
    status: 'playable',
    badge: '🏢',
    themeColor: '#ea580c',
    accentColor: '#facc15',
    gradient: 'from-amber-600 via-orange-700 to-slate-900',
    totalFloors: 25,
    heightLabel: '25 Floors · 300 ft',
    iconType: 'skyscraper',
  },

  // 2. Eiffel Tower
  {
    id: 'eiffel_tower',
    name: 'Eiffel Tower',
    subtitle: 'Iron lattice ascent over Paris',
    location: 'Paris, France',
    description: 'Scale the 1,083-foot wrought-iron marvel across three viewing decks while avoiding tourist binoculars and evening strobe lights.',
    status: 'coming_soon',
    badge: '🗼',
    themeColor: '#f59e0b',
    accentColor: '#fbbf24',
    gradient: 'from-amber-700 via-yellow-800 to-slate-900',
    heightLabel: '1,083 ft · Iron Lattice',
    iconType: 'eiffel',
  },

  // 3. Big Ben
  {
    id: 'big_ben',
    name: 'Big Ben',
    subtitle: 'The Great Clock of Westminster',
    location: 'London, England',
    description: 'Climb the historic Elizabeth Tower, dodging gargoyles, rain drizzles, and massive clock hands chiming every quarter hour.',
    status: 'coming_soon',
    badge: '🕰️',
    themeColor: '#0284c7',
    accentColor: '#38bdf8',
    gradient: 'from-sky-700 via-blue-900 to-slate-950',
    heightLabel: '316 ft · Clock Tower',
    iconType: 'clock',
  },

  // 4. Landfill
  {
    id: 'landfill',
    name: 'Landfill',
    subtitle: 'The ultimate trash treasure mound',
    location: 'Metropolitan Dump',
    description: 'A paradise for hungry raccoons! Scale mountains of compacted recyclables, teetering pizza boxes, and discarded sofas.',
    status: 'coming_soon',
    badge: '🗑️',
    themeColor: '#16a34a',
    accentColor: '#4ade80',
    gradient: 'from-emerald-700 via-green-900 to-slate-950',
    heightLabel: 'Infinite Trash Heaps',
    iconType: 'trash',
  },

  // 5. Statue of Liberty
  {
    id: 'statue_of_liberty',
    name: 'Statue of Liberty',
    subtitle: 'Torchbearer of freedom',
    location: 'New York Harbor, USA',
    description: 'Climb the verdigris copper folds of Lady Liberty from pedestal to crown and right up to the golden flame!',
    status: 'coming_soon',
    badge: '🗽',
    themeColor: '#10b981',
    accentColor: '#34d399',
    gradient: 'from-emerald-600 via-teal-800 to-slate-950',
    heightLabel: '305 ft · Copper Monument',
    iconType: 'monument',
  },

  // 6. Pyramids of Giza
  {
    id: 'pyramids_giza',
    name: 'Pyramids of Giza',
    subtitle: 'Ancient wonder of limestone blocks',
    location: 'Giza Plateau, Egypt',
    description: 'Scramble up giant tiered limestone blocks under scorching desert sun to reach the mystical pyramidion summit.',
    status: 'coming_soon',
    badge: '📐',
    themeColor: '#d97706',
    accentColor: '#fcd34d',
    gradient: 'from-amber-600 via-yellow-700 to-amber-950',
    heightLabel: '455 ft · Ancient Wonder',
    iconType: 'pyramid',
  },

  // 7. El Capitan
  {
    id: 'el_capitan',
    name: 'El Capitan',
    subtitle: 'Sheer granite monolith',
    location: 'Yosemite National Park, California',
    description: 'Test your raccoon claws against 3,000 feet of vertical granite, tiny micro-crimps, and gusting alpine winds.',
    status: 'coming_soon',
    badge: '🧗',
    themeColor: '#64748b',
    accentColor: '#94a3b8',
    gradient: 'from-slate-600 via-stone-800 to-slate-950',
    heightLabel: '3,000 ft · Sheer Granite',
    iconType: 'mountain',
  },

  // 8. Hollywood Sign ("RACCOON")
  {
    id: 'hollywood_sign',
    name: 'Hollywood Sign ("RACCOON")',
    subtitle: 'Hollywood sign replaced with RACCOON!',
    location: 'Mount Lee, Los Angeles, California',
    description: 'Scale the 45-foot white letters of the world-famous landmark, magically spelled out as R-A-C-C-O-O-N against the Hollywood hills!',
    status: 'coming_soon',
    badge: '🎬',
    themeColor: '#e11d48',
    accentColor: '#fb7185',
    gradient: 'from-rose-600 via-pink-800 to-slate-950',
    heightLabel: '45 ft Letters · Mount Lee',
    iconType: 'hollywood',
  },

  // 9. Leaning Tower of Pisa
  {
    id: 'leaning_tower_pisa',
    name: 'Leaning Tower of Pisa',
    subtitle: 'The inclined marble bell tower',
    location: 'Pisa, Italy',
    description: 'Climb eight tiers of marble arcades at a dizzying 4-degree tilt! Balance claws against gravity on the leaning side.',
    status: 'coming_soon',
    badge: '🏛️',
    themeColor: '#f59e0b',
    accentColor: '#fde047',
    gradient: 'from-amber-600 via-stone-800 to-slate-950',
    heightLabel: '186 ft · Leaning Marble',
    iconType: 'leaning_tower',
  },

  // 10. Blue Whale
  {
    id: 'blue_whale',
    name: 'Blue Whale',
    subtitle: 'Ocean titan breaching the waves',
    location: 'Deep Pacific Ocean',
    description: 'Climb the gentle giant of the ocean from tail fluke up to the blowhole as water sprays and krill drifts by!',
    status: 'coming_soon',
    badge: '🐋',
    themeColor: '#0284c7',
    accentColor: '#38bdf8',
    gradient: 'from-sky-600 via-blue-900 to-slate-950',
    heightLabel: '100 ft · Living Titan',
    iconType: 'whale',
  },

  // 11. International Space Station
  {
    id: 'iss',
    name: 'International Space Station',
    subtitle: 'Zero-g solar panel climbing',
    location: 'Low Earth Orbit (250 mi up)',
    description: 'Climb pressurized laboratory modules and massive golden solar arrays while orbiting the glowing Earth every 90 minutes.',
    status: 'coming_soon',
    badge: '🛰️',
    themeColor: '#6366f1',
    accentColor: '#a5b4fc',
    gradient: 'from-indigo-600 via-purple-900 to-slate-950',
    heightLabel: '250 Miles High · Space Orbit',
    iconType: 'space',
  },

  // 12. Mona Lisa
  {
    id: 'mona_lisa',
    name: 'Mona Lisa',
    subtitle: 'Traversing the priceless masterpiece',
    location: 'The Louvre, Paris',
    description: 'Climb the gilded antique museum frame, the enigmatic smile, and delicate cracked oil glaze without tripping the infrared lasers!',
    status: 'coming_soon',
    badge: '🖼️',
    themeColor: '#854d0e',
    accentColor: '#facc15',
    gradient: 'from-yellow-800 via-amber-950 to-slate-950',
    heightLabel: '30 in · Masterpiece Canvas',
    iconType: 'art',
  },

  // 13. Bran Castle
  {
    id: 'bran_castle',
    name: 'Bran Castle',
    subtitle: 'Dracula’s gothic fortress',
    location: 'Transylvania, Romania',
    description: 'Scale cobblestone turrets, dark battlements, and timber balconies beneath the spooky moonlight as bats swarm overhead.',
    status: 'coming_soon',
    badge: '🏰',
    themeColor: '#9333ea',
    accentColor: '#c084fc',
    gradient: 'from-purple-800 via-slate-900 to-black',
    heightLabel: 'Gothic Turrets · Carpathian Peak',
    iconType: 'castle',
  },

  // 14. Parthenon
  {
    id: 'parthenon',
    name: 'Parthenon',
    subtitle: 'Ancient temple of Athena',
    location: 'Acropolis, Athens, Greece',
    description: 'Scale fluted Doric columns and marble friezes overlooking the Mediterranean sea under bright Grecian sunshine.',
    status: 'coming_soon',
    badge: '🏛️',
    themeColor: '#f97316',
    accentColor: '#fdba74',
    gradient: 'from-orange-600 via-amber-800 to-slate-950',
    heightLabel: 'Doric Colonnades · Acropolis',
    iconType: 'temple',
  },

  // 15. Titanic
  {
    id: 'titanic',
    name: 'Titanic',
    subtitle: 'The unsinkable liner at sea',
    location: 'North Atlantic Ocean',
    description: 'Climb the black steel hull, white deck railings, and iconic yellow smokestacks as icy ocean breezes blow past.',
    status: 'coming_soon',
    badge: '🚢',
    themeColor: '#0f766e',
    accentColor: '#2dd4bf',
    gradient: 'from-teal-700 via-cyan-950 to-slate-950',
    heightLabel: '175 ft Above Waterline',
    iconType: 'ship',
  },

  // 16. Kinkaku-ji Golden Pavilion
  {
    id: 'kinkaku_ji',
    name: 'Kinkaku-ji Golden Pavilion',
    subtitle: 'Gilded Zen temple over mirror pond',
    location: 'Kyoto, Japan',
    description: 'Climb gold leaf covered tiers, curved shingle roofs, and the crowning bronze phoenix surrounded by tranquil Japanese pine trees.',
    status: 'coming_soon',
    badge: '⛩️',
    themeColor: '#eab308',
    accentColor: '#fef08a',
    gradient: 'from-yellow-600 via-amber-800 to-slate-950',
    heightLabel: '41 ft · 3 Gilded Tiers',
    iconType: 'pagoda',
  },

  // 17. Micro World
  {
    id: 'micro_world',
    name: 'Micro World',
    subtitle: 'DNA Helix, The Atom, Cell & Neuron',
    location: 'Sub-Microscopic Cosmos',
    description: 'Climb twisting DNA double helices, electron orbital rings, mitochondria membranes, and synaptic nerve branches!',
    status: 'coming_soon',
    badge: '🔬',
    themeColor: '#06b6d4',
    accentColor: '#67e8f9',
    gradient: 'from-cyan-600 via-blue-900 to-slate-950',
    heightLabel: 'Nanometer Scale · Pure Science',
    iconType: 'atom',
  },

  // 18. Venice
  {
    id: 'venice',
    name: 'Venice',
    subtitle: 'St. Mark’s Campanile & Grand Canal',
    location: 'Venice, Italy',
    description: 'Climb ornate brick bell towers and Venetian palazzo balconies as gondolas drift along emerald canals below.',
    status: 'coming_soon',
    badge: '🛶',
    themeColor: '#0ea5e9',
    accentColor: '#7dd3fc',
    gradient: 'from-sky-600 via-blue-800 to-slate-950',
    heightLabel: '323 ft · Venetian Campanile',
    iconType: 'canal',
  },

  // 19. Times Square
  {
    id: 'times_square',
    name: 'Times Square',
    subtitle: 'Neon billboard canyon',
    location: 'New York City, USA',
    description: 'Scale blazing digital billboards, ticker displays, and marquee lights in the beating heart of Broadway.',
    status: 'coming_soon',
    badge: '🪧',
    themeColor: '#ec4899',
    accentColor: '#f472b6',
    gradient: 'from-pink-600 via-purple-900 to-slate-950',
    heightLabel: 'Dozens of Giant LED Screens',
    iconType: 'billboard',
  },

  // 20. Taj Mahal
  {
    id: 'taj_mahal',
    name: 'Taj Mahal',
    subtitle: 'Ivory-white marble jewel',
    location: 'Agra, India',
    description: 'Climb the towering minarets and central onion dome of translucent white marble with intricate floral gemstone inlays.',
    status: 'coming_soon',
    badge: '🕌',
    themeColor: '#14b8a6',
    accentColor: '#5eead4',
    gradient: 'from-teal-600 via-stone-800 to-slate-950',
    heightLabel: '240 ft Marble Dome',
    iconType: 'dome',
  },

  // 21. Great Barrier Reef
  {
    id: 'great_barrier_reef',
    name: 'Great Barrier Reef',
    subtitle: 'Coral towers beneath tropical seas',
    location: 'Coral Sea, Australia',
    description: 'Scale vibrant brain coral columns, sea fan shelves, and anemones while clownfish and sea turtles swim around you.',
    status: 'coming_soon',
    badge: '🪸',
    themeColor: '#f43f5e',
    accentColor: '#fb7185',
    gradient: 'from-rose-500 via-cyan-800 to-slate-950',
    heightLabel: 'Living Coral Pinnacle',
    iconType: 'coral',
  },

  // 22. Mount Rushmore
  {
    id: 'mount_rushmore',
    name: 'Mount Rushmore',
    subtitle: 'Colossal presidential granite faces',
    location: 'Black Hills, South Dakota',
    description: 'Climb 60-foot noses, chins, and foreheads carved into the granite cliffside as mountain goats look on in wonder.',
    status: 'coming_soon',
    badge: '🗿',
    themeColor: '#78716c',
    accentColor: '#a8a29e',
    gradient: 'from-stone-600 via-zinc-800 to-slate-950',
    heightLabel: '60 ft Granite Portraits',
    iconType: 'sculpture',
  },

  // 23. Giant Spider Web
  {
    id: 'giant_spider_web',
    name: 'Giant Spider Web',
    subtitle: 'Sticky silk suspension climb',
    location: 'Deep Redwood Hollow',
    description: 'Navigate elastic, dewy silk strands high in the canopy—be careful where you step to avoid waking the resident weaver!',
    status: 'coming_soon',
    badge: '🕸️',
    themeColor: '#cbd5e1',
    accentColor: '#f1f5f9',
    gradient: 'from-slate-500 via-zinc-800 to-slate-950',
    heightLabel: '120 ft Silk Canopy',
    iconType: 'web',
  },

  // 24. Mr. Pickle’s Face
  {
    id: 'mr_pickles_face',
    name: 'Mr. Pickle’s Face',
    subtitle: 'A wonderfully wacky giant face',
    location: 'Quirky Land',
    description: 'A hilarious climb across giant green warty pickle bumps, bushy dill eyebrows, and brine waterfalls!',
    status: 'coming_soon',
    badge: '🥒',
    themeColor: '#65a30d',
    accentColor: '#a3e635',
    gradient: 'from-lime-600 via-green-900 to-slate-950',
    heightLabel: 'Gigantic Dill Landmark',
    iconType: 'pickle',
  },

  // 25. Sand Castle
  {
    id: 'sand_castle',
    name: 'Sand Castle',
    subtitle: 'Beach kingdom before high tide',
    location: 'Sunny Ocean Shore',
    description: 'Climb delicate sculpted sand towers, seashell crenellations, and sand bridges before the ocean waves roll in!',
    status: 'coming_soon',
    badge: '🏖️',
    themeColor: '#eab308',
    accentColor: '#fde047',
    gradient: 'from-yellow-600 via-amber-700 to-slate-950',
    heightLabel: '12 ft Sculpted Sand Peak',
    iconType: 'beach',
  },

  // 26. Tokyo Shibuya
  {
    id: 'tokyo_shibuya',
    name: 'Tokyo Shibuya',
    subtitle: 'Scramble crossing high-rises',
    location: 'Tokyo, Japan',
    description: 'Scale bustling neon skyscrapers above the world’s busiest pedestrian intersection as anime billboards flash bright.',
    status: 'coming_soon',
    badge: '🏙️',
    themeColor: '#d946ef',
    accentColor: '#f0abfc',
    gradient: 'from-fuchsia-600 via-purple-900 to-slate-950',
    heightLabel: 'Neon Skyscraper Canyon',
    iconType: 'neon_city',
  },

  // 27. Hong Kong
  {
    id: 'hong_kong',
    name: 'Hong Kong',
    subtitle: 'Victoria Harbour bamboo scaffolding',
    location: 'Hong Kong',
    description: 'Climb traditional bamboo scaffolding lashed together on supertall glass skyscrapers overlooking Victoria Peak.',
    status: 'coming_soon',
    badge: '🌆',
    themeColor: '#ef4444',
    accentColor: '#fca5a5',
    gradient: 'from-red-600 via-orange-900 to-slate-950',
    heightLabel: 'Bamboo Scaffolding & Glass',
    iconType: 'bamboo',
  },

  // 28. Golden Gate Bridge
  {
    id: 'golden_gate_bridge',
    name: 'Golden Gate Bridge',
    subtitle: 'International orange suspension cables',
    location: 'San Francisco, California',
    description: 'Climb the 746-foot art deco bridge towers and thick suspension cables above swirling Pacific fog and sea lions.',
    status: 'coming_soon',
    badge: '🌉',
    themeColor: '#ea580c',
    accentColor: '#fb923c',
    gradient: 'from-orange-700 via-red-900 to-slate-950',
    heightLabel: '746 ft Bridge Towers',
    iconType: 'bridge',
  },

  // 29. Redwood Tree
  {
    id: 'redwood_tree',
    name: 'Redwood Tree',
    subtitle: 'Hyperion ancient giant of the forest',
    location: 'Humboldt County, California',
    description: 'Climb thick fibrous cinnamon bark up 380 feet through lush fern mats, hanging lichens, and cloud mist.',
    status: 'coming_soon',
    badge: '🌲',
    themeColor: '#15803d',
    accentColor: '#86efac',
    gradient: 'from-green-700 via-emerald-950 to-slate-950',
    heightLabel: '380 ft Living Tree',
    iconType: 'tree',
  },

  // 30. Cliffs of Moher
  {
    id: 'cliffs_of_moher',
    name: 'Cliffs of Moher',
    subtitle: 'Rugged Irish sea cliffs',
    location: 'County Clare, Ireland',
    description: 'Scale 700 feet of layered shale and sandstone plunging straight into crashing Atlantic breakers with nesting puffins.',
    status: 'coming_soon',
    badge: '🌊',
    themeColor: '#059669',
    accentColor: '#6ee7b7',
    gradient: 'from-emerald-700 via-teal-900 to-slate-950',
    heightLabel: '702 ft Sea Precipice',
    iconType: 'cliff',
  },

  // 31. Mount Everest
  {
    id: 'mount_everest',
    name: 'Mount Everest',
    subtitle: 'The rooftop of the world',
    location: 'Himalayas, Nepal / Tibet',
    description: 'Scale the Hillary Step, icy seracs, and prayer flags up to 29,032 feet in biting blizzards and thin crisp air.',
    status: 'coming_soon',
    badge: '🏔️',
    themeColor: '#38bdf8',
    accentColor: '#e0f2fe',
    gradient: 'from-sky-500 via-indigo-900 to-slate-950',
    heightLabel: '29,032 ft Earth Summit',
    iconType: 'peak',
  },

  // 32. Grand Canyon
  {
    id: 'grand_canyon',
    name: 'Grand Canyon',
    subtitle: 'Layered red rock gorge',
    location: 'Arizona, USA',
    description: 'Climb 5,000 vertical feet of crimson sandstone, Kaibab limestone, and ancient Vishnu schist under the desert sun.',
    status: 'coming_soon',
    badge: '🏜️',
    themeColor: '#c2410c',
    accentColor: '#fdba74',
    gradient: 'from-orange-800 via-amber-950 to-slate-950',
    heightLabel: '5,000 ft Canyon Wall',
    iconType: 'canyon',
  },

  // 33. The Beanstalk
  {
    id: 'the_beanstalk',
    name: 'The Beanstalk',
    subtitle: 'Fairytale vine leading to the clouds',
    location: 'Above the Farmhouse',
    description: 'Climb winding magic vines, giant green leaves, and pod clusters right into the cloud realm of the golden goose!',
    status: 'coming_soon',
    badge: '🌱',
    themeColor: '#22c55e',
    accentColor: '#86efac',
    gradient: 'from-green-600 via-emerald-800 to-slate-950',
    heightLabel: 'Ascends into the Clouds',
    iconType: 'beanstalk',
  },

  // 34. Recycling Plant
  {
    id: 'recycling_plant',
    name: 'Recycling Plant',
    subtitle: 'Conveyor belts, balers & chutes',
    location: 'Eco-Sort Logistics Center',
    description: 'Dodge spinning sorting tumblers, electromagnetic scrap lifts, and vertical aluminum can conveyor towers.',
    status: 'coming_soon',
    badge: '♻️',
    themeColor: '#059669',
    accentColor: '#34d399',
    gradient: 'from-emerald-600 via-cyan-900 to-slate-950',
    heightLabel: '8-Story Sorting Complex',
    iconType: 'factory',
  },

  // 35. Junkyard
  {
    id: 'junkyard',
    name: 'Junkyard',
    subtitle: 'Crushed car towers & scrap cranes',
    location: 'Rusty River Scrap Yard',
    description: 'Scale stacks of retro crushed cars, steel girders, and swinging electromagnetic crane hooks!',
    status: 'coming_soon',
    badge: '🧲',
    themeColor: '#b45309',
    accentColor: '#fcd34d',
    gradient: 'from-amber-700 via-stone-800 to-slate-950',
    heightLabel: 'Crushed Car Pyramids',
    iconType: 'magnet',
  },

  // 36. Sydney Opera House
  {
    id: 'sydney_opera_house',
    name: 'Sydney Opera House',
    subtitle: 'Interlocking concrete shell sails',
    location: 'Sydney Harbour, Australia',
    description: 'Climb the white chevron ceramic tile sails over the harbor as seagulls squawk and ferries glide across the blue water.',
    status: 'coming_soon',
    badge: '🎭',
    themeColor: '#0284c7',
    accentColor: '#bae6fd',
    gradient: 'from-sky-700 via-slate-800 to-slate-950',
    heightLabel: '213 ft Concrete Sails',
    iconType: 'sails',
  },

  // 37. Giant Mushroom Forest
  {
    id: 'giant_mushroom_forest',
    name: 'Giant Mushroom Forest',
    subtitle: 'Bioluminescent fungal canopy',
    location: 'Enchanted Deep Woods',
    description: 'Climb spotted toadstool stems, bouncy spongy caps, and glowing spore cascades in a magical twilight forest.',
    status: 'coming_soon',
    badge: '🍄',
    themeColor: '#f43f5e',
    accentColor: '#fda4af',
    gradient: 'from-rose-600 via-purple-950 to-slate-950',
    heightLabel: '150 ft Fungal Canopy',
    iconType: 'mushroom',
  },

  // 38. Great Wall of China
  {
    id: 'great_wall_of_china',
    name: 'Great Wall of China',
    subtitle: 'Steep granite mountain watchtowers',
    location: 'Badaling & Mutianyu, China',
    description: 'Scramble up sheer stone steps, crenellated brick ramparts, and high mountain watchtowers winding over mountain ridges.',
    status: 'coming_soon',
    badge: '🧱',
    themeColor: '#d97706',
    accentColor: '#fde047',
    gradient: 'from-amber-600 via-stone-800 to-slate-950',
    heightLabel: '13,000 Miles of Stone',
    iconType: 'wall',
  },

  // 39. Notre-Dame Cathedral
  {
    id: 'notre_dame_cathedral',
    name: 'Notre-Dame Cathedral',
    subtitle: 'Gothic spire and flying buttresses',
    location: 'Île de la Cité, Paris',
    description: 'Climb ribbed stone buttresses, stone gargoyles, rose window tracery, and the soaring oak spire over the River Seine.',
    status: 'coming_soon',
    badge: '⛪',
    themeColor: '#ca8a04',
    accentColor: '#fef08a',
    gradient: 'from-yellow-700 via-stone-800 to-slate-950',
    heightLabel: '300 ft Gothic Spire',
    iconType: 'cathedral',
  },

  // 40. Giant Cactus
  {
    id: 'giant_cactus',
    name: 'Giant Cactus',
    subtitle: 'Towering saguaro of the Sonoran desert',
    location: 'Sonoran Desert, Arizona',
    description: 'Pick your path carefully between prickly needles, fluted green ribs, and white blossoms while woodpeckers peek from nests.',
    status: 'coming_soon',
    badge: '🌵',
    themeColor: '#16a34a',
    accentColor: '#86efac',
    gradient: 'from-green-600 via-emerald-800 to-slate-950',
    heightLabel: '50 ft Desert Saguaro',
    iconType: 'cactus',
  },

  // 41. CN Tower
  {
    id: 'cn_tower',
    name: 'CN Tower',
    subtitle: 'Concrete communications needle',
    location: 'Toronto, Ontario, Canada',
    description: 'Climb 1,815 feet of concrete shaft to the Glass Floor and SkyPod high above Lake Ontario.',
    status: 'coming_soon',
    badge: '📡',
    themeColor: '#dc2626',
    accentColor: '#fca5a5',
    gradient: 'from-red-600 via-slate-800 to-slate-950',
    heightLabel: '1,815 ft Supertall Needle',
    iconType: 'tower',
  },

  // 42. Space Needle (Seattle)
  {
    id: 'space_needle',
    name: 'Space Needle (Seattle)',
    subtitle: 'Futuristic saucer over Puget Sound',
    location: 'Seattle, Washington, USA',
    description: 'Scale the slender tripod legs and revolving saucer in the Pacific Northwest drizzle with Mount Rainier in the distance.',
    status: 'coming_soon',
    badge: '🗼',
    themeColor: '#0284c7',
    accentColor: '#38bdf8',
    gradient: 'from-sky-600 via-blue-900 to-slate-950',
    heightLabel: '605 ft Space Needle',
    iconType: 'space_needle',
  },

  // 43. Skyscraper Construction Site
  {
    id: 'skyscraper_construction',
    name: 'Construction Site',
    subtitle: 'Exposed orange steel I-beams',
    location: 'Booming Metropolis',
    description: 'Climb raw orange steel girders, hanging rebar, safety netting, and towering yellow crawler cranes high above traffic.',
    status: 'coming_soon',
    badge: '🏗️',
    themeColor: '#ea580c',
    accentColor: '#facc15',
    gradient: 'from-orange-600 via-zinc-800 to-slate-950',
    heightLabel: '50-Story Exposed Steel Frame',
    iconType: 'crane',
  },

  // 44. Macy’s Parade Balloon
  {
    id: 'macys_parade_balloon',
    name: 'Macy’s Parade Balloon',
    subtitle: 'Giant helium raccoon floating above 6th Ave',
    location: 'Manhattan, New York City',
    description: 'Climb the glossy inflated surface, guide ropes, and helium ears of a giant floating character balloon in the Thanksgiving parade!',
    status: 'coming_soon',
    badge: '🎈',
    themeColor: '#ec4899',
    accentColor: '#f472b6',
    gradient: 'from-pink-600 via-rose-800 to-slate-950',
    heightLabel: '60 ft Floating Helium Giant',
    iconType: 'balloon',
  },
];

export function getLevelConfig(id: string): LevelConfig {
  const found = LEVELS_ROSTER.find((lvl) => lvl.id === id);
  return found || LEVELS_ROSTER[0];
}

const STORAGE_KEY_SELECTED_LEVEL = 'rise_of_raccoons_selected_level_id';

export function getSavedLevelId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SELECTED_LEVEL);
    if (saved && LEVELS_ROSTER.some((l) => l.id === saved)) {
      return saved;
    }
  } catch {}
  return 'st_paul';
}

export function saveSelectedLevelId(levelId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_SELECTED_LEVEL, levelId);
  } catch {}
}
