"""Auckland growing guide.

Months are season-month units: Jul=0, Aug=1 ... Jun=12. A window [a, b) is
half-open so [1, 3] means "August and September". Several windows are given
as a flat list of pairs.

Vegetables:
  where   inside = start in trays and plant out; direct = sow where it grows;
          either = both work (treated like direct for reminders, but gets a
          plant-out window)
  sow     sowing window(s)
  out     plant-out window(s), when started inside
  harv    harvest window(s)
  night   the coldest overnight low (°C, 7 nights) the plant tolerates
          outside. Used to decide whether a plant-out or direct sowing is
          "go" or "wait" from the outside sensor.
  soil    soil temperature wanted for germination (°C). Inside, checked
          against the heat pad probe; direct, against the outside 7-day mean
          as a rough proxy for bed soil temperature.
"""

VEG = [
    # --- warm season, started inside ---
    dict(id="tomato", name="Tomato", where="inside", sow=[1, 3], out=[3, 5], harv=[6, 10], night=10, soil=20,
         tip="Sow on the heat pad in Aug, pot on once, plant out when nights stay above 10°. Pinch laterals on tall types."),
    dict(id="capsicum", name="Capsicum", where="inside", sow=[1, 3], out=[4, 5.5], harv=[7, 10], night=12, soil=24,
         tip="Slow to germinate, wants real warmth. Greenhouse or the hottest bed."),
    dict(id="chilli", name="Chilli", where="inside", sow=[1, 3], out=[4, 5.5], harv=[7, 11], night=12, soil=24,
         tip="Same as capsicum. Overwinter a plant in the greenhouse for an early start."),
    dict(id="eggplant", name="Eggplant", where="inside", sow=[1, 3], out=[4, 5.5], harv=[7, 10], night=12, soil=24,
         tip="Needs the greenhouse in Auckland most years."),
    dict(id="basil", name="Basil", where="inside", sow=[2, 5], out=[4, 6], harv=[5, 10], night=10, soil=20,
         tip="Hates cold nights. Sow a second batch in December."),
    dict(id="zucchini", name="Zucchini", where="either", sow=[2, 6], out=[3.5, 6.5], harv=[5, 10], night=8, soil=18,
         tip="Two plants is plenty. Second sowing in December for autumn."),
    dict(id="cucumber", name="Cucumber", where="either", sow=[2, 6], out=[4, 6.5], harv=[5, 10], night=10, soil=20,
         tip="Climb them. Powdery mildew by late summer is normal; sow again in Dec."),
    dict(id="pumpkin", name="Pumpkin", where="either", sow=[2, 4.5], out=[3.5, 5], harv=[8, 10], night=8, soil=18,
         tip="Cure in the sun for 2 weeks after cutting. Leave stalk on."),
    dict(id="melon", name="Melon", where="inside", sow=[2, 4], out=[4, 5.5], harv=[7, 9], night=12, soil=22,
         tip="Watermelon and rockmelon. Hot spot, black plastic helps."),
    dict(id="kumara", name="Kūmara", where="inside", sow=[3, 5], out=[4, 5.5], harv=[8, 10], night=10, soil=18,
         tip="Start slips from a tuber in Oct. Plant in mounds, don't feed."),
    dict(id="sweetcorn", name="Sweetcorn", where="direct", sow=[3, 6], harv=[6, 9], night=8, soil=16,
         tip="Plant in a block, not a row, for pollination. Sow every 3 weeks for a longer pick."),
    dict(id="beans_dwarf", name="Beans (dwarf)", where="direct", sow=[3, 7.5], harv=[5, 10], night=8, soil=16,
         tip="Successive sowings every 3 weeks until Feb."),
    dict(id="beans_climbing", name="Beans (climbing)", where="direct", sow=[3, 6.5], harv=[5.5, 10], night=8, soil=16,
         tip="Scarlet runner or blue lake. Frame up before sowing."),
    dict(id="celery", name="Celery", where="inside", sow=[1, 4], out=[3, 6], harv=[6, 10], night=5, soil=18, area="Middle",
         tip="Needs constant water. Blanch or grow as cutting celery."),
    dict(id="leek", name="Leek", where="inside", sow=[2, 7], out=[5, 9], harv=[9, 14], night=0, soil=12,
         tip="Plant seedlings deep in a dibber hole, don't backfill."),

    # --- year-round or cool-tolerant, mostly direct ---
    dict(id="lettuce", name="Lettuce", where="either", sow=[0, 12], out=[0, 12], harv=[0, 12], night=0, soil=8,
         tip="A punnet every 3 weeks. Shade in Jan–Feb or it bolts."),
    dict(id="rocket", name="Rocket", where="direct", sow=[0, 12], harv=[0, 12], night=0, soil=8,
         tip="Bolts fast in summer; sow little and often."),
    dict(id="spring_onion", name="Spring onion", where="direct", sow=[0, 12], harv=[0, 12], night=0, soil=10,
         tip="Sow thickly, pull as needed."),
    dict(id="radish", name="Radish", where="direct", sow=[0, 12], harv=[0, 12], night=0, soil=8,
         tip="4 weeks from sowing. Quick filler between slow crops."),
    dict(id="carrot", name="Carrot", where="direct", sow=[1, 9], harv=[4, 12], night=0, soil=10,
         tip="Keep the seed bed damp until up (2–3 weeks). Thin hard."),
    dict(id="beetroot", name="Beetroot", where="direct", sow=[1, 10], harv=[4, 12], night=0, soil=10,
         tip="Soak seed overnight. Each 'seed' is a cluster, thin to one."),
    dict(id="parsnip", name="Parsnip", where="direct", sow=[2, 6], harv=[9, 13], night=0, soil=12,
         tip="Fresh seed only. Slow to germinate, sow radish in the row as a marker."),
    dict(id="potato", name="Potato", where="direct", sow=[1, 4, 6, 7.5], harv=[5, 9, 10, 12], night=2, soil=10,
         tip="Early crop Aug–Sep (Rocket, Swift), main crop Oct. Second planting Jan for winter potatoes."),
    dict(id="silverbeet", name="Silverbeet", where="either", sow=[1, 4, 7, 10], out=[2, 5, 8, 11], harv=[0, 12], night=0, soil=10,
         tip="Two sowings a year keeps you in leaves all year."),
    dict(id="spinach", name="Spinach", where="direct", sow=[7, 11], harv=[9, 13], night=0, soil=8,
         tip="Autumn and winter crop in Auckland; bolts in warm weather."),
    dict(id="coriander", name="Coriander", where="direct", sow=[7, 11], harv=[9, 13], night=0, soil=8,
         tip="Autumn sowing lasts, spring sowing bolts in weeks."),
    dict(id="parsley", name="Parsley", where="either", sow=[1, 4, 7, 10], out=[2, 5, 8, 11], harv=[0, 12], night=0, soil=10,
         tip="Slow to germinate (3 weeks). Second year it flowers; resow."),
    dict(id="peas", name="Peas", where="direct", sow=[8, 12, 0, 2], harv=[11, 13, 1, 5], night=0, soil=8,
         tip="Autumn sowing for spring picking. Mice take the seed, start in guttering if needed."),
    dict(id="snow_peas", name="Snow peas", where="direct", sow=[8, 12, 0, 2], harv=[11, 13, 1, 5], night=0, soil=8,
         tip="Same as peas. Climb them."),
    dict(id="broad_bean", name="Broad bean", where="direct", sow=[9, 12], harv=[2, 5], night=0, soil=8,
         tip="Pinch the tops once pods set to beat black aphid. Rust late is normal."),
    dict(id="garlic", name="Garlic", where="direct", sow=[10, 12], harv=[5, 6.5], night=0, soil=8,
         tip="Plant May–June, biggest cloves, 15 cm apart. Rust is the enemy: airflow, no overhead water. Lift when the bottom third of leaves brown."),
    dict(id="shallot", name="Shallot", where="direct", sow=[10, 13], harv=[5, 7], night=0, soil=8,
         tip="Plant on the shortest day, harvest on the longest."),
    dict(id="onion_brown", name="Onion (brown)", where="inside", sow=[9, 12], out=[11, 14], harv=[5, 7], night=0, soil=10, area="Big",
         tip="Pukekohe Long Keeper. Transplant seedlings in winter, pencil thick. Lift when tops fall over, cure in the sun."),
    dict(id="onion_red", name="Onion (red)", where="inside", sow=[9, 12], out=[11, 14], harv=[5, 7], night=0, soil=10, area="Big",
         tip="Red onions store less well than brown; use first."),
    dict(id="walking_onion", name="Walking onion", where="direct", sow=[8, 12], harv=[0, 12], night=0, soil=8, area="Orchard, Backyard",
         tip="Perennial. Plant topsets in autumn or winter. Pull greens any time, let a few stalks walk."),
    dict(id="mashua", name="Mashua", where="direct", sow=[2, 5], harv=[10, 13], night=2, soil=12, area="Backyard",
         tip="Plant tubers Sep–Nov, give it something to climb. Tubers form after the autumn equinox; dig after frost kills the tops."),
    dict(id="myoga", name="Myoga ginger", where="direct", sow=[1, 4], harv=[7, 10], night=0, soil=10, area="Backyard, Orchard",
         tip="Perennial, dies back in winter. Plant rhizomes late winter in shade. Pick the flower buds at ground level Feb–Apr."),

    # --- brassicas and winter greens, started inside ---
    dict(id="broccoli", name="Broccoli", where="inside", sow=[6, 9], out=[7, 10], harv=[10, 14], night=0, soil=12,
         tip="Net against white butterfly. Cut the main head, side shoots keep coming."),
    dict(id="cauliflower", name="Cauliflower", where="inside", sow=[6, 9], out=[7, 10], harv=[10, 14], night=0, soil=12,
         tip="Fussy. Never let it dry out or check growth."),
    dict(id="cabbage", name="Cabbage", where="inside", sow=[6, 9], out=[7, 10], harv=[10, 14], night=0, soil=12,
         tip="Net it. Red cabbage is less troubled by caterpillars."),
    dict(id="kale", name="Kale", where="inside", sow=[6, 9], out=[7, 10], harv=[9, 14], night=0, soil=12,
         tip="Sweeter after cold nights. Pick from the bottom."),
    dict(id="brussels", name="Brussels sprouts", where="inside", sow=[5, 8], out=[7, 9], harv=[11, 14], night=0, soil=12,
         tip="Marginal in Auckland, needs a cold winter. Firm the soil hard."),
    dict(id="bok_choy", name="Bok choy", where="either", sow=[7, 11, 1, 4], out=[8, 12, 2, 5], harv=[8, 13, 2, 6], night=0, soil=10,
         tip="Fast. Bolts in heat, so autumn and spring only."),

    # --- perennials and odd ones ---
    dict(id="strawberry", name="Strawberry", where="inside", sow=[11, 13], out=[11, 14], harv=[3, 7], night=0, soil=10, area="Backyard",
         tasks=[
        dict(kind="prune", w=[7.5, 9.5], why="After fruiting: cut old leaves off to the crown, remove runners you don't want, keep the strongest for new plants."),
        dict(kind="feed", w=[1.5, 3], why="Feed in spring as flowers start; straw under the fruit."),
        dict(kind="other", w=[11, 13], why="Replace plants older than 3 years with rooted runners."),
    ], tip="Plant runners June–Aug. Straw under the fruit. Replace plants every 3 years."),
    dict(id="asparagus", name="Asparagus", where="inside", sow=[11, 14], out=[11, 14], harv=[2, 5], night=0, soil=10, area="Big",
         tip="Crowns in winter. Wait two seasons before picking. Cut fern down in June."),
    # --- herbs
    dict(id="lemongrass", name="Lemongrass", where="inside", sow=[3, 6], out=[4, 7], harv=[5, 10], night=5, soil=20, area="Backyard",
         tip="Divide a clump in spring. Cut stalks at the base from summer. Dies back in a cold winter; mulch the crown."),
    dict(id="thyme", name="Thyme", where="inside", sow=[2, 5], out=[3, 6], harv=[0, 12], night=0, soil=18,
         tip="Easier from a cutting or division. Full sun, poor soil, don't overwater."),
    dict(id="oregano", name="Oregano", where="inside", sow=[2, 5], out=[3, 6], harv=[0, 12], night=0, soil=18,
         tip="Cut back hard after flowering. Divide every few years."),
    dict(id="mint", name="Mint", where="direct", sow=[2, 5, 7, 10], harv=[0, 12], night=0, soil=15,
         tip="Pot or contained bed only, it runs. Cut back to the ground in winter."),
    dict(id="spearmint", name="Spearmint", where="direct", sow=[2, 5, 7, 10], harv=[0, 12], night=0, soil=15,
         tip="Same as mint: contain it. Best leaves before flowering."),
    dict(id="chives", name="Chives", where="either", sow=[1, 5, 7, 10], out=[2, 6, 8, 11], harv=[0, 12], night=0, soil=15,
         tip="Divide clumps in autumn. Cut to 3 cm, it comes back. Flowers are edible."),
    dict(id="sage", name="Sage", where="either", sow=[2, 5], out=[3, 6, 9, 11], harv=[0, 12], night=0, soil=18, area="L",
         tip="Purple or common. Cut back after flowering; replace woody plants every 4–5 years."),
    dict(id="fennel", name="Fennel (bulb)", where="either", sow=[1, 4, 7, 10], out=[2, 5, 8, 11], harv=[4, 7, 10, 13], night=0, soil=15, area="Big",
         tip="Bolts in heat; autumn sowing is easiest. Earth up the bulbs."),
    # --- berries
    dict(id="raspberry", name="Raspberry", where="inside", sow=[11, 14], out=[11, 14], harv=[5, 8], night=0, soil=10, area="Orchard",
         tasks=[
        dict(kind="prune", w=[0, 1.5], why="Winter: autumn-fruiting canes all cut to the ground; summer types keep 6–8 strong new canes per metre, cut out the ones that fruited."),
        dict(kind="prune", w=[7, 8.5], why="After the summer crop: cut fruited canes to the ground, tie in the new ones."),
        dict(kind="feed", w=[1.5, 3], why="Compost and sheep pellets in spring, mulch thickly. Shallow roots, don't dig near them."),
    ], tip="Plant canes in winter. Summer types: cut fruited canes to the ground after harvest. Autumn types: cut everything down in July."),
    dict(id="blackberry", name="Blackberry", where="inside", sow=[11, 14], out=[11, 14], harv=[6, 9], night=0, soil=10, area="Orchard",
         tasks=[
        dict(kind="prune", w=[8, 10], why="After harvest: cut fruited canes to the ground, tie this year's new canes onto the wires."),
        dict(kind="prune", w=[3, 6], why="Tip new canes at about 2 m to make them branch."),
        dict(kind="feed", w=[1.5, 3], why="Compost and a general fertiliser in spring, mulch."),
    ], tip="Thornless types. Tie new canes to a wire, cut fruited canes out in winter."),
    dict(id="alpine_strawberry_red", name="Alpine strawberry (red)", where="either", sow=[1, 4, 7, 10], out=[2, 6], harv=[3, 10], night=0, soil=18, area="Backyard",
         tasks=[
        dict(kind="prune", w=[8, 10], why="Tidy old and brown leaves in autumn; divide crowded clumps."),
        dict(kind="feed", w=[2, 3.5], why="Light feed in spring."),
    ], tip="No runners; grow from seed or divide clumps. Tiny, intense fruit most of the year. Shade-tolerant edging."),
    dict(id="alpine_strawberry_white", name="Alpine strawberry (white)", where="either", sow=[1, 4, 7, 10], out=[2, 6], harv=[3, 10], night=0, soil=18, area="Backyard",
         tasks=[
        dict(kind="prune", w=[8, 10], why="Tidy old and brown leaves in autumn; divide crowded clumps."),
        dict(kind="feed", w=[2, 3.5], why="Light feed in spring."),
    ], tip="Birds leave the white ones alone. Ripe when the seeds turn dark and it smells of pineapple."),
    dict(id="gherkin", name="Gherkin", where="either", sow=[2, 6], out=[4, 6.5], harv=[5, 9], night=10, soil=20,
         tip="Treat like cucumber. Pick small and often for pickling."),
    dict(id="goji", name="Goji berry", where="inside", sow=[1, 4], out=[4, 7], harv=[6, 10], night=0, soil=20, area="Backyard",
         tasks=[
        dict(kind="prune", w=[11, 13], why="Winter: keep 3–5 main stems, shorten side shoots; fruit comes on the new season's growth."),
        dict(kind="prune", w=[5, 7], why="Summer: pinch back long whippy shoots to keep it bushy."),
    ], tip="Slow and erratic from seed (2–4 weeks). Hardy shrub once established; fruits from year two or three. Prune to keep it in bounds."),
    dict(id="turmeric", name="Turmeric", where="inside", sow=[2, 4], out=[4, 5.5], harv=[10, 13], night=10, soil=22, area="Greenhouse",
         tip="Start rhizomes in a warm tray Sep–Oct (heat pad helps, 3–6 weeks to sprout). Plant out in Nov into the greenhouse or the hottest bed; keep moist and feed. Dig when the leaves die back in May–July, keep a few rhizomes to restart."),
    dict(id="yam", name="Yam (oca)", where="direct", sow=[3, 5], harv=[10, 12], night=5, soil=14,
         tip="Plant tubers Oct. Tubers form after the autumn equinox; harvest after the tops die down."),
    dict(id="jerusalem_artichoke", name="Jerusalem artichoke", where="direct", sow=[1, 4], harv=[9, 13], night=0, soil=8,
         tip="Plant tubers in late winter. Tall, use as a windbreak. Hard to get rid of."),
]

