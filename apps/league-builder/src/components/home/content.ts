export type HomeLocale = 'en' | 'fr';

export function getHomeLocale(locale: string): HomeLocale {
  return locale.startsWith('fr') ? 'fr' : 'en';
}

const HOME_COPY = {
  en: {
    brand: 'Beer League Hockey',
    hero: {
      eyebrow: 'The operating system for adult hockey leagues',
      headline: 'Run your league',
      headlineAccent: 'from registration to playoffs.',
      subheadline:
        'Launch a modern league website, collect registrations and payments, run schedules and scorekeeping, manage captains and game day, and migrate your history without stitching together five tools.',
      primaryCta: 'Start Your League',
      migrationCta: 'Plan Your Migration',
      demoCta: 'See a Live League',
      login: 'Log in',
      signup: 'Sign up',
      statusLabel: 'Live',
      proof: [
        'Migration center and assisted imports are live',
        'Website editor and public league sites ship together',
        'Captains can build and share game-day lineups',
        'Division-aware playoff brackets are built in',
      ],
    },
    proof: {
      eyebrow: 'Live now across the platform',
      headline: 'Everything leagues ask for after year one is already in the product.',
      subheadline:
        'This is not just a registration form with a template website. It is the public site, the commissioner dashboard, the captain workflow, and the game-night system.',
      cards: [
        {
          title: 'Historical migration support',
          body: 'Import teams, players, and schedules today. Use the migration center and assisted intake workflow for stats, records, news archives, and media.',
        },
        {
          title: 'Live website editing',
          body: 'Edit homepage content, sponsors, pages, galleries, standings, schedules, and news without waiting on a developer.',
        },
        {
          title: 'Registration and payments',
          body: 'Open registration, collect player payments, track league billing, and manage setup and migration work from one system.',
        },
        {
          title: 'Game day and playoffs',
          body: 'Run check-ins, scorekeeping, shareable captain lineups, and division-specific playoff brackets from the same data model.',
        },
      ],
      chips: ['Spreadsheets', 'Legacy websites', 'Payment chasing', 'Manual texts', 'Split systems'],
    },
    switchboard: {
      eyebrow: 'Why leagues switch',
      headline: 'Most leagues are not missing effort. They are missing a system.',
      subheadline:
        'BLH replaces the spreadsheet stack, the old website, the group chat confusion, and the yearly rebuild with one hockey-specific workflow.',
      lanes: [
        {
          title: 'Replace spreadsheet operations',
          body: 'Manage divisions, venues, schedules, captains, staff, scorekeepers, and registrations from one owner dashboard instead of scattered files.',
          replace: 'Venue sheets, roster tabs, scorekeeper notes',
        },
        {
          title: 'Replace the outdated public site',
          body: 'Your standings, schedules, stats, sponsors, pages, galleries, and articles live on a public site that updates automatically.',
          replace: 'Manual website updates and stale league pages',
        },
        {
          title: 'Keep the history that matters',
          body: 'Bring over past seasons, champions, records, articles, and photo archives through a guided migration flow instead of starting from zero.',
          replace: 'Starting fresh and losing years of league history',
        },
      ],
      migrationTitle: 'Migration made practical',
      migrationBody:
        'League owners get a simple intake flow inside the dashboard. BLH staff get a structured ops queue. Both sides can track what is being moved and what is still outstanding.',
      migrationSteps: [
        'Gather the exports, links, or old site you already have.',
        'Choose self-serve CSV imports or submit an assisted migration request.',
        'Launch with teams, schedules, records, news, and media accounted for.',
      ],
      migrationLabel: 'Assisted migration workflow',
      replaceLabel: 'Replace',
      replaceSubtitle: 'What BLH replaces',
      migrationFooter:
        'Owners submit the request. BLH tracks the work. Nobody has to guess what happens next.',
    },
    roles: {
      eyebrow: 'One platform across every role',
      headline: 'Commissioners, captains, scorekeepers, and players all use the same league system.',
      subheadline:
        'One data model powers the public site, owner dashboard, captain tools, and game-night workflow, so updates do not die in a second system.',
      cards: [
        {
          title: 'League owner',
          points: ['League dashboard', 'Registration and payments', 'Website editor', 'Migration center'],
        },
        {
          title: 'Captain',
          points: ['Roster and check-ins', 'Game-day lineup studio', 'Payment reminders', 'Team management'],
        },
        {
          title: 'Scorekeeper',
          points: ['Pre-game check-in', 'Live scoring', 'Penalties and goalies', 'Game completion flow'],
        },
        {
          title: 'Players and fans',
          points: ['Schedules and standings', 'Player stats and profiles', 'Published lineups', 'News and galleries'],
        },
      ],
    },
    operations: {
      eyebrow: 'Website and operations together',
      headline: 'The public league site is not separate from league operations.',
      siteLabel: 'League Site',
      sitePreviewLabel: 'Homepage editor preview',
      liveEditingLabel: 'Live editing',
      websiteTitle: 'A league site that looks current',
      websiteBody:
        'Edit the homepage, publish articles, manage sponsors, add custom pages, run galleries, and keep standings and schedules synced automatically.',
      websiteBullets: ['Live website editor', 'Sponsors, pages, news, galleries', 'Stats, standings, schedules, playoffs'],
      opsTitle: 'A commissioner command deck that stays organized',
      opsBody:
        'Build seasons, teams, divisions, and schedules. Manage scorekeepers and settings. Track billing, migration, and launch readiness without hopping tools.',
      opsLabel: 'Operations',
      opsSyncNote: 'Public site and internal operations stay in sync.',
      opsBullets: ['Teams, divisions, schedules', 'Scorekeepers, venues, settings', 'Owner view, admin ops, migration queue'],
      gamedayTitle: 'Game night still matters',
      gamedayBody:
        'Captains can turn RSVPs into a rink-based lineup board, publish it, and share it to team chats. Players can open the current game and see the published lineup.',
      gamedayBullets: ['Captain check-ins', 'Shareable lineup images', 'Division playoff brackets'],
    },
    pricing: {
      eyebrow: 'Pricing built for league size',
      headline: 'Simple tiers for new leagues, growing leagues, and large operators.',
      subheadline:
        'Use the platform as an all-in-one system, then add setup and migration work only when you need it.',
      highlightedBadge: 'Most common',
      sidebarLabel: 'Scope and rollout',
      sidebarHeadline: 'Pricing should match how much league work is actually required.',
      tiers: [
        {
          name: 'Small',
          range: 'Under 10 teams and under $50K in registration fees',
          price: '$299/season',
          detail: 'No monthly floor. Best for smaller community leagues.',
        },
        {
          name: 'Standard',
          range: '10–99 teams or $50K–$499K in registration fees',
          price: '3.5% of gross registration fees',
          detail: '$250 monthly floor with an annual agreement.',
        },
        {
          name: 'Large',
          range: '100–499 teams',
          price: '3.25% of gross registration fees',
          detail: '$500 monthly floor with a two-year agreement.',
        },
        {
          name: 'Enterprise',
          range: '500+ teams or $2M+ in registration fees',
          price: '2.75%–3.0% negotiated',
          detail: 'Multi-year structure for large operators and associations.',
        },
      ],
      callouts: [
        {
          title: 'Setup is scoped up front',
          body: 'If you need hands-on launch help, branding, or data cleanup, that work is quoted clearly instead of hidden inside vague software pricing.',
        },
        {
          title: 'Migration is available when you need it',
          body: 'Existing leagues can start with CSV imports or use the in-app migration intake for historical records, articles, and media archives.',
        },
        {
          title: 'Payments can fit your model',
          body: 'League fees can be passed to players or absorbed by the league depending on how you want to operate registration.',
        },
      ],
      primaryCta: 'Start Your League',
      secondaryCta: 'Plan Your Migration',
      footer: 'Need a quote for a larger rollout? Use the migration path and we can scope setup, archive work, and launch timing together.',
    },
    finalCta: {
      headline: 'Starting fresh or moving an established league?',
      subheadline:
        'Use BLH as the league website, the operations dashboard, and the game-day system instead of adding another disconnected tool to the pile.',
      primaryTitle: 'Launching a new league',
      primaryBody: 'Create the league, build the public site, and start registrations in one workflow.',
      primaryCta: 'Start Your League',
      secondaryTitle: 'Migrating an existing league',
      secondaryBody: 'Bring over teams, players, schedules, records, and archives with a guided migration path.',
      secondaryCta: 'Plan Your Migration',
    },
    footer: {
      tagline: 'Run the whole league from one system.',
      productTitle: 'Product',
      productLinks: [
        { label: 'Start Your League', href: '/signup', external: false },
        { label: 'Log in', href: '/login', external: false },
        { label: 'Live League Demo', href: 'https://demo.beerleaguehockey.ca', external: true },
        { label: 'Plan a Migration', href: 'mailto:hello@beerleaguehockey.ca?subject=League%20Migration', external: true },
      ],
      resourcesTitle: 'Explore',
      resourceLinks: [
        { label: 'Migration', href: '#migration', external: false },
        { label: 'Operations', href: '#operations', external: false },
        { label: 'Pricing', href: '#pricing', external: false },
      ],
      legalTitle: 'Legal',
      privacyLabel: 'Privacy',
      termsLabel: 'Terms',
      rights: 'All rights reserved.',
      madeWith: 'Built for commissioners, captains, scorekeepers, and players.',
    },
  },
  fr: {
    brand: 'Beer League Hockey',
    hero: {
      eyebrow: 'Le systeme d exploitation pour les ligues de hockey adulte',
      headline: 'Gerez votre ligue',
      headlineAccent: 'de l inscription aux series.',
      subheadline:
        'Lancez un site de ligue moderne, collectez les inscriptions et paiements, gerez les horaires et le marquage, outillez les capitaines pour les jours de match, et migrez votre historique sans assembler cinq outils.',
      primaryCta: 'Lancer votre ligue',
      migrationCta: 'Planifier votre migration',
      demoCta: 'Voir une ligue en direct',
      login: 'Connexion',
      signup: 'S inscrire',
      statusLabel: 'En ligne',
      proof: [
        'Le centre de migration et les imports assistes sont deja en ligne',
        'L editeur de site et le site public sont livres ensemble',
        'Les capitaines peuvent creer et partager les alignements de jour de match',
        'Les tableaux de series par division sont integres',
      ],
    },
    proof: {
      eyebrow: 'Disponible maintenant sur la plateforme',
      headline: 'Tout ce que les ligues demandent apres la premiere saison existe deja dans le produit.',
      subheadline:
        'Ce n est pas seulement un formulaire d inscription avec un site modele. C est le site public, le tableau de bord du commissaire, le flux capitaine et le systeme de soir de match.',
      cards: [
        {
          title: 'Migration historique',
          body: 'Importez les equipes, joueurs et calendriers maintenant. Utilisez le centre de migration et le formulaire assiste pour les statistiques, records, archives d articles et medias.',
        },
        {
          title: 'Edition du site en direct',
          body: 'Modifiez la page d accueil, les commanditaires, les pages, les galeries, les classements, les horaires et les nouvelles sans attendre un developpeur.',
        },
        {
          title: 'Inscriptions et paiements',
          body: 'Ouvrez les inscriptions, collectez les paiements des joueurs, suivez la facturation de la ligue et gerez la mise en place et la migration dans le meme systeme.',
        },
        {
          title: 'Jour de match et series',
          body: 'Gerez les presences, le marquage, les alignements partageables et les tableaux de series par division a partir du meme modele de donnees.',
        },
      ],
      chips: ['Tableurs', 'Anciens sites', 'Relances de paiement', 'Textos manuels', 'Outils separes'],
    },
    switchboard: {
      eyebrow: 'Pourquoi les ligues changent',
      headline: 'La plupart des ligues ne manquent pas d effort. Elles manquent d un systeme.',
      subheadline:
        'BLH remplace la pile de tableurs, l ancien site, la confusion des conversations de groupe et la reconstruction annuelle par un seul flux concu pour le hockey.',
      lanes: [
        {
          title: 'Remplacer les operations en tableur',
          body: 'Gerez divisions, arenas, horaires, capitaines, personnel, marqueurs et inscriptions depuis un seul tableau de bord au lieu de fichiers disperses.',
          replace: 'Feuilles d arenas, onglets d alignements, notes de marqueurs',
        },
        {
          title: 'Remplacer le site public depasse',
          body: 'Vos classements, horaires, statistiques, commanditaires, pages, galeries et articles vivent sur un site public qui se met a jour automatiquement.',
          replace: 'Mises a jour manuelles et pages de ligue perimees',
        },
        {
          title: 'Conserver l historique important',
          body: 'Importez les saisons passees, champions, records, articles et archives photo avec un flux de migration guide au lieu de repartir de zero.',
          replace: 'Recommencer a neuf et perdre des annees d historique',
        },
      ],
      migrationTitle: 'Une migration praticable',
      migrationBody:
        'Les proprietaires de ligue obtiennent un flux simple dans le tableau de bord. L equipe BLH obtient une file d operations structuree. Les deux cotes peuvent suivre ce qui est migre et ce qui reste a faire.',
      migrationSteps: [
        'Rassemblez les exports, liens ou ancien site que vous avez deja.',
        'Choisissez les imports CSV libres-service ou soumettez une demande de migration assistee.',
        'Lancez avec equipes, horaires, records, nouvelles et medias pris en compte.',
      ],
      migrationLabel: 'Flux de migration assistee',
      replaceLabel: 'Remplacer',
      replaceSubtitle: 'Ce que BLH remplace',
      migrationFooter:
        'Les proprietaires soumettent la demande. BLH suit le travail. Personne n a a deviner la suite.',
    },
    roles: {
      eyebrow: 'Une plateforme pour chaque role',
      headline: 'Commissaires, capitaines, marqueurs et joueurs utilisent le meme systeme de ligue.',
      subheadline:
        'Le meme modele de donnees alimente le site public, le tableau de bord, les outils capitaine et le flux de soir de match, donc les mises a jour ne meurent pas dans un second systeme.',
      cards: [
        {
          title: 'Proprietaire de ligue',
          points: ['Tableau de bord de ligue', 'Inscriptions et paiements', 'Editeur du site', 'Centre de migration'],
        },
        {
          title: 'Capitaine',
          points: ['Effectif et presences', 'Studio d alignement', 'Rappels de paiement', 'Gestion d equipe'],
        },
        {
          title: 'Marqueur',
          points: ['Verification avant match', 'Marquage en direct', 'Penalites et gardiens', 'Cloture du match'],
        },
        {
          title: 'Joueurs et visiteurs',
          points: ['Horaires et classements', 'Statistiques et profils', 'Alignements publies', 'Nouvelles et galeries'],
        },
      ],
    },
    operations: {
      eyebrow: 'Site web et operations ensemble',
      headline: 'Le site public de la ligue n est pas separe des operations.',
      siteLabel: 'Site de ligue',
      sitePreviewLabel: 'Apercu de l editeur d accueil',
      liveEditingLabel: 'Edition en direct',
      websiteTitle: 'Un site de ligue qui reste actuel',
      websiteBody:
        'Modifiez la page d accueil, publiez des articles, gerez les commanditaires, ajoutez des pages, animez des galeries et gardez les classements et horaires synchronises automatiquement.',
      websiteBullets: ['Editeur de site en direct', 'Commanditaires, pages, nouvelles, galeries', 'Stats, classements, horaires, series'],
      opsTitle: 'Un poste de commande pour commissaire qui reste organise',
      opsBody:
        'Construisez saisons, equipes, divisions et horaires. Gerez les marqueurs et reglages. Suivez la facturation, la migration et l etat de lancement sans changer d outil.',
      opsLabel: 'Operations',
      opsSyncNote: 'Le site public et les operations internes restent synchronises.',
      opsBullets: ['Equipes, divisions, horaires', 'Marqueurs, arenas, reglages', 'Vue proprietaire, ops admin, file de migration'],
      gamedayTitle: 'Le soir de match compte toujours',
      gamedayBody:
        'Les capitaines peuvent transformer les confirmations en tableau d alignement sur patinoire, le publier et le partager dans les conversations d equipe. Les joueurs ouvrent le match courant et voient l alignement publie.',
      gamedayBullets: ['Presences capitaine', 'Images d alignement partageables', 'Series par division'],
    },
    pricing: {
      eyebrow: 'Tarification adaptee a la taille de la ligue',
      headline: 'Des paliers simples pour les nouvelles ligues, celles qui grandissent et les grands operateurs.',
      subheadline:
        'Utilisez la plateforme comme systeme tout-en-un, puis ajoutez la mise en place et la migration seulement quand vous en avez besoin.',
      highlightedBadge: 'Le plus courant',
      sidebarLabel: 'Portee et deploiement',
      sidebarHeadline: 'La tarification doit correspondre au travail reel requis pour la ligue.',
      tiers: [
        {
          name: 'Petite',
          range: 'Moins de 10 equipes et moins de 50 k$ en inscriptions',
          price: '299 $ / saison',
          detail: 'Aucun minimum mensuel. Ideal pour les petites ligues communautaires.',
        },
        {
          name: 'Standard',
          range: '10 a 99 equipes ou 50 k$ a 499 k$ en inscriptions',
          price: '3,5 % des inscriptions brutes',
          detail: 'Minimum mensuel de 250 $ avec entente annuelle.',
        },
        {
          name: 'Grande',
          range: '100 a 499 equipes',
          price: '3,25 % des inscriptions brutes',
          detail: 'Minimum mensuel de 500 $ avec entente de deux ans.',
        },
        {
          name: 'Entreprise',
          range: '500+ equipes ou 2 M$+ en inscriptions',
          price: '2,75 % a 3,0 % negocie',
          detail: 'Structure pluriannuelle pour grands operateurs et associations.',
        },
      ],
      callouts: [
        {
          title: 'La mise en place est definie d avance',
          body: 'Si vous avez besoin d aide pratique pour le lancement, l image de marque ou le nettoyage des donnees, ce travail est chiffre clairement.',
        },
        {
          title: 'La migration est offerte au besoin',
          body: 'Les ligues existantes peuvent commencer avec les imports CSV ou utiliser le formulaire de migration pour les records, articles et archives medias.',
        },
        {
          title: 'Les paiements s adaptent a votre modele',
          body: 'Les frais peuvent etre refactures aux joueurs ou absorbes par la ligue selon votre fonctionnement.',
        },
      ],
      primaryCta: 'Lancer votre ligue',
      secondaryCta: 'Planifier votre migration',
      footer: 'Besoin d un devis pour un deploiement plus large? Utilisez le parcours de migration et nous pourrons cadrer la mise en place, les archives et le calendrier de lancement.',
    },
    finalCta: {
      headline: 'Vous lancez une nouvelle ligue ou vous deplacez une ligue deja etablie?',
      subheadline:
        'Utilisez BLH comme site web de ligue, tableau de bord des operations et systeme de soir de match au lieu d ajouter un autre outil deconnecte.',
      primaryTitle: 'Lancer une nouvelle ligue',
      primaryBody: 'Creez la ligue, construisez le site public et ouvrez les inscriptions dans le meme flux.',
      primaryCta: 'Lancer votre ligue',
      secondaryTitle: 'Migrer une ligue existante',
      secondaryBody: 'Importez equipes, joueurs, horaires, records et archives avec un parcours de migration guide.',
      secondaryCta: 'Planifier votre migration',
    },
    footer: {
      tagline: 'Gerez toute la ligue depuis un seul systeme.',
      productTitle: 'Produit',
      productLinks: [
        { label: 'Lancer votre ligue', href: '/signup', external: false },
        { label: 'Connexion', href: '/login', external: false },
        { label: 'Demo en direct', href: 'https://demo.beerleaguehockey.ca', external: true },
        { label: 'Planifier une migration', href: 'mailto:hello@beerleaguehockey.ca?subject=Migration%20de%20ligue', external: true },
      ],
      resourcesTitle: 'Explorer',
      resourceLinks: [
        { label: 'Migration', href: '#migration', external: false },
        { label: 'Operations', href: '#operations', external: false },
        { label: 'Tarification', href: '#pricing', external: false },
      ],
      legalTitle: 'Legal',
      privacyLabel: 'Confidentialite',
      termsLabel: 'Conditions',
      rights: 'Tous droits reserves.',
      madeWith: 'Concu pour les commissaires, capitaines, marqueurs et joueurs.',
    },
  },
} as const;

export function getHomeCopy(locale: string) {
  return HOME_COPY[getHomeLocale(locale)];
}
