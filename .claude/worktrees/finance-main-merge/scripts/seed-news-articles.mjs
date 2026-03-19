/**
 * Seed sample news articles for all leagues
 * Usage: SUPABASE_DB_PASSWORD=yourpassword node scripts/seed-news-articles.mjs
 */
import pg from 'pg';
const { Client } = pg;

const DB_HOST = 'aws-1-us-east-1.pooler.supabase.com';
const DB_PORT = 6543;
const DB_NAME = 'postgres';
const DB_USER = 'postgres.ntplczcmhvfkijjxavdl';
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!DB_PASSWORD) {
  console.error('ERROR: SUPABASE_DB_PASSWORD env var is required.');
  process.exit(1);
}

const ARTICLES = [
  {
    title: 'Thunderbirds Clinch First Place After Dominant Win',
    slug: 'thunderbirds-clinch-first-place',
    excerpt: 'With a commanding 6-2 victory over the Rivals, the Thunderbirds have secured the top seed heading into the playoffs. Captain Mike Johnson led the charge with a hat trick.',
    content: 'In what has been a dominant season, the Thunderbirds cemented their first-place finish with an emphatic 6-2 win last Tuesday night. Captain Mike Johnson was the star of the show, recording his second hat trick of the season. "The boys played a complete game tonight," said Johnson. "We\'re peaking at the right time heading into playoffs." The team has now won 8 of their last 10 games.',
    type: 'news',
  },
  {
    title: 'Trade Deadline Recap: Who Made the Biggest Moves?',
    slug: 'trade-deadline-recap',
    excerpt: 'The trade deadline brought plenty of action. Here\'s a breakdown of the key moves that could shake up the playoff picture.',
    content: 'With the trade deadline now behind us, several teams made significant moves to bolster their rosters for the playoff push. The Wolves acquired veteran defenseman Chris Torres from the Ice Hawks in exchange for a draft pick and forward prospect. Meanwhile, the Eagles made a splash by adding sniper Alex Petrov, who brings 15 goals this season. These moves could dramatically alter the playoff landscape.',
    type: 'news',
  },
  {
    title: 'Rookie Sensation: Taylor Chen Named Player of the Month',
    slug: 'taylor-chen-player-of-month',
    excerpt: 'First-year player Taylor Chen has taken the league by storm, earning Player of the Month honors after a 12-point February.',
    content: 'Taylor Chen continues to defy expectations in their rookie season. The 22-year-old forward posted an incredible 12 points (5 goals, 7 assists) in February, earning unanimous Player of the Month honors. "I\'m just trying to contribute wherever I can," said the humble Chen. "My linemates make it easy." Chen now sits 4th in league scoring and is the frontrunner for Rookie of the Year.',
    type: 'news',
  },
  {
    title: 'Playoff Format Announced: New Best-of-5 Series',
    slug: 'playoff-format-announced',
    excerpt: 'League organizers have confirmed the playoff bracket format for this season, featuring an exciting best-of-5 series in every round.',
    content: 'In a change from previous seasons, the league has adopted a best-of-5 format for all playoff rounds. The decision was made based on player feedback and scheduling considerations. "We believe this format gives teams the best chance to compete while keeping the energy high," said league commissioner Dave Roberts. The playoffs are set to begin March 15th.',
    type: 'news',
  },
  {
    title: 'Weekend Roundup: Upsets and Overtime Thrillers',
    slug: 'weekend-roundup-upsets',
    excerpt: 'A wild weekend of hockey saw three overtime games and two major upsets. Catch up on all the action you may have missed.',
    content: 'What a weekend of hockey! Saturday night saw the last-place Coyotes stun the second-place Eagles 4-3 in overtime, while Sunday\'s doubleheader featured two nail-biters that went to extra time. The Wolves edged the Bears 3-2 in a shootout, and the Hawks topped the Panthers 5-4 on a goal with just 12 seconds remaining in OT. Check out the full scores and standings on our schedule page.',
    type: 'news',
  },
];

async function main() {
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to database');

  // Get all leagues
  const { rows: leagues } = await client.query('SELECT id, name FROM leagues');
  console.log(`Found ${leagues.length} leagues`);

  // Check if articles table has required columns
  const { rows: columns } = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'articles' AND table_schema = 'public'
    ORDER BY ordinal_position
  `);
  console.log('Articles columns:', columns.map(c => c.column_name).join(', '));

  let totalInserted = 0;

  for (const league of leagues) {
    // Check existing articles count
    const { rows: existing } = await client.query(
      'SELECT COUNT(*) as count FROM articles WHERE league_id = $1',
      [league.id]
    );

    if (parseInt(existing[0].count) > 0) {
      console.log(`  [SKIP] ${league.name} - already has ${existing[0].count} articles`);
      continue;
    }

    console.log(`  Inserting articles for ${league.name}...`);

    for (let i = 0; i < ARTICLES.length; i++) {
      const article = ARTICLES[i];
      const publishedAt = new Date();
      publishedAt.setDate(publishedAt.getDate() - i * 2); // Stagger dates

      await client.query(
        `INSERT INTO articles (league_id, title, slug, excerpt, content, type, published, published_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, $7, $7)
         ON CONFLICT DO NOTHING`,
        [
          league.id,
          article.title,
          article.slug,
          article.excerpt,
          article.content,
          article.type,
          publishedAt.toISOString(),
        ]
      );
      totalInserted++;
    }
  }

  console.log(`\nDone! Inserted ${totalInserted} articles across ${leagues.length} leagues`);

  await client.end();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