# Fruit trees and perennials. `area` is where it lives; `night` is the
# coldest 7-night low it is happy with outside; `shelter` marks a tender
# plant whose home (greenhouse / inside / outside) we track with "move"
# events so the app can say when it can go out or must come in.
# Each task: kind copper | oil | feed | prune | other, window, why.
# Windows follow the usual Auckland timing; the tree's real stage (leaf
# fall, bud swell, petal fall) moves a week or two either way.
TREES = [
    dict(id="apple", name="Apple", area="Orchard", variety="Gravenstein, Blush Babe, original + unknown graft", tasks=[
        dict(stage="Leaf fall", kind="copper", w=[10, 12], why="At leaf fall: black spot and canker."),
        dict(kind="oil", w=[11, 13], why="Winter oil with lime sulphur while dormant: scale, mites, woolly aphid."),
        dict(stage="Bud burst", kind="copper", w=[1.5, 3], why="Bud burst to pink bud: black spot."),
        dict(kind="other", w=[3, 8], why="Codling moth: pheromone trap from October, pick up fallen fruit."),
        dict(kind="prune", w=[11, 13], why="Winter prune for shape; summer prune Jan to tame vigour."),
        dict(stage="Bud burst", kind="feed", w=[1, 2.5], why="Compost and a general fruit tree fertiliser at bud burst."),
    ]),
    dict(id="pear", name="Pear", area="Orchard", variety="Bosc graft", tasks=[
        dict(stage="Leaf fall", kind="copper", w=[10, 12], why="At leaf fall: black spot."),
        dict(kind="oil", w=[11, 13], why="Winter oil: scale and pear leaf blister mite."),
        dict(stage="Bud burst", kind="copper", w=[1.5, 3], why="Bud burst: black spot."),
        dict(kind="prune", w=[11, 13], why="Winter prune."),
        dict(stage="Bud burst", kind="feed", w=[1, 2.5], why="Feed at bud burst."),
    ]),
    dict(id="plum", name="Plum", area="Orchard", variety="Christmas, Satsuma, Billington graft", tasks=[
        dict(stage="Leaf fall", kind="copper", w=[10, 11.5], why="At leaf fall: bacterial blast and brown rot."),
        dict(kind="oil", w=[11, 13], why="Winter oil: scale."),
        dict(stage="Bud swell", kind="copper", w=[1, 2.2], why="Bud swell, before flowers open: leaf curl and brown rot."),
        dict(kind="prune", w=[6, 8], why="Prune stone fruit in summer after harvest, in dry weather, to avoid silver leaf."),
        dict(stage="Bud burst", kind="feed", w=[1, 2.5], why="Feed at bud burst."),
    ]),
    dict(id="peach", name="Peach", area="Orchard", variety="Golden", tasks=[
        dict(stage="Leaf fall", kind="copper", w=[10, 11.5], why="At leaf fall: leaf curl and bacterial spot. Peaches are the worst for leaf curl."),
        dict(stage="Bud swell", kind="copper", w=[1, 2.2], why="Bud swell, before any pink shows: leaf curl. Once leaves are out copper is too late; pick off curled leaves and feed."),
        dict(kind="oil", w=[11, 13], why="Winter oil: scale and mites."),
        dict(stage="New growth", kind="other", w=[2.5, 4], why="New growth: check for leaf curl (red, puckered leaves). Pick them off and bin them, then feed to push clean leaves."),
        dict(stage="Fruit set", kind="other", w=[3.5, 5], why="Thin fruit to a hand-width apart once they're marble-sized, or the tree crops every second year."),
        dict(kind="prune", w=[6, 8], why="Prune after harvest in dry weather to an open vase; fruit comes on last year's wood."),
        dict(stage="Bud burst", kind="feed", w=[1.5, 3], why="Compost and a fruit tree fertiliser at bud burst."),
    ]),
    dict(id="apricot", name="Apricot", area="Orchard", variety="Raglan seedling", tasks=[
        dict(stage="Leaf fall", kind="copper", w=[10, 11.5], why="At leaf fall: leaf curl and blast."),
        dict(stage="Bud swell", kind="copper", w=[0.7, 2], why="Bud swell, before flowers open: leaf curl. Apricots flower early, don't miss it."),
        dict(kind="oil", w=[11, 13], why="Winter oil: scale."),
        dict(kind="prune", w=[6, 8], why="Summer prune after harvest, dry weather."),
        dict(stage="Bud burst", kind="feed", w=[1, 2.5], why="Feed at bud burst."),
    ]),
    dict(id="lemon", name="Lemon", area="Orchard", tasks=[
        dict(kind="oil", w=[11, 14], why="Oil for scale, mealybug and sooty mould. Cool, overcast days only."),
        dict(stage="Petal fall", kind="copper", w=[2.2, 3.6], why="After petal fall: verrucosis (scab)."),
        dict(kind="feed", w=[1, 2.5], why="Citrus food, spring."),
        dict(kind="feed", w=[7, 8.5], why="Citrus food, late summer."),
        dict(kind="prune", w=[2, 4], why="Light prune after the main harvest; remove dead wood and water shoots."),
    ]),
    dict(id="lime", name="Lime", area="Orchard", variety="Bearss", night=2, tasks=[
        dict(kind="prune", w=[2, 4], why="Light prune after the main crop: thin crowded centre, remove dead wood and water shoots. Never more than a third."),
        dict(kind="oil", w=[11, 14], why="Oil for scale and sooty mould. Cool days only."),
        dict(stage="Petal fall", kind="copper", w=[2.2, 3.6], why="After petal fall: verrucosis."),
        dict(kind="feed", w=[1, 2.5], why="Citrus food, spring."),
        dict(kind="feed", w=[7, 8.5], why="Citrus food, late summer."),
        dict(kind="other", w=[10, 13], why="Limes are the least hardy citrus: frost cloth on cold nights."),
    ]),
    dict(id="orange", name="Orange", area="Orchard", variety="Harwood Late", tasks=[
        dict(stage="Petal fall", kind="prune", w=[2.5, 4.5], why="Light prune after petal fall: open the centre, lift the skirt off the ground, remove dead wood."),
        dict(kind="oil", w=[11, 14], why="Oil for scale and sooty mould. Cool days only."),
        dict(stage="Petal fall", kind="copper", w=[2.2, 3.6], why="After petal fall: verrucosis."),
        dict(kind="feed", w=[1, 2.5], why="Citrus food, spring."),
        dict(kind="feed", w=[7, 8.5], why="Citrus food, late summer."),
        dict(kind="other", w=[4.5, 9], why="Harwood Late ripens Nov–Mar; leave fruit on the tree, it holds."),
    ]),
    dict(id="mandarin", name="Mandarin", area="Orchard", variety="Satsuma (planned)", tasks=[
        dict(kind="prune", w=[1.5, 3.5], why="Light prune after harvest: thin the centre for air and light, cut out dead wood."),
        dict(kind="oil", w=[11, 14], why="Oil for scale. Cool days only."),
        dict(kind="feed", w=[1, 2.5], why="Citrus food, spring."),
        dict(kind="feed", w=[7, 8.5], why="Citrus food, late summer."),
    ]),
    dict(id="tamarillo", name="Tamarillo", area="Backyard", night=3, tasks=[
        dict(kind="feed", w=[2, 4], why="Feed in spring; shallow roots, mulch and water in summer."),
        dict(kind="prune", w=[2, 3.5], why="Prune after harvest in spring to keep fruit within reach; fruits on new wood."),
        dict(kind="other", w=[10, 13], why="Frost tender. The 2023 one died by the blueberries."),
    ]),
    dict(id="pepino", name="Pepino", area="Greenhouse", night=3, shelter=True, tasks=[
        dict(kind="feed", w=[2, 4], why="Feed in spring; treat like a tomato."),
        dict(kind="prune", w=[1.5, 3], why="Cut back hard in late winter; take cuttings, they root easily."),
    ]),
    dict(id="ginger", name="Ginger", area="Greenhouse", night=10, shelter=True, tasks=[
        dict(kind="feed", w=[3, 7], why="Liquid feed monthly while growing; keep moist and warm."),
        dict(kind="other", w=[9, 12], why="Harvest once the tops die back (Apr–Jun); keep a rhizome to replant in Oct."),
    ]),
    dict(id="cape_gooseberry", name="Cape gooseberry", area="Backyard", night=2, tasks=[
        dict(kind="prune", w=[1.5, 3], why="Cut back by half in late winter; self-seeds freely."),
        dict(kind="other", w=[6, 11], why="Pick when the husk is papery and the fruit drops."),
    ]),
    dict(id="coffee", name="Coffee", area="Backyard", night=5, tasks=[
        dict(kind="feed", w=[2, 4], why="Acid feed in spring; part shade, out of wind."),
        dict(kind="other", w=[10, 13], why="Frost cloth on cold nights."),
    ]),
    dict(id="sugar_cane", name="Sugar cane", area="Backyard", night=3, tasks=[
        dict(kind="other", w=[10, 13], why="Cut mature canes in winter; replant a few nodes in spring."),
        dict(kind="feed", w=[2, 4], why="Feed and water heavily in the warm season."),
    ]),
    dict(id="rhubarb", name="Rhubarb", area="Orchard", variety="Crimson Sunrise", tasks=[
        dict(kind="feed", w=[1, 3], why="Manure or compost heavily in late winter."),
        dict(kind="other", w=[2, 10], why="Pull (don't cut) stalks from spring to autumn; leave a third."),
        dict(kind="prune", w=[11, 13], why="Divide crowns every 4–5 years in winter."),
    ]),
    dict(id="comfrey", name="Comfrey", area="Backyard", tasks=[
        dict(kind="other", w=[2, 10], why="Cut 3–4 times a season for mulch and liquid feed."),
    ]),
    dict(id="feijoa", name="Feijoa", area="Orchard", tasks=[
        dict(kind="other", w=[6, 10], why="Guava moth: pheromone trap, pick up and bin fallen fruit daily."),
        dict(kind="prune", w=[10.5, 12], why="Prune after fruiting to open the canopy; birds pollinate so keep it airy."),
        dict(kind="feed", w=[1, 2.5], why="Compost and citrus food in spring."),
    ]),
    dict(id="fig", name="Fig", area="Backyard", variety="Brunoro Black", tasks=[
        dict(stage="Leaf fall", kind="copper", w=[10.5, 12], why="At leaf fall: rust."),
        dict(kind="prune", w=[11, 13], why="Prune while dormant; figs fruit on new wood."),
        dict(kind="other", w=[6, 9], why="Net against birds as fruit colours."),
    ]),
    dict(id="passionfruit", name="Passionfruit", area="Backyard", night=2, tasks=[
        dict(kind="prune", w=[1.5, 3], why="Prune hard in early spring (after frost risk): fruit comes on new growth. Cut laterals back to 2–3 buds."),
        dict(kind="feed", w=[1.5, 3], why="Citrus food in spring, again in Jan. Hungry vine, shallow roots: mulch."),
        dict(kind="feed", w=[6, 7.5], why="Second feed mid-summer."),
        dict(kind="other", w=[10, 13], why="Frost cloth on young vines on cold nights. Replace the vine every 5–7 years."),
    ]),
    dict(id="grape", name="Grapes", area="Backyard", tasks=[
        dict(kind="prune", w=[11, 13], why="Winter prune while fully dormant: spur or cane prune back to the framework."),
        dict(kind="oil", w=[11, 13], why="Winter oil with lime sulphur: mealybug, mites, powdery mildew overwintering."),
        dict(stage="Bud burst", kind="copper", w=[1.5, 3], why="Bud burst: downy mildew. Repeat with sulphur or a fungicide through flowering if wet."),
        dict(kind="other", w=[5.5, 7], why="Net against birds as bunches colour. Thin leaves around bunches for air."),
    ]),
    dict(id="pomegranate", name="Pomegranate", area="Orchard", tasks=[
        dict(kind="prune", w=[11, 13], why="Winter prune suckers and crossing wood; fruits on short spurs of 2–3 year wood."),
        dict(kind="feed", w=[1.5, 3], why="Light feed in spring. Too much nitrogen and it won't fruit."),
        dict(kind="other", w=[8, 10], why="Pick when the skin turns from round to slightly angular and sounds metallic when tapped; they split if left in rain."),
    ]),
    dict(id="chilean_guava", name="Chilean guava", area="Orchard", tasks=[
        dict(kind="prune", w=[11, 13], why="Light shape after harvest; it makes a good hedge."),
        dict(kind="feed", w=[1.5, 3], why="Acid feed (camellia / blueberry food) in spring."),
        dict(kind="other", w=[9, 11.5], why="Harvest the small red berries Apr–Jun; smell is the cue."),
    ]),
    dict(id="pink_guava", name="Pink guava", area="Greenhouse", night=8, shelter=True, tasks=[
        dict(kind="feed", w=[2, 3.5], why="Feed in spring as it starts growing, and again mid-summer."),
        dict(kind="prune", w=[2, 3.5], why="Prune in spring to keep it compact; fruit on new growth."),
        dict(kind="other", w=[8, 11], why="Fruit ripens autumn into winter. Guava moth loves it: trap and clear fallen fruit."),
    ]),
    dict(id="blueberry", name="Blueberries", area="Orchard", variety="Blast, Tasty Magic, Blue Magic", tasks=[
        dict(kind="feed", w=[1.5, 3], why="Acid fertiliser (blueberry / camellia) in spring. Mulch with pine needles or bark. Rainwater if you can."),
        dict(kind="prune", w=[11, 13], why="Winter: remove oldest canes at the base, keep 6–8 strong ones."),
        dict(kind="other", w=[4.5, 8], why="Net against birds from first colour."),
    ]),
    dict(id="babaco", name="Babaco", area="Office trays", night=8, shelter=True, tasks=[
        dict(kind="feed", w=[2, 4], why="Feed in spring; heavy feeder, likes potash for fruit."),
        dict(kind="other", w=[10, 13], why="Keep above 5° and on the dry side in winter; roots rot in cold wet soil."),
        dict(kind="prune", w=[1.5, 3], why="Cut back to a single stem after fruiting (year 2–3) to renew."),
    ]),
    dict(id="mountain_pawpaw", name="Mountain pawpaw", area="Greenhouse", night=8, shelter=True, tasks=[
        dict(kind="prune", w=[1.5, 3], why="Cut back tall stems in spring to keep fruit reachable; it reshoots from below."),
        dict(kind="feed", w=[2, 4], why="Feed in spring, again mid-summer."),
        dict(kind="other", w=[10, 13], why="Keep above 5° and fairly dry in winter."),
        dict(kind="other", w=[4, 7], why="Needs male and female (or a hermaphrodite) to fruit; check the flowers."),
    ]),
    dict(id="banana_cavendish", name="Banana · Dwarf Cavendish", area="Backyard", night=5, tasks=[
        dict(kind="feed", w=[2, 4], why="Heavy feeder: compost, manure and potash every month through the warm season."),
        dict(kind="feed", w=[5, 8], why="Keep feeding and watering while it is hot. Mulch deep."),
        dict(kind="prune", w=[2, 4], why="Remove all but one or two suckers per mat so the mother plant fruits. Cut the mother down after it fruits."),
        dict(kind="other", w=[10, 13], why="Wrap the stem or keep sheltered on frosty nights; leaves burn below about 5°. Expect no fruit until a stem has had ~18 warm months."),
    ]),
    dict(id="banana_misi_luki", name="Banana · Misi Luki", area="Backyard", night=5, tasks=[
        dict(kind="feed", w=[2, 4], why="Compost, manure and potash monthly in the warm season. Misi Luki is the cold-hardiest of the three."),
        dict(kind="feed", w=[5, 8], why="Keep feeding and watering while it is hot."),
        dict(kind="prune", w=[2, 4], why="Thin suckers to one or two followers."),
        dict(kind="other", w=[10, 13], why="Shelter from frost and wind. Expect fruit once a stem has been through two summers."),
    ]),
    dict(id="banana_asian", name="Banana · Asian", area="Backyard", night=5, tasks=[
        dict(kind="feed", w=[2, 4], why="Compost, manure and potash monthly in the warm season."),
        dict(kind="feed", w=[5, 8], why="Keep feeding and watering while it is hot."),
        dict(kind="prune", w=[2, 4], why="Thin suckers to one or two followers."),
        dict(kind="other", w=[10, 13], why="Shelter from frost and wind."),
    ]),
    dict(id="mulberry", name="Mulberry", area="Grove", tasks=[
        dict(kind="prune", w=[11, 13], why="Winter prune for shape and height; it bleeds if pruned in spring."),
        dict(kind="feed", w=[1.5, 3], why="Compost in spring. Not fussy."),
        dict(kind="other", w=[4.5, 7], why="Fruit Nov–Jan; shake onto a sheet. Birds take the rest."),
    ]),
    dict(id="pineapple", name="Pineapple", area="Greenhouse", night=12, shelter=True, tasks=[
        dict(kind="feed", w=[3, 8], why="Weak liquid feed monthly through the warm months, some into the leaf cup."),
        dict(kind="other", w=[10, 13], why="Keep dry and above 10° in winter. 2–3 years from a rooted top to fruit."),
    ]),
    dict(id="persimmon", name="Persimmon", area="Orchard", tasks=[
        dict(stage="Leaf fall", kind="copper", w=[10.5, 12], why="At leaf fall."),
        dict(kind="oil", w=[11, 13], why="Winter oil: mealybug and scale."),
        dict(kind="prune", w=[11, 13], why="Light winter prune; fruits on new wood from one-year shoots."),
        dict(kind="feed", w=[1, 2.5], why="Feed in spring, lightly. Too much nitrogen drops fruit."),
    ]),
    dict(id="cherimoya", name="Cherimoya", area="Greenhouse", night=5, shelter=True, tasks=[
        dict(kind="other", w=[4, 7], why="Hand pollinate in the evening: collect pollen from male-stage flowers, brush into female-stage ones."),
        dict(kind="other", w=[10, 13], why="Frost cloth on cold nights; young trees especially."),
        dict(kind="prune", w=[1.5, 3], why="Prune at leaf drop in spring, before new growth."),
        dict(kind="feed", w=[2, 3.5], why="Feed in spring as growth starts."),
    ]),
    dict(id="sapote", name="White sapote", area="Orchard", night=2, tasks=[
        dict(kind="other", w=[10, 13], why="Frost cloth on cold nights."),
        dict(kind="feed", w=[1.5, 3], why="Feed in spring."),
        dict(kind="prune", w=[1.5, 3], why="Prune after harvest to keep it reachable."),
    ]),
]

