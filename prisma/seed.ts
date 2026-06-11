// Seeds the plain-SQLite fallback database (`npm run db:push && npm run db:seed`).
// The D1 path needs no seeding — the app creates the author profile on first run.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.author.findFirst();
  const author =
    existing ??
    (await prisma.author.create({
      data: { name: "Author", settings: { create: {} } },
    }));

  if (!(await prisma.settings.findUnique({ where: { authorId: author.id } }))) {
    await prisma.settings.create({ data: { authorId: author.id } });
  }

  const count = await prisma.project.count();
  if (count > 0) {
    console.log("Seed: projects already exist, skipping sample.");
    return;
  }

  // A sample blueprint-stage project so the studio isn't empty on first run.
  const project = await prisma.project.create({
    data: {
      authorId: author.id,
      title: "The Quiet Tide",
      idea: "A grief-stricken marine biologist returns to her coastal hometown to scatter her mother's ashes and uncovers a letter that rewrites everything she believed about her family.",
      theme: "Grief, belonging, and the things the sea keeps",
      genre: "Literary fiction",
      kind: "fiction",
      audience: "Adult readers of book-club literary fiction",
      tone: "Calm & reflective",
      style: "Lyrical, image-rich, close third person",
      readingLevel: "General adult",
      bookType: "Novel",
      chapterCount: 5,
      minWords: 1500,
      maxWords: 3000,
      estTotalWords: 11250,
      narrativeStyle: "Close third, lyrical",
      pov: "Third person limited",
      publishFormat: "Ebook + Print",
      recommendedTitle: "The Quiet Tide",
      subtitle: "A novel of the things the sea keeps",
      positioning: "A luminous, slow-burning novel about coming home to grief and finding the truth beneath the surface.",
      readerPromise: "Readers will be carried through a tender mystery of family and memory, and finish feeling the quiet catharsis of forgiveness.",
      status: "blueprint",
      coverAccent: "muse",
      blueprintJson: JSON.stringify({
        titleOptions: ["The Quiet Tide", "What the Sea Keeps", "Saltwater Letters", "The Undertow"],
        recommendedTitle: "The Quiet Tide",
        recommendedSubtitle: "A novel of the things the sea keeps",
        positioning: "A luminous, slow-burning novel about coming home to grief.",
        readerPromise: "A tender mystery of family and memory ending in quiet catharsis.",
        readerJourney: "From numb avoidance to open-hearted acceptance.",
        styleGuide: ["Favor concrete sensory imagery", "Short paragraphs for emotional beats", "Let silence carry weight"],
        toneGuide: ["Reflective, never melodramatic", "Tender but unsentimental"],
        continuityGuide: ["Mara is 34", "Her mother died in spring", "The letter is dated 1989"],
        characters: [
          { name: "Mara Vance", role: "Protagonist", description: "A 34-year-old marine biologist, guarded and precise, undone by grief." },
          { name: "Eleanor Vance", role: "Mother (deceased)", description: "Present through memory and the letter; warmer than Mara remembers." },
        ],
        settings: [
          { name: "Harlow Cove", description: "A weather-worn fishing town on a grey northern coast." },
        ],
        keyConcepts: [],
        frontMatter: ["Title page", "Copyright", "Dedication", "Epigraph"],
        backMatter: ["Acknowledgments", "Book club questions", "About the author"],
      }),
      chapters: {
        create: [
          { order: 0, title: "Arrival", summary: "Mara returns to Harlow Cove with the ashes and the weight of everything unsaid.", minWords: 1500, maxWords: 3000 },
          { order: 1, title: "The Letter", summary: "Sorting her mother's house, Mara finds a sealed letter dated decades ago.", minWords: 1500, maxWords: 3000 },
          { order: 2, title: "The Quiet Tide", summary: "Mara walks the shore and confronts the first revelation the letter holds.", minWords: 1500, maxWords: 3000 },
          { order: 3, title: "Undertow", summary: "Old friends and old wounds resurface as the truth pulls harder.", minWords: 1500, maxWords: 3000 },
          { order: 4, title: "What the Sea Keeps", summary: "Mara scatters the ashes and finds an uneasy peace.", minWords: 1500, maxWords: 3000 },
        ],
      },
      memory: {
        create: [
          { kind: "premise", title: "Positioning", body: "A luminous, slow-burning novel about coming home to grief.", order: 0 },
          { kind: "reader-promise", title: "Reader promise", body: "A tender mystery ending in quiet catharsis.", order: 1 },
          { kind: "character", title: "Mara Vance", body: "34, marine biologist, guarded and precise, undone by grief.", order: 2 },
          { kind: "character", title: "Eleanor Vance", body: "Mara's late mother; present through memory and the letter.", order: 3 },
          { kind: "setting", title: "Harlow Cove", body: "A weather-worn fishing town on a grey northern coast.", order: 4 },
          { kind: "style-rule", title: "Imagery", body: "Favor concrete sensory imagery; let silence carry weight.", order: 5 },
          { kind: "fact", title: "Timeline", body: "Mara is 34; her mother died in spring; the letter is dated 1989.", order: 6 },
        ],
      },
    },
  });

  console.log(`Seed: created sample project "${project.title}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
