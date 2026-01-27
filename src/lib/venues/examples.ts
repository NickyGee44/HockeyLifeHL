/**
 * Venue Management Examples
 *
 * Demonstrates how to use the venue management server actions
 * in different scenarios.
 */

import {
  createVenue,
  getAllVenues,
  getVenueById,
  updateVenue,
  deleteVenue,
  getVenuesWithStats,
  COMMON_AMENITIES,
} from './actions';

/**
 * Example 1: Create a basic venue
 */
export async function example1_CreateBasicVenue() {
  const formData = new FormData();
  formData.set('name', 'Community Ice Arena');
  formData.set('city', 'Toronto');
  formData.set('stateProvince', 'ON');
  formData.set('country', 'Canada');

  const result = await createVenue(formData);

  if (result.error) {
    console.error('Failed to create venue:', result.error);
    return null;
  }

  console.log('Venue created:', result.venue);
  return result.venue;
}

/**
 * Example 2: Create a fully detailed venue
 */
export async function example2_CreateDetailedVenue() {
  const formData = new FormData();

  // Basic information
  formData.set('name', 'Scotiabank Arena');
  formData.set('address', '40 Bay Street');
  formData.set('city', 'Toronto');
  formData.set('stateProvince', 'ON');
  formData.set('postalCode', 'M5J 2X2');
  formData.set('country', 'Canada');

  // Contact information
  formData.set('phone', '(416) 815-5500');
  formData.set('website', 'https://www.scotiabankarena.com');

  // Facility details
  formData.set('numberOfRinks', '1');
  formData.set('parkingInfo', 'Underground parking available. $25 flat rate. Enter via Bay Street entrance.');

  // Amenities (multiple values)
  formData.append('amenities', 'Locker Rooms');
  formData.append('amenities', 'Heated Locker Rooms');
  formData.append('amenities', 'Parking');
  formData.append('amenities', 'Concessions');
  formData.append('amenities', 'Pro Shop');
  formData.append('amenities', 'Restaurant/Bar');
  formData.append('amenities', 'WiFi');
  formData.append('amenities', 'Viewing Area');

  const result = await createVenue(formData);

  if (result.error) {
    console.error('Failed to create venue:', result.error);
    return null;
  }

  console.log('Detailed venue created:', result.venue);
  return result.venue;
}

/**
 * Example 3: Create venue with amenities as JSON
 */
export async function example3_CreateVenueWithJsonAmenities() {
  const formData = new FormData();
  formData.set('name', 'Twin Rinks Arena');
  formData.set('city', 'Calgary');
  formData.set('stateProvince', 'AB');
  formData.set('numberOfRinks', '2');

  // Amenities as JSON string (alternative to multiple form fields)
  const amenities = [
    'Locker Rooms',
    'Parking',
    'Concessions',
    'Skate Sharpening',
    'WiFi',
  ];
  formData.set('amenitiesJson', JSON.stringify(amenities));

  const result = await createVenue(formData);

  if (result.error) {
    console.error('Failed to create venue:', result.error);
    return null;
  }

  console.log('Venue with JSON amenities created:', result.venue);
  return result.venue;
}

/**
 * Example 4: List all venues
 */
export async function example4_ListAllVenues() {
  const { venues, error } = await getAllVenues();

  if (error) {
    console.error('Failed to fetch venues:', error);
    return [];
  }

  console.log(`Found ${venues.length} venues:`);
  venues.forEach((venue, index) => {
    console.log(`${index + 1}. ${venue.name} (${venue.city || 'Unknown city'})`);
    if (venue.amenities && venue.amenities.length > 0) {
      console.log(`   Amenities: ${venue.amenities.join(', ')}`);
    }
  });

  return venues;
}

/**
 * Example 5: Get single venue details
 */
export async function example5_GetVenueDetails(venueId: string) {
  const { venue, error } = await getVenueById(venueId);

  if (error) {
    console.error('Failed to fetch venue:', error);
    return null;
  }

  if (!venue) {
    console.log('Venue not found');
    return null;
  }

  console.log('Venue Details:');
  console.log('Name:', venue.name);
  console.log('Address:', venue.address || 'N/A');
  console.log('City:', venue.city || 'N/A');
  console.log('State/Province:', venue.state_province || 'N/A');
  console.log('Phone:', venue.phone || 'N/A');
  console.log('Website:', venue.website || 'N/A');
  console.log('Number of Rinks:', venue.number_of_rinks || 1);
  console.log('Parking:', venue.parking_info || 'N/A');
  console.log('Amenities:', venue.amenities?.join(', ') || 'None listed');

  return venue;
}

/**
 * Example 6: Update venue information
 */
export async function example6_UpdateVenue(venueId: string) {
  const formData = new FormData();
  formData.set('name', 'Updated Arena Name');
  formData.set('phone', '(555) 123-4567');
  formData.set('website', 'https://updated-arena.com');

  // Update amenities
  formData.append('amenities', 'Locker Rooms');
  formData.append('amenities', 'Parking');
  formData.append('amenities', 'WiFi');
  formData.append('amenities', 'Pro Shop');

  const result = await updateVenue(venueId, formData);

  if (result.error) {
    console.error('Failed to update venue:', result.error);
    return null;
  }

  console.log('Venue updated successfully:', result.venue);
  return result.venue;
}

/**
 * Example 7: Delete a venue
 */
export async function example7_DeleteVenue(venueId: string) {
  const result = await deleteVenue(venueId);

  if (result.error) {
    console.error('Failed to delete venue:', result.error);
    return false;
  }

  console.log('Venue deleted successfully');
  return true;
}

