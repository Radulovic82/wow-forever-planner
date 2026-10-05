# Horde Warlock choices in WoW: Forever (Normal ruleset)

Research for issue #3. Researched 2026-10-05. Game launches 4 Nov 2026, 3:00 pm PST. Beta build used by the data sources is 1.60.1.70170 (talentsforever) and 1.60.1.70205 (forever-ref). Numbers can still change before launch.

Confidence labels used on every claim

- official = Blizzard post or Blizzard page
- data-export = read out of the beta client's data files by a fan project
- secondary = guide or news site that is not Blizzard
- unverified = single weak source, or my own memory of Classic Era

Short names for sources

- [B-HERO] https://news.blizzard.com/en-us/article/24304075/create-the-hero-you-want-to-be-in-world-of-warcraft-forever
- [B-RULES] https://news.blizzard.com/en-us/article/24302070/choose-your-ruleset-in-world-of-warcraft-forever
- [B-DEEP] http://worldofwarcraft.blizzard.com/en-us/news/24303313/world-of-warcraft-forever-deep-dive-panel-recap
- [B-NEXT] https://news.blizzard.com/en-us/article/24303862/world-of-warcraft-forever-whats-next-panel-recap
- [B-LEGACY] http://worldofwarcraft.blizzard.com/en-us/news/24307383/get-to-know-the-world-of-warcraft-forever-legacy-system
- [B-PRE] https://news.blizzard.com/en-us/article/24301508/pre-purchase-world-of-warcraft-forever-upgrades-and-begin-your-next-journey-in-azeroth
- [TF] https://talentsforever.com/data.json (CC-BY-4.0, generated 2026-10-04, beta build 1.60.1.70170)
- [MAF] https://github.com/MAF2414/wow-forever-talents (client snapshot 1.60.1.69876, 16 Sep 2026; no license)
- [REF] https://github.com/alcaras/forever-ref (client tables, builds up to 1.60.1.70205; no license)
- [BW] https://blizzardwatch.com/2026/09/13/world-warcraft-forevers-roadmap-gives-us-ann-idea-expect-rest-2026-summer-2027/
- [METHOD] https://www.method.gg/wow-forever/wow-forever-warlock-leveling-guide-and-talents

## 0. Verdict on the "known so far" list

| Claim | Result | Confidence | Source |
|---|---|---|---|
| Horde Warlock races are Orc, Troll, Undead | Confirmed. Tauren cannot be Warlock. | official + data-export | [B-HERO] class matrix; [TF] racials |
| Troll Warlock is new at launch | Confirmed. Listed among six new combos. | official | [B-DEEP], [B-HERO] |
| New zones Mount Hyjal, Riverglades, Shen'dralas, Zephras Isle | Confirmed as the four new areas. | official | [B-NEXT] |
| Raids Barrow Deeps (10), Hyjal Summit (20), unlock 9 Dec | Confirmed. | official | [B-NEXT] |
| Onyxia from 9 Dec | Plausible, not in the Blizzard text I could read. A roadmap write up says three raids (10, 20, 40 player) unlock 9 Dec. | secondary | [BW] |
| Professions content Summer 2027 | Confirmed as "Professions and Legacy updates" in the Summer 2027 window, seasonal and subject to change. | secondary reporting of the official roadmap | [BW] |
| New race Skyborne | Real, not wrong. But no Skyborne can be a Warlock, so it is irrelevant for this build. | official | [B-HERO] |

## 1. Race

Real options (all three can be Normal ruleset Horde characters; Normal lets you make both factions, per [B-RULES], official).

| | Orc | Troll | Undead |
|---|---|---|---|
| Warlock in Classic Era? | yes | no, new in Forever | yes |
| Racials as listed in the beta client | Blood Fury (instant, 2 min CD, +10% Attack Power and Spell Power for 15 s), Hardiness (stun duration -20%), Axe Specialization (+1% spell and ability crit with axe equipped), Shatter Curse (3 min CD, instantly removes and grants immunity to all Curses and Banes, -15% magic damage taken for 8 s) | Berserking (3 min CD, +10% casting and attack speed for 10 s), Regeneration (+10% health regen, 10% works in combat), Beast Slaying (+5% damage vs beasts), Rapid Regeneration (channel, 3 min CD, heal 50% max health over 6 s) | Underwater Breathing, Will of the Forsaken (2 min CD, removes Charm, Fear, Sleep), Cannibalize (2 min CD, 7% health and mana every 2 s for 10 s, corpse needed), Touch of the Grave (10% chance for casters to drain up to 5% max health, 1 s ICD) |
| Source | [TF] racials, data-export; same racials named in [B-HERO] (official) | same | same |

