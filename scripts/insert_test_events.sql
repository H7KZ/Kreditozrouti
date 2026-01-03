-- SQL Insert Script for Test Event: "Obhajoba"
-- Event Date: January 6, 2026, 2:00 PM - 3:00 PM
--
-- Run this in your MySQL database (e.g., via phpMyAdmin or mysql CLI)
-- Database: diar-4fis
-- Table: 4fis_events

INSERT INTO `4fis_events` (
    `id`,
    `created_at`,
    `updated_at`,
    `title`,
    `subtitle`,
    `datetime`,
    `image_src`,
    `image_alt`,
    `description`,
    `place`,
    `author`,
    `language`,
    `registration_from`,
    `registration_url`,
    `substitute_url`
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001',                    -- id (UUID)
    NOW(),                                                      -- created_at
    NOW(),                                                      -- updated_at
    'Obhajoba',                                                 -- title
    'Semestrální projekt',                                      -- subtitle
    '2026-01-06 14:00:00',                                      -- datetime (2 PM)
    NULL,                                                       -- image_src
    NULL,                                                       -- image_alt
    'Obhajoba semestrálního projektu Diář Fisáka. Prezentace funkcionalit a demonstrace aplikace.',  -- description
    'NB 350',                                                   -- place
    'Tým Diář Fisáka',                                          -- author
    'cs',                                                       -- language
    NULL,                                                       -- registration_from
    NULL,                                                       -- registration_url
    NULL                                                        -- substitute_url
);

-- Optional: Add a few more test events for better calendar visualization

INSERT INTO `4fis_events` (
    `id`,
    `created_at`,
    `updated_at`,
    `title`,
    `subtitle`,
    `datetime`,
    `description`,
    `place`,
    `author`,
    `language`
) VALUES
(
    '550e8400-e29b-41d4-a716-446655440002',
    NOW(),
    NOW(),
    'Studijní konzultace',
    'Konzultační hodiny',
    '2026-01-08 10:00:00',
    'Konzultace k projektům a závěrečným pracím',
    'RB 202',
    'Vyučující',
    'cs'
),
(
    '550e8400-e29b-41d4-a716-446655440003',
    NOW(),
    NOW(),
    'Hackathon 4FIS',
    '24hodinový programovací maraton',
    '2026-01-10 09:00:00',
    'Tým se sejde na celý den, aby dotáhl projekt do finální podoby',
    'Místnost 404 (online)',
    'Organizátoři',
    'cs'
),
(
    '550e8400-e29b-41d4-a716-446655440004',
    NOW(),
    NOW(),
    'Code Review',
    'Týmová revize kódu',
    '2026-01-15 16:00:00',
    'Společná kontrola kvality kódu, refaktoring a optimalizace',
    'Discord',
    'Vedoucí týmu',
    'cs'
);

-- Verify the insert
SELECT * FROM `4fis_events` ORDER BY `datetime` ASC;

