require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const LEAGUE_ID = 'd6e55507-6eae-4d94-978c-47c6c30a36f1';
const SEASON_ID = '30ee2c0b-5981-4df4-b0cc-d7cae05b9e37'; // 2026 Winter Thursdays
const DAY_OF_WEEK = 4; // Thursday

const VENUES = [
  {
    name: 'Western Fair - Chick',
    address: 'Western Fair District',
    city: 'London',
    state_province: 'Ontario',
    number_of_rinks: 1,
    slot: {
      start_time: '22:15',
      end_time: '23:15',
      max_games: 1,
      notes: 'Winter Thursdays recurring slot from 2026 winter schedule',
    },
  },
  {
    name: 'Western Fair - Clothiers',
    address: 'Western Fair District',
    city: 'London',
    state_province: 'Ontario',
    number_of_rinks: 1,
    slot: {
      start_time: '22:30',
      end_time: '23:30',
      max_games: 1,
      notes: 'Winter Thursdays recurring slot from 2026 winter schedule',
    },
  },
];

(async () => {
  const createdVenueIds = [];
  const createdAvailabilityIds = [];

  for (const venue of VENUES) {
    let venueId;
    const { data: existingVenue, error: venueLookupError } = await supabase
      .from('venues')
      .select('id, name')
      .eq('league_id', LEAGUE_ID)
      .eq('name', venue.name)
      .maybeSingle();
    if (venueLookupError) throw venueLookupError;

    if (existingVenue?.id) {
      venueId = existingVenue.id;
      const { error: updateVenueError } = await supabase
        .from('venues')
        .update({
          address: venue.address,
          city: venue.city,
          state_province: venue.state_province,
          number_of_rinks: venue.number_of_rinks,
        })
        .eq('id', venueId);
      if (updateVenueError) throw updateVenueError;
    } else {
      const { data: insertedVenue, error: insertVenueError } = await supabase
        .from('venues')
        .insert({
          league_id: LEAGUE_ID,
          name: venue.name,
          address: venue.address,
          city: venue.city,
          state_province: venue.state_province,
          number_of_rinks: venue.number_of_rinks,
        })
        .select('id')
        .single();
      if (insertVenueError) throw insertVenueError;
      venueId = insertedVenue.id;
      createdVenueIds.push(venueId);
    }

    const { data: existingSlots, error: slotLookupError } = await supabase
      .from('venue_availability')
      .select('id')
      .eq('league_id', LEAGUE_ID)
      .eq('venue_id', venueId)
      .eq('season_id', SEASON_ID)
      .eq('day_of_week', DAY_OF_WEEK);
    if (slotLookupError) throw slotLookupError;

    if ((existingSlots || []).length > 0) {
      const ids = existingSlots.map((slot) => slot.id);
      const { error: deleteSlotsError } = await supabase
        .from('venue_availability')
        .delete()
        .in('id', ids);
      if (deleteSlotsError) throw deleteSlotsError;
    }

    const { data: insertedSlot, error: insertSlotError } = await supabase
      .from('venue_availability')
      .insert({
        league_id: LEAGUE_ID,
        venue_id: venueId,
        season_id: SEASON_ID,
        day_of_week: DAY_OF_WEEK,
        start_time: venue.slot.start_time,
        end_time: venue.slot.end_time,
        is_available: true,
        max_games: venue.slot.max_games,
        notes: venue.slot.notes,
        created_by: null,
      })
      .select('id')
      .single();
    if (insertSlotError) throw insertSlotError;
    createdAvailabilityIds.push(insertedSlot.id);
  }

  const { data: finalVenues, error: finalVenuesError } = await supabase
    .from('venues')
    .select('id, name, address, city, state_province, number_of_rinks')
    .eq('league_id', LEAGUE_ID)
    .order('name');
  if (finalVenuesError) throw finalVenuesError;

  const { data: finalAvailability, error: finalAvailabilityError } = await supabase
    .from('venue_availability')
    .select('id, venue_id, season_id, day_of_week, start_time, end_time, max_games, notes')
    .eq('league_id', LEAGUE_ID)
    .eq('season_id', SEASON_ID)
    .order('start_time');
  if (finalAvailabilityError) throw finalAvailabilityError;

  console.log(JSON.stringify({
    status: 'ok',
    createdVenueIds,
    createdAvailabilityIds,
    venues: finalVenues,
    availability: finalAvailability,
  }, null, 2));
})().catch((error) => {
  console.error(JSON.stringify({ status: 'error', error }, null, 2));
  process.exit(1);
});