Facts that distinguish them

- Cannibalize now restores Mana as well as Health, which Blizzard says makes it more useful for mana users (official, [B-DEEP]). Note the [B-DEEP] page summary I fetched called Undead Warlock a "new" combination. That is wrong. The official new list is Gnome Priest, Human Hunter, Dwarf Shaman, Orc Mage, Troll Warlock, Undead Paladin ([B-DEEP], [B-HERO]). Undead Warlock was already in Classic.
- Shatter Curse is the only racial here that is Warlock specific in flavour. It removes Curses and Banes, so it is a defensive tool against enemy casters, mostly relevant in PvP or specific fights. How useful it is in Normal PvE is unverified.
- Touch of the Grave is 10% chance for casters (Priests, Mages, Warlocks) and 5% for melee, after a fix of an earlier swap (data-export, [TF] changelog 2026-09-20).
- Troll Berserking is a raw DPS cooldown. Secondary sites call it strong, but one guide ranks Troll lowest of the three: Horde race tiers "Orc and Undead (B-tier) outperform Troll (C-tier)" ([METHOD], secondary). The reason was not given in the summary I read, so treat as an opinion.
- Orc Blood Fury applies to Attack Power and Spell Power at +10% for 15 s. The Classic Orc racial "Command" (pet damage) is not in the Forever list. That is my memory of Classic, unverified. Check before deciding if you want a Demonology pet build as an Orc.
- Classic comparisons I made from memory (unverified): Classic Undead had Shadow Resistance, now replaced by Touch of the Grave; Classic Troll had a bow specialization, not present in the Forever list.
- Starting zones follow race. Orc and Troll start in Durotar, Undead in Tirisfal Glades (secondary: https://wowhandbook.com/leveling/horde/).
Skyborne (verification)

- Skyborne are a new playable race with two orders. Horde Windshaper and Alliance High Order. Official text says Windshapers "can become Shaman" and High Order "can become Mages" ([B-HERO], official). Neither can be Warlock.
- Contradiction. [TF] racials lists Windshaper classes as Warrior, Hunter, Rogue, Shaman, Druid and High Order as Warrior, Hunter, Rogue, Mage, Druid. The official text says only Shaman and only Mage. The official class matrix on the same page shows five Xs for Skyborne, which matches [TF]. So the official prose and the official table disagree, and the table plus beta data agree with each other. Neither version includes Warlock, so this does not affect the Warlock decision.
- Skyborne start on Zephras Isle (level 1 to 12), which needs a Skyborne pack purchase ([B-PRE] says it is the Skyborne starting experience; level range and pack requirement are from https://vaultalts.com/wow-forever/guides/new-zones-dungeons-and-raids, secondary).

## 2. Spec and talents

All three trees are real options. Forever keeps the Classic style 51 point cap at level 60, with points starting at level 10 (data-export, [TF] `legacy` perk text "you still may not have more than 51 total talent points").

The trees were substantially reworked. Counts below are from [TF] `talents.Warlock` where each talent carries a `classic` comparison. Statuses seen on Warlock: new, changed, moved, same. Talents removed from Classic trees (data-export, [TF]):

- Affliction removed: Improved Curse of Weakness, Improved Drain Soul, Grim Reach, Improved Drain Mana, Improved Curse of Exhaustion, Dark Pact.
- Demonology removed: Improved Healthstone, Fel Stamina (folded into Fel Vitality), Improved Subjugate Demon, Improved Firestone, Improved Spellstone.
- Destruction removed: Improved Firebolt, Improved Lash of Pain, Devastation, Improved Immolate, Emberstorm.

Spec by spec (rank 1 text, 5 rank max where stated; [TF], data-export)

| Spec | Key new or changed pieces | What it plays like |
|---|---|---|
| Affliction | New: Malediction (+1% periodic damage per rank), Soul Harvest, Improved Drains, Pandemic (DoT crit damage bonus up to +100% at max rank), Malevolence (+1% Shadow crit per rank), Wrack (capstone, channel, learned at 40). Changed: Improved Corruption (instant cast at 5/5, per the description: -0.4 s per rank on a 2 s cast, so 0 s), Suppression (+1% hit per rank). Shadow Mastery no longer requires Siphon Life. | DoT and drain. Corruption, Agony, Siphon Life, Wrack. DoTs can crit in Forever (secondary: [METHOD], Icy Veins results, "a big Forever change"). |
| Demonology | New: Demonic Aegis, Demonic Energies, Decimation, Demonic Brand, Improved Felhunter, Demonic Knowledge (up to +100% of level as spell damage while a demon is out, shared with pet), Demonic Pact. Changed: Fel Vitality (absorbs Fel Stamina), Master Summoner no longer needs Fel Domination, Master Demonologist (per demon buff, see section 3). | Pet centred. Strong solo leveler per secondary guides. |
| Destruction | New: Molten Skin, Bane of Havoc, Fire and Brimstone, Shadow and Flame (Conflagrate gives +10% Shadow damage 20 s, Shadowburn gives +10% Fire damage), Incinerate (capstone, learned at 40). Changed: Bane, Ruin, Conflagrate (no longer requires Improved Immolate), Shadowburn. | Fire and Shadow burst. Shadowburn from level 20 per spellbook (rank 1 at 20). |

Other spell level facts (data-export, [TF] spellbooks, levels)

- Bane of Agony level 8, instant, and Methods says it instantly tags a mob ([METHOD], secondary). Corruption level 4. Fear level 8. Life Tap level 6. Conflagrate level 25. Wrack and Incinerate level 40. Death Coil level 42. Bane of Doom level 60 (a Doomguard can be summoned if the target dies from it).
- Banes replace Curses for the DoT-curse slot. "Banes and Curses are separate now, so you can run one of each" ([TF] class_abilities, data-export). Bane of Agony and Bane of Doom are renamed Curse of Agony and Doom.
- Curse of Shadow and Dark Pact are gone from the spellbook ([TF] `gone`, data-export).
- Soul Shards are still a reagent for Voidwalker/Succubus/Incubus/Felhunter summons (spell data shows "Reagents: Soul Shard"). Imp needs no shard.

I found no official Warlock deep dive. Blizzard class deep dive posts seen in search results cover Hunter and Druid, and Priest and Warrior (https://worldofwarcraft.blizzard.com/en-us/news/24301514 and https://worldofwarcraft.blizzard.com/en-gb/news/24301515/world-of-warcraft-forever-class-deep-dives-hunter-and-druid). Whether a Warlock post comes later is unknown.

Leveling spec opinions (secondary, treat as opinion)

- [METHOD] recommends Affliction for leveling, says all three are viable, and puts 4 points in Suppression first in every tree.
- Several guide sites echo "Affliction levels best". Icy Veins pages (icy-veins.com/wow-forever) return HTTP 403 to automated fetches, so I did not read them.

## 3. Pets (demons)

All five demons are real options. Summon spell levels from [TF] spellbook (data-export).

| Demon | Learned | Notes |
|---|---|---|
| Imp | 1 | No Soul Shard. Firebolt (levels 1, 8, 18 ...), Fire Shield, Blood Pact (level 4). |
| Voidwalker | 10 | Torment (10), Sacrifice (16), Consume Shadows (18), Suffering (24). Tank pet. |
| Succubus | 20 | Lash of Pain (20), Soothing Kiss (22), Seduction. Melee damage. |
| Incubus | 20 | Male counterpart. Same abilities as Succubus per secondary guides (https://leprestore.com is a store, so weigh lightly). In the client it is a separate Summon Incubus spell at level 20 (data-export). |
| Felhunter | 30 | Via class quest per secondary sources. Devour Magic (30), Tainted Blood (32), Spell Lock (36). Spell Lock is interrupt. |

- Subjugate Demon (renamed Enslave Demon) ranks at 30, 44, 58 (data-export). Improved Subjugate Demon talent was removed. Inferno at 50. Ritual of Doom exists.
- Demonic Sacrifice (talent, level 20 spell): Imp +15% Shadow damage, Voidwalker restores 2% mana every 4 s, Succubus or Incubus +15% Fire damage, Felhunter restores 3% health every 4 s, lasts 2 hrs. New talent Demonic Pact lets you switch demons without cancelling it (data-export, [TF]).
- Master Demonologist: Imp +10% Fire damage, Voidwalker -10% Physical damage taken, Succubus or Incubus +10% Shadow damage, Felhunter -10% Magic damage taken (data-export, [TF] at max rank).
- Fel Vitality (Demonology) replaces Classic Fel Stamina: pet health up 5% per rank, applies to all five demons ([TF] note). Demonic Energies heals the pet for 8% per rank of spell damage you deal.
- Pet leveling advice from [METHOD]: Imp for 1 to 10, then Voidwalker as "personal tank". Secondary only.
- Nothing in the Warlock data suggests a tameable pet system like Hunter. Pets are the five summoned demons plus Doomguard and Infernal.

## 4. Leveling zones and route

Official facts

- Four new areas: Mount Hyjal, Shen'dralas, Riverglades, Zephras Isle; over 1,000 new quests across 1 to 60 ([B-NEXT], official).
- Nine new dungeons: Hall of Thanes, Ruins of Lordaeron, Excavation Site, City of Dalaran, Blackmaw Hold, The Drowned City, Krol'dok Stronghold, Alcaz Prison, Shaper's Terrace ([B-NEXT], official). Names only. Levels and factions below are secondary.
- Solo kill pace Blizzard expects: an ordinary creature takes roughly 10 to 15 seconds ([B-DEEP], official). Spell dependent classes feel this strongly, which is why Affliction and pet specs are discussed as leveling picks.
- Legacy perk "Talented" lets talent points start earlier (level 9 down to 5 at 5/5). "Well Rested" makes rested XP 4% faster per rank, up to 20%. The Adventure tree also has Field Guide, Frequent Flier and more (data-export, [TF] `legacy`). 16 points per character at launch, account wide earning ([B-LEGACY], official). Legacy unlocks at level 25, 150 in a non-gathering profession, or exploring the whole map ([B-LEGACY], official).

Horde route (secondary, unverified in detail)

- A route is described as Durotar or Tirisfal start (1 to 10), then The Barrens and Silverpine (10 to 20), Stonetalon, Ashenvale, Hillsbrad, Thousand Needles (20 to 30), Riverglades around 35 to 45, then Tanaris, Feralas, Hinterlands, Shen'dralas, then Un'Goro, Felwood, Western Plaguelands, Winterspring, Burning Steppes, Silithus, with Mount Hyjal near 60 (secondary: https://wowhandbook.com/leveling/horde/, https://wowforeverbuilds.com/leveling/route/horde). I could not tell which of these sites are independent, and some are store adjacent, so no single route is verified.
- forever-ref notes its own route builder uses "RestedXP's free Forever Horde guides" for levels 1 to 22 ([REF] README, secondary tool author). That is a hint that RestedXP is the route source people use. I did not open it.
- Shen'dralas level range is "not announced" in the one table I found (https://vaultalts.com/wow-forever/guides/new-zones-dungeons-and-raids, secondary). Riverglades is described as mid 30s to mid 40s with 150+ quests (same source). Mount Hyjal is endgame, and holds the Barrow Deeps and Hyjal Summit raids.

Horde dungeon options while leveling

| Dungeon | Level (secondary table) | Faction | Note |
|---|---|---|---|
| Ruins of Lordaeron | 15 to 20 | Horde | Quests need level 15 to 16, dungeon listed as 11 to 24 by another source ([REF] guides, secondary). |
| Excavation Site (Wetlands) | 24 to 29 | Both | |
| City of Dalaran | 28 to 33 | Both | |
| The Drowned City | 35 to 40 | Both | |
| Krol'dok Stronghold | 40 to 45 | Both | |
| Alcaz Prison | 48 to 53 | Both | |
| Blackmaw Hold | 55 to 60 | Both | |
| Shaper's Terrace | 58 to 60 | Both | |
| Hall of Thanes | 13 to 18 | Alliance only | Not available to Horde. |

Classic dungeons also exist in the client and are used in the route data: Ragefire Chasm, Wailing Caverns, Shadowfang Keep, Blackfathom Deeps ([REF] `site/guides/prep.js`, secondary).

Contradictions noted

- Hall of Thanes level is 13 to 17 in [REF] prep guides and 13 to 18 in the zone table. Alliance only anyway.
- Beta end date is given as 21 Oct in [B-PRE] (official) and "22 October" in [BW]. Irrelevant for launch.
- [BW] says beta runs through level 30 only. Level 30 content (Felhunter, Subjugate Demon) is therefore what beta players could test.

## 5. Professions

Real options (12 skill lines exist in the client: Alchemy, Blacksmithing, Enchanting, Engineering, Herbalism, Leatherworking, Mining, Skinning, Tailoring, Cooking, First Aid, Fishing; counted from recipe tables, data-export, [REF] build 1.60.1.70205). No Jewelcrafting or Inscription in the data.

- Blizzard: over 600 new recipes; Blacksmiths, Tailors, Herbalists, Alchemists, Leatherworkers and Cooks get campfire style "camping" crafting objects; first camp objects learned at skill 20 from trainers or special NPCs, more advanced objects come from Blueprint recipes dropping from dungeon bosses ([B-DEEP], [B-RULES] search summary, official).
- [MAF] says 2,232 recipes and enchants, 961 new recipe IDs and 39 camping variants (data-export). Different count to "over 600". The difference is probably what counts as new, not verified.
- Legacy has a Professions tree and challenges for reaching skill 150, 225 and 300 per profession, 18 points total ([B-LEGACY], official). So the visible cap is 300.
- Oddity. [REF] recipe data contains skill values up to 375. This may be unused data. Unverified.
- Summer 2027 is "Professions and Legacy updates" ([BW], secondary report of official roadmap). Not available at launch.
- [METHOD] recommends Tailoring plus Enchanting for a Warlock (secondary). Reason given: Tailoring crafts caster gear and Enchanting uses the disenchanted materials. Gatherer options (Herbalism plus Alchemy, Mining plus Engineering) have no Warlock specific source here.
- Cloth crafting gear examples present in client: Shadoweave pieces (levels 37 to 44) and Bloodvine set (level 60 Tailoring) exist as item records ([REF] items, data-export). Whether Forever changed their recipes is not checked.

## 6. Gear sources

- Itemization changed. Official: hit and crit chance are combined by damage type, weapon skill per item is reduced, new spellcaster weapons give spell damage and healing, and trinkets move toward varied situational effects ([B-DEEP], official). Tooltips use the modern rating style (+20 Hit, +28 Critical Strike) and there are new stat types, such as school specific spell damage ([REF] README, data-export).
- Tier 1 Warlock set is **Demonheart Raiment**, with a 5 piece bonus "Your Life Tap generates 20% more Mana at no additional Health cost" ([MAF] `docs/content-findings.md`, data-export, client 1.60.1.69876). Member item IDs lack metadata in that snapshot and drop sources are not established. Raids are not in the launch window, so Tier 1 availability timing is unverified.
- Raid timeline for end game gear (official): Barrow Deeps (10), Hyjal Summit (20) from 9 Dec, plus Onyxia's Lair per [BW] and secondary sources. More raids, dungeons and a "revamped iconic raid" come later ([B-NEXT], official). Spring 2027 two new raids, Summer 2027 a revamped raid and a new raid ([BW]).
- Dungeon gear is available from the nine new dungeons, with Horde excluded from Hall of Thanes (section 4).
- Crafted gear via Tailoring and camping blueprints (section 5).
- PvP gear. Darkspear Islands is a new 15 v 15 battleground (official, [B-NEXT]). 60 new or updated PvP armor sets exist in the client ([MAF], data-export). The PvP ruleset restricts to one faction per account, Normal does not, and cross ruleset grouping is blocked ([B-RULES], official). A Normal PvE player does not need PvP gear.
- A "Warlock Orb 35" item exists in the client item data (id 6899, level 35, [REF]). This looks like a quest or class quest item. Unverified.

## 7. Open doubts

1. No official Warlock deep dive existed in what I could read. All Warlock talent facts rest on fan exports of the beta client. [TF] says numbers "can lag live tuning".
2. Icy Veins (the preferred secondary source) blocks automated fetches (HTTP 403), so none of its Warlock guides are cited. Wowhead and warcraft.wiki.gg were skipped as instructed.
3. Skyborne classes. Official prose and official table disagree (Shaman only vs five classes). No Warlock either way.
4. Onyxia 9 Dec comes from a news report of the roadmap, not from a Blizzard text I could read.
5. Leveling route and zone level ranges are secondary only. Shen'dralas levels are unannounced in the sources I found.
6. Orc "Command" and other Classic racial comparisons are from my memory of Classic Era.
7. A search returned guides from boosting and gold shops. I did not cite them, except one search summary for Incubus details where I flagged the source as a store.
8. Fetching note. For [B-HERO] I downloaded the page directly with curl and used a standard browser style User-Agent string to read the matrix text. The page was not blocking, and WebFetch had already retrieved it, but flagging it for honesty.