# Flowers for cutting and the beds. harv = flowering window.
FLOWERS = [
    dict(id="dahlia", name="Dahlia", where="direct", sow=[3, 5], harv=[6, 11], night=5, soil=15, colour="#d94f7a",
         tip="Plant tubers Oct–Nov once frosts are done, stake first. Pinch at 30 cm for more stems. Lift or mulch heavily in winter; divide in Aug."),
    dict(id="nigella", name="Nigella", where="direct", sow=[8, 11, 1, 4], harv=[3, 7], night=0, soil=10, colour="#7b8fd4",
         tip="Love-in-a-mist. Sow where it flowers, autumn or spring; it self-seeds. Dry the seed pods."),
    dict(id="sweet_pea", name="Sweet pea", where="direct", sow=[8, 11, 0, 2], harv=[2, 6], night=0, soil=10, colour="#c47fc0",
         tip="Sow in autumn for the best plants. Pick every day or they stop."),
    dict(id="cosmos", name="Cosmos", where="either", sow=[2, 6], out=[3.5, 7], harv=[5, 10], night=5, soil=18, colour="#e78bb0",
         tip="Easy. Deadhead and it goes till the frost. Second sowing in Dec."),
    dict(id="zinnia", name="Zinnia", where="either", sow=[3, 6], out=[4, 7], harv=[5.5, 10], night=8, soil=20, colour="#e8663d",
         tip="Hates cold and root disturbance: sow direct or in paper pots. Cut deep for long stems."),
    dict(id="sunflower", name="Sunflower", where="direct", sow=[3, 6.5], harv=[5.5, 9.5], night=5, soil=15, colour="#e9b531",
         tip="Sow every 3 weeks. Branching types for cutting. Leave the last heads for the birds."),
    dict(id="cornflower", name="Cornflower", where="direct", sow=[8, 11, 1, 4], harv=[3, 7], night=0, soil=10, colour="#4f74c9",
         tip="Autumn sowing gives bigger plants. Self-seeds."),
    dict(id="calendula", name="Calendula", where="direct", sow=[1, 5, 7, 11], harv=[0, 12], night=0, soil=12, colour="#f0a030",
         tip="Flowers nearly all year here. Edible petals, good for the bees. Deadhead."),
    dict(id="poppy", name="Poppy (Iceland / Shirley)", where="direct", sow=[8, 11, 1, 3], harv=[2, 6], night=0, soil=10, colour="#e35d5d",
         tip="Surface sow, needs light. Sear the cut stems in boiling water."),
    dict(id="larkspur", name="Larkspur", where="direct", sow=[8, 11], harv=[3, 6], night=0, soil=10, colour="#6d6fd1",
         tip="Chill seed in the fridge for a week first. Autumn sow only."),
    dict(id="snapdragon", name="Snapdragon", where="inside", sow=[7, 10, 1, 3], out=[9, 12, 2, 5], harv=[2, 7], night=0, soil=18, colour="#e58fa8",
         tip="Tiny seed, surface sow. Pinch once. Cut when the bottom third is open."),
    dict(id="stock", name="Stock", where="inside", sow=[7, 10], out=[9, 12], harv=[1, 5], night=0, soil=15, colour="#c9a0dc",
         tip="Winter and spring scent. Single-stem types for cutting."),
    dict(id="ranunculus", name="Ranunculus", where="direct", sow=[8, 11], harv=[1, 5], night=0, soil=10, colour="#f28c8c",
         tip="Soak corms 3 hours, plant claws down in autumn. Lift and dry after the foliage yellows."),
    dict(id="anemone", name="Anemone", where="direct", sow=[8, 11], harv=[1, 5], night=0, soil=10, colour="#8a4fd1",
         tip="Soak corms overnight, plant autumn. Pick when the bud is coloured but still closed."),
    dict(id="gladiolus", name="Gladiolus", where="direct", sow=[2, 6], harv=[5, 9], night=5, soil=15, colour="#e36aa8",
         tip="Plant corms every 2 weeks Sep–Dec for a long run. Stake. Thrips are the pest."),
    dict(id="lily", name="Lily", where="direct", sow=[0, 3, 10, 12], harv=[5, 8], night=0, soil=10, colour="#f0b3c8",
         tip="Plant bulbs deep in autumn or late winter. Leave the stem to die back to feed the bulb."),
    dict(id="freesia", name="Freesia", where="direct", sow=[8, 11], harv=[1, 4], night=0, soil=10, colour="#f3d35f",
         tip="Plant corms in autumn. Scented spring cut flower. Naturalises."),
    dict(id="tulip", name="Tulip", where="direct", sow=[10, 12], harv=[2, 4], night=0, soil=10, colour="#d9405e",
         tip="Chill bulbs 6 weeks in the fridge first in Auckland. Treat as annual."),
    dict(id="daffodil", name="Daffodil", where="direct", sow=[8, 11], harv=[0.5, 3], night=0, soil=10, colour="#f2c94c",
         tip="Plant Mar–May. Leave leaves for 6 weeks after flowering."),
    dict(id="nasturtium", name="Nasturtium", where="direct", sow=[2, 6, 8, 10], harv=[0, 12], night=2, soil=15, colour="#f08a24",
         tip="Poor soil, more flowers. Edible, and a trap crop for aphids."),
    dict(id="marigold", name="Marigold (French)", where="either", sow=[2, 6], out=[3.5, 7], harv=[4, 10], night=5, soil=18, colour="#f5a623",
         tip="Companion plant around tomatoes. Deadhead."),
    dict(id="lavender", name="Lavender", where="inside", sow=[1, 4], out=[2, 6], harv=[4, 8], night=0, soil=18, colour="#9b86d6",
         tip="Buy plants or take cuttings in autumn. Prune by a third after flowering, never into old wood."),
    dict(id="hydrangea", name="Hydrangea", where="direct", sow=[11, 14], harv=[5, 9], night=0, soil=10, colour="#8fb2e6",
         tip="Prune in winter to a pair of fat buds. Blue in acid soil, pink in lime."),
    dict(id="rose", name="Rose", where="direct", sow=[11, 14], harv=[3, 10], night=0, soil=10, colour="#d9436d",
         tip="Winter prune (July). Copper and oil in winter for black spot and scale; feed Sep and Jan."),
    dict(id="echinacea", name="Echinacea", where="inside", sow=[1, 4], out=[3, 6], harv=[5, 10], night=0, soil=18, colour="#d77aa6",
         tip="Perennial, flowers from year two. Leave seed heads for the goldfinches."),
    dict(id="lupin", name="Lupin", where="direct", sow=[8, 12], harv=[2, 5], night=0, soil=10, colour="#6f7fd8",
         tip="Sow in autumn. Doubles as green manure: dig in before it seeds, or let it flower for the bees."),
    dict(id="scabiosa", name="Scabiosa", where="inside", sow=[1, 4, 7, 10], out=[3, 6, 8, 11], harv=[3, 10], night=0, soil=18, colour="#a6a3dc",
         tip="Pincushion flower. Long vase life. Cut when half open."),
    dict(id="strawflower", name="Strawflower", where="inside", sow=[2, 5], out=[3.5, 6], harv=[5, 10], night=5, soil=20, colour="#f0a35e",
         tip="Cut before the centre opens and hang to dry; keeps for a year."),
    dict(id="statice", name="Statice", where="inside", sow=[1, 4], out=[3, 6], harv=[5, 9], night=0, soil=18, colour="#7f6fd0",
         tip="Everlasting. Cut when fully coloured and dry upside down."),
]