/**
 * Example 8: Get venues with usage statistics
 */
export async function example8_GetVenuesWithStats() {
  const { venues, error } = await getVenuesWithStats();

  if (error) {
    console.error('Failed to fetch venue stats:', error);
    return [];
  }

  console.log('Venue Usage Statistics:');
  venues.forEach((venue, index) => {
    console.log(`${index + 1}. ${venue.name}`);
    console.log(`   Games hosted: ${venue.game_count || 0}`);
    console.log(`   Location: ${venue.city || 'N/A'}, ${venue.state_province || 'N/A'}`);
  });

  return venues;
}

/**
 * Example 9: Error handling patterns
 */
export async function example9_ErrorHandling() {
  // Example 1: Handle duplicate venue name
  const formData = new FormData();
  formData.set('name', 'Existing Arena');

  const result = await createVenue(formData);

  if (result.error) {
    if (result.error.includes('already exists')) {
      console.log('Venue name already taken. Please choose a different name.');
    } else if (result.error.includes('Unauthorized')) {
      console.log('You do not have permission to create venues.');
    } else {
      console.log('An error occurred:', result.error);
    }
    return;
  }

  console.log('Venue created successfully');
}

/**
 * Example 10: Using COMMON_AMENITIES constant in UI
 */
export function example10_BuildAmenitiesCheckboxes() {
  // In a React component:
  return COMMON_AMENITIES.map((amenity) => ({
    label: amenity,
    value: amenity,
    // In JSX: <input type="checkbox" name="amenities" value={amenity} />
  }));
}

/**
 * Example 11: Complete venue creation workflow
 */
export async function example11_CompleteWorkflow() {
  // Step 1: Create venue
  console.log('Step 1: Creating venue...');
  const createFormData = new FormData();
  createFormData.set('name', 'Example Arena');
  createFormData.set('city', 'Example City');
  createFormData.set('stateProvince', 'EX');
  createFormData.append('amenities', 'Locker Rooms');
  createFormData.append('amenities', 'Parking');

  const createResult = await createVenue(createFormData);
  if (createResult.error) {
    console.error('Failed to create:', createResult.error);
    return;
  }

  const venueId = createResult.venue!.id;
  console.log('Venue created with ID:', venueId);

  // Step 2: Fetch and verify
  console.log('\nStep 2: Fetching venue...');
  const { venue, error: fetchError } = await getVenueById(venueId);
  if (fetchError) {
    console.error('Failed to fetch:', fetchError);
    return;
  }
  console.log('Fetched venue:', venue?.name);

  // Step 3: Update venue
  console.log('\nStep 3: Updating venue...');
  const updateFormData = new FormData();
  updateFormData.set('name', 'Example Arena (Updated)');
  updateFormData.set('phone', '(555) 123-4567');

  const updateResult = await updateVenue(venueId, updateFormData);
  if (updateResult.error) {
    console.error('Failed to update:', updateResult.error);
    return;
  }
  console.log('Venue updated:', updateResult.venue?.name);

  // Step 4: List all venues
  console.log('\nStep 4: Listing all venues...');
  const { venues } = await getAllVenues();
  console.log(`Total venues: ${venues.length}`);

  // Step 5: Delete venue
  console.log('\nStep 5: Deleting venue...');
  const deleteResult = await deleteVenue(venueId);
  if (deleteResult.error) {
    console.error('Failed to delete:', deleteResult.error);
    return;
  }
  console.log('Venue deleted successfully');

  console.log('\nWorkflow completed!');
}

/**
 * Example 12: Validation demonstrations
 */
export async function example12_ValidationExamples() {
  // Test 1: Name too short
  let formData = new FormData();
  formData.set('name', 'AB'); // Only 2 characters
  let result = await createVenue(formData);
  console.log('Short name error:', result.error);
  // Expected: "Venue name must be at least 3 characters"

  // Test 2: Invalid phone number
  formData = new FormData();
  formData.set('name', 'Test Arena');
  formData.set('phone', 'abc-def-ghij');
  result = await createVenue(formData);
  console.log('Invalid phone error:', result.error);
  // Expected: "Invalid phone number format..."

  // Test 3: Invalid website
  formData = new FormData();
  formData.set('name', 'Test Arena');
  formData.set('website', 'javascript:alert(1)');
  result = await createVenue(formData);
  console.log('Invalid website error:', result.error);
  // Expected: "Invalid website URL..."

  // Test 4: Invalid number of rinks
  formData = new FormData();
  formData.set('name', 'Test Arena');
  formData.set('numberOfRinks', '50'); // > 10
  result = await createVenue(formData);
  console.log('Invalid rinks error:', result.error);
  // Expected: "Number of rinks must be between 1 and 10"
}

/**
 * Example usage in a Next.js Server Component
 */
export async function VenueListPage() {
  const { venues, error } = await getAllVenues();

  if (error) {
    return { error };
  }

  return {
    venues: venues.map(v => ({
      id: v.id,
      name: v.name,
      location: `${v.city || 'Unknown'}, ${v.state_province || ''}`,
      amenitiesCount: v.amenities?.length || 0,
    }))
  };
}

/**
 * Example usage in a Next.js Server Action (form submission)
 */
export async function handleVenueFormSubmit(formData: FormData) {
  'use server';

  const result = await createVenue(formData);

  if (result.error) {
    return { error: result.error };
  }

  // Redirect to venue page or show success message
  return { success: true, venueId: result.venue!.id };
}