# What kind of plant each vegetable-tab entry is, for the second filter row.
# Anything not listed is an annual vegetable.
GROUPS = {
    "herb": ["basil", "parsley", "coriander", "lemongrass", "thyme", "oregano", "mint", "spearmint", "chives", "sage"],
    "berry": ["strawberry", "alpine_strawberry_red", "alpine_strawberry_white", "raspberry", "blackberry", "goji"],
    "perennial": ["asparagus", "walking_onion", "myoga", "jerusalem_artichoke", "mashua", "yam", "turmeric"],
}

# Trees tab: everything not listed here is a tree.
TREE_PERENNIALS = ["passionfruit", "grape", "chilean_guava", "blueberry", "banana_cavendish", "banana_misi_luki",
                   "banana_asian", "pineapple", "pepino", "ginger", "cape_gooseberry", "sugar_cane", "rhubarb", "comfrey"]

AREAS_DEFAULT = ["Big", "Middle", "L", "Backyard", "Orchard", "Grove"]
INSIDE_AREAS = ["Office trays", "Heat pad", "Greenhouse"]

EVENT_TYPES = {
    "sow": "Sowed",
    "out": "Planted out",
    "harv": "Harvest",
    "feed": "Fed",
    "issue": "Problem",
    "note": "Note",
    "spray": "Sprayed",
    "prune": "Pruned",
    "review": "Season review",
    "move": "Moved",
    "stage": "Stage",
    "todo": "To do",
    "done": "Done",
}

STAGES = ["Bud swell", "Bud burst", "New growth", "Flowering", "Petal fall", "Fruit set", "Fruit colouring", "Ripe", "Leaf fall", "Dormant"]


def in_window(m, w):
    for i in range(0, len(w), 2):
        if w[i] <= m < w[i + 1]:
            return True
    return False


def window_start(m, w):
    """Start of the window that contains m, or None."""
    for i in range(0, len(w), 2):
        if w[i] <= m < w[i + 1]:
            return w[i]
    return None
