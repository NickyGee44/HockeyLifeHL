'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  wizardSchema,
  generateSlug,
  type WizardFormData,
} from '../schemas/league-wizard';

// ==============================================================================
// TYPES
// ==============================================================================

export type ActionResult<T = any> =
  | { success: true; data: T }
  | { success: false; error: string };

// ==============================================================================
// DRAFT MANAGEMENT ACTIONS
// ==============================================================================

/**
 * Saves wizard progress as a draft league
 * Allows users to resume the wizard later
 */
export async function saveDraft(
  data: Partial<WizardFormData>
): Promise<ActionResult<{ draftId: string }>> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get user's organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_user_id', user.id)
      .single();

    if (orgError || !org) {
      return {
        success: false,
        error: 'No organization found. Please create an organization first.',
      };
    }

    // Check if user already has a draft
    const { data: existingDraft } = await supabase
      .from('leagues')
      .select('id')
      .eq('created_by', user.id)
      .eq('status', 'draft')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    // Generate temporary slug for draft (will be regenerated on final creation)
    const tempSlug = data.name
      ? `${generateSlug(data.name)}-draft-${Date.now()}`
      : `draft-${Date.now()}`;

    // Prepare league data
    const leagueData = {
      name: data.name || 'Untitled League',
      slug: tempSlug,
      description: data.description || null,
      city: data.city || null,
      state_province: data.state_province || null,
      country: data.country || 'USA',
      timezone: data.timezone || 'America/New_York',
      primary_color: data.primary_color || '#1E40AF',
      secondary_color: data.secondary_color || '#3B82F6',
      logo_url: data.logo_url || null,
      contact_email: data.contact_email || null,
      contact_phone: data.contact_phone || null,
      website_url: data.website_url || null,
      organization_id: org.id,
      status: 'draft' as const,
      created_by: user.id,
      // Store wizard-specific data in settings JSONB
      settings: {
        wizard_data: {
          // Step 1 - Organization Info
          orgBusinessName: data.orgBusinessName,
          orgBusinessEmail: data.orgBusinessEmail,
          orgBusinessPhone: data.orgBusinessPhone,
          orgBusinessAddress: data.orgBusinessAddress,
          orgBusinessCity: data.orgBusinessCity,
          orgBusinessState: data.orgBusinessState,
          orgBusinessZip: data.orgBusinessZip,
          orgBusinessCountry: data.orgBusinessCountry ?? 'CA',
          // Step 3 - Season & Scorekeeping
          season_name: data.season_name,
          season_start_date: data.season_start_date,
          season_end_date: data.season_end_date,
          registration_type: data.registration_type,
          registration_opens: data.registration_opens,
          registration_closes: data.registration_closes,
          game_duration_minutes: data.game_duration_minutes,
          period_count: data.period_count,
          scorekeeping_mode: data.scorekeeping_mode ?? 'self_scorekeeping',
          playoff_eligibility_enabled: data.playoff_eligibility_enabled ?? false,
          playoff_eligibility_min_games_pct: data.playoff_eligibility_min_games_pct ?? 60,
          playoff_eligibility_min_games: data.playoff_eligibility_min_games ?? null,
          // Step 4 - Teams
          teams: data.teams || [],
          // Step 5 - Website & Pages
          isPublic: data.isPublic ?? true,
          themePreset: data.themePreset ?? 'dark',
          bannerUrl: data.bannerUrl,
          socialFacebook: data.socialFacebook,
          socialInstagram: data.socialInstagram,
          socialTwitter: data.socialTwitter,
          visiblePages: data.visiblePages,
          wantCustomDomain: data.wantCustomDomain ?? false,
          ownsDomain: data.ownsDomain,
          customDomainName: data.customDomainName,
          // Step 6 - Add-ons
          enableAdvancedStats: data.enableAdvancedStats ?? false,
          enableAiNews: data.enableAiNews ?? false,
          // Step 7 - Registration & Payments
          enablePaidRegistration: data.enablePaidRegistration ?? false,
          registrationFee: data.registrationFee ?? 0,
          earlyBirdDiscount: data.earlyBirdDiscount ?? {
            enabled: false,
            amount: 0,
            isPercentage: false,
            deadline: '',
          },
          lateRegistrationFee: data.lateRegistrationFee ?? {
            enabled: false,
            amount: 0,
            startsAt: '',
          },
          paymentInstructions: data.paymentInstructions,
          stripeAccountId: data.stripeAccountId ?? null,
          stripeAccountStatus: data.stripeAccountStatus ?? 'not_connected',
          skipPaymentSetup: data.skipPaymentSetup ?? false,
        },
      },
    };

    if (existingDraft) {
      // Update existing draft
      const { error: updateError } = await supabase
        .from('leagues')
        .update(leagueData)
        .eq('id', existingDraft.id);

      if (updateError) {
        console.error('Draft update error:', updateError);
        return {
          success: false,
          error: `Failed to update draft: ${updateError.message}`,
        };
      }

      return {
        success: true,
        data: { draftId: existingDraft.id },
      };
    } else {
      // Create new draft
      const { data: newDraft, error: insertError } = await supabase
        .from('leagues')
        .insert(leagueData)
        .select('id')
        .single();

      if (insertError || !newDraft) {
        console.error('Draft creation error:', insertError);
        return {
          success: false,
          error: `Failed to create draft: ${insertError?.message}`,
        };
      }

      return {
        success: true,
        data: { draftId: newDraft.id },
      };
    }
  } catch (error) {
    console.error('saveDraft error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Retrieves user's current draft league
 * Returns null if no draft exists
 */
export async function getDraft(): Promise<
  ActionResult<Partial<WizardFormData> | null>
> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get user's draft league
    const { data: draft, error: draftError } = await supabase
      .from('leagues')
      .select('*')
      .eq('created_by', user.id)
      .eq('status', 'draft')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (draftError) {
      console.error('getDraft error:', draftError);
      return {
        success: false,
        error: `Failed to load draft: ${draftError.message}`,
      };
    }

    if (!draft) {
      return { success: true, data: null };
    }

    // Extract wizard data from settings
    const wizardData = (draft.settings as any)?.wizard_data || {};

    // Reconstruct wizard form data
    const formData: Partial<WizardFormData> = {
      name: draft.name,
      description: draft.description || undefined,
      city: draft.city || undefined,
      state_province: draft.state_province || undefined,
      country: draft.country,
      timezone: draft.timezone,
      primary_color: draft.primary_color,
      secondary_color: draft.secondary_color,
      logo_url: draft.logo_url || undefined,
      contact_email: draft.contact_email || undefined,
      contact_phone: draft.contact_phone || undefined,
      website_url: draft.website_url || undefined,
      ...wizardData,
    };

    return { success: true, data: formData };
  } catch (error) {
    console.error('getDraft error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Deletes a draft league
 * If no draftId is provided, deletes the most recent draft for the current user
 */
export async function deleteDraft(
  draftId?: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // If no draftId provided, find the most recent draft
    let targetDraftId = draftId;
    if (!targetDraftId) {
      const { data: existingDraft } = await supabase
        .from('leagues')
        .select('id')
        .eq('created_by', user.id)
        .eq('status', 'draft')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (!existingDraft) {
        // No draft to delete
        return { success: true, data: undefined };
      }
      targetDraftId = existingDraft.id;
    }

    // Delete draft (RLS will ensure user owns it)
    const { error: deleteError } = await supabase
      .from('leagues')
      .delete()
      .eq('id', targetDraftId)
      .eq('created_by', user.id)
      .eq('status', 'draft');

    if (deleteError) {
      console.error('deleteDraft error:', deleteError);
      return {
        success: false,
        error: `Failed to delete draft: ${deleteError.message}`,
      };
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error('deleteDraft error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// ==============================================================================
// ATOMIC LEAGUE CREATION
// ==============================================================================

/**
 * Creates a complete league atomically with all related records
 * Uses service role client to bypass RLS for atomic operations
 *
 * Creates:
 * 1. League (active status)
 * 2. League membership (owner role)
 * 3. Season
 * 4. Teams (if provided)
 * 5. Deletes the specific draft (if draftId provided)
 *
 * @param formData - The wizard form data
 * @param draftId - Optional ID of the draft to delete after successful creation
 */
export async function createLeague(
  formData: WizardFormData,
  draftId?: string
): Promise<
  ActionResult<{
    leagueId: string;
    slug: string;
    seasonId: string;
  }>
> {
  console.log('🏒 createLeague - Starting atomic league creation');

  try {
    // Validate form data
    const validation = wizardSchema.safeParse(formData);
    if (!validation.success) {
      console.error('Validation error:', validation.error);
      return {
        success: false,
        error: `Validation failed: ${validation.error.issues[0].message}`,
      };
    }

    const data = validation.data;

    // Get authenticated user with service role client
    const serviceSupabase = createServiceRoleClient();
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    console.log(`👤 User: ${user.id}`);

    // Get user's organization
    const { data: org, error: orgError } = await serviceSupabase
      .from('organizations')
      .select('id, slug')
      .eq('owner_user_id', user.id)
      .single();

    if (orgError || !org) {
      console.error('Organization error:', orgError);
      return {
        success: false,
        error: 'No organization found. Please create an organization first.',
      };
    }

    console.log(`🏢 Organization: ${org.id}`);

    // Generate unique slug with collision detection
    const slug = generateSlug(data.name);
    let slugAttempt = 0;
    let uniqueSlug = slug;

    while (true) {
      const { data: existing } = await serviceSupabase
        .from('leagues')
        .select('id')
        .eq('slug', uniqueSlug)
        .single();

      if (!existing) break;

      slugAttempt++;
      uniqueSlug = `${slug}-${slugAttempt}`;

      if (slugAttempt > 10) {
        return {
          success: false,
          error: 'Could not generate unique league slug. Please try a different name.',
        };
      }
    }

    console.log(`🔗 Generated slug: ${uniqueSlug}`);

    // ATOMIC TRANSACTION BEGINS
    // Step 1: Create league
    const { data: league, error: leagueError } = await serviceSupabase
      .from('leagues')
      .insert({
        name: data.name,
        slug: uniqueSlug,
        description: data.description || null,
        city: data.city,
        state_province: data.state_province,
        country: data.country,
        timezone: data.timezone,
        primary_color: data.primary_color,
        secondary_color: data.secondary_color,
        logo_url: data.logo_url || null,
        banner_url: data.bannerUrl || null,
        contact_email: data.contact_email || null,
        contact_phone: data.contact_phone || null,
        website_url: data.website_url || null,
        organization_id: org.id,
        status: 'active',
        created_by: user.id,
        is_public: data.isPublic ?? true,
        settings: {
          statEntryMode: data.scorekeeping_mode === 'standard' ? 'scorekeeper' : 'captain',
          scorekeepingMode: data.scorekeeping_mode ?? 'self_scorekeeping',
          allowPlayerRegistration: true,
          requireApproval: data.registration_type !== 'open',
          isDraftLeague: data.registration_type === 'draft',
          emailNotifications: true,
          allowTrades: false,
          // Organization business info
          organization: {
            businessName: data.orgBusinessName || null,
            businessEmail: data.orgBusinessEmail || null,
            businessPhone: data.orgBusinessPhone || null,
            businessAddress: data.orgBusinessAddress || null,
            businessCity: data.orgBusinessCity || null,
            businessState: data.orgBusinessState || null,
            businessZip: data.orgBusinessZip || null,
            businessCountry: data.orgBusinessCountry || 'CA',
          },
          // Fee configuration
          fees: {
            enablePaidRegistration: data.enablePaidRegistration ?? false,
            registrationFee: data.registrationFee ?? 0,
            earlyBirdDiscount: {
              enabled: data.earlyBirdDiscount?.enabled ?? false,
              amount: data.earlyBirdDiscount?.amount ?? 0,
              isPercentage: data.earlyBirdDiscount?.isPercentage ?? false,
              deadline: data.earlyBirdDiscount?.deadline || null,
            },
            lateRegistrationFee: {
              enabled: data.lateRegistrationFee?.enabled ?? false,
              amount: data.lateRegistrationFee?.amount ?? 0,
              startsAt: data.lateRegistrationFee?.startsAt || null,
            },
            paymentInstructions: data.paymentInstructions || null,
          },
          // Payment setup
          payment: {
            stripeAccountId: data.stripeAccountId ?? null,
            stripeAccountStatus: data.stripeAccountStatus ?? 'not_connected',
            skipPaymentSetup: data.skipPaymentSetup ?? false,
          },
          // Website & Pages
          website: {
            themePreset: data.themePreset ?? 'dark',
            bannerUrl: data.bannerUrl || null,
            socialFacebook: data.socialFacebook || null,
            socialInstagram: data.socialInstagram || null,
            socialTwitter: data.socialTwitter || null,
            visiblePages: data.visiblePages ?? {
              scores: true,
              schedule: true,
              standings: true,
              teams: true,
              stats: true,
              news: false,
              events: false,
              gallery: false,
              about: true,
            },
          },
          // Custom domain
          domain: {
            wantCustomDomain: data.wantCustomDomain ?? false,
            ownsDomain: data.ownsDomain ?? false,
            customDomainName: data.customDomainName || null,
          },
          // Add-ons
          addons: {
            enableAdvancedStats: data.enableAdvancedStats ?? false,
            enableAiNews: data.enableAiNews ?? false,
          },
        },
      })
      .select('id')
      .single();

    if (leagueError || !league) {
      console.error('❌ League creation error:', leagueError);
      return {
        success: false,
        error: `Failed to create league: ${leagueError?.message}`,
      };
    }

    console.log(`✅ League created: ${league.id}`);

    try {
      // Step 2: Create league membership (owner role)
      const { error: membershipError } = await serviceSupabase
        .from('league_memberships')
        .insert({
          league_id: league.id,
          user_id: user.id,
          role: 'owner',
          status: 'active',
        });

      if (membershipError) {
        throw new Error(`Membership creation failed: ${membershipError.message}`);
      }

      console.log('✅ League membership created');

      // Step 3: Create season
      // Map wizard registration_type to database enum values
      const registrationTypeMap: Record<string, string> = {
        'open': 'open_registration',
        'approval_required': 'open_registration',
        'invite_only': 'captain_invite_only',
        'draft': 'draft',
      };
      const dbRegistrationType = registrationTypeMap[data.registration_type] || 'open_registration';

      const { data: season, error: seasonError } = await (serviceSupabase
        .from('seasons') as any)
        .insert({
          league_id: league.id,
          name: data.season_name,
          start_date: data.season_start_date,
          end_date: data.season_end_date,
          registration_opens_at: data.registration_opens || null,
          registration_closes_at: data.registration_closes || null,
          registration_type: dbRegistrationType,
          status: 'active', // Valid enum: active, playoffs, completed, draft, archived
          game_duration_minutes: data.game_duration_minutes,
          period_count: data.period_count,
          playoff_eligibility_min_games_pct: data.playoff_eligibility_enabled
            ? data.playoff_eligibility_min_games_pct
            : null,
          playoff_eligibility_min_games: data.playoff_eligibility_enabled
            ? data.playoff_eligibility_min_games
            : null,
        })
        .select('id')
        .single();

      if (seasonError || !season) {
        throw new Error(`Season creation failed: ${seasonError?.message}`);
      }

      console.log(`✅ Season created: ${season.id}`);

      // Step 3b: Create season fee if paid registration is enabled
      if (data.enablePaidRegistration && data.registrationFee > 0) {
        const earlyBirdDiscountCents = data.earlyBirdDiscount?.enabled
          ? data.earlyBirdDiscount.isPercentage
            ? Math.round((data.registrationFee * data.earlyBirdDiscount.amount) / 100)
            : data.earlyBirdDiscount.amount
          : 0;

        const { error: feeError } = await serviceSupabase.from('season_fees').insert({
          league_id: league.id,
          season_id: season.id,
          name: 'Registration Fee',
          description: 'Season registration fee',
          amount_cents: data.registrationFee,
          currency: 'usd',
          allow_full_payment: true,
          allow_two_pay: false,
          allow_three_pay: false,
          payment_deadline: data.registration_closes || null,
          early_bird_deadline: data.earlyBirdDiscount?.deadline || null,
          early_bird_discount_cents: earlyBirdDiscountCents,
          late_fee_cents: data.lateRegistrationFee?.enabled ? data.lateRegistrationFee.amount : 0,
          installment_fee_cents: 0,
          is_active: true,
          created_by: user.id,
        });

        if (feeError) {
          console.error('Failed to create season fee:', feeError);
          // Continue anyway - league is created, fee can be added later
        } else {
          console.log('✅ Season fee created');
        }
      }

      // Step 4: Create teams (if provided)
      if (data.teams && data.teams.length > 0) {
        const teamsToInsert = data.teams.map((team) => ({
          league_id: league.id,
          name: team.name,
          // short_name is NOT NULL, so generate from name if not provided
          short_name: team.short_name || team.name.substring(0, 10),
          primary_color: team.color || null,
        }));

        const { data: createdTeams, error: teamsError } = await (serviceSupabase
          .from('teams') as any)
          .insert(teamsToInsert)
          .select('id');

        if (teamsError) {
          throw new Error(`Teams creation failed: ${teamsError.message}`);
        }

        console.log(`✅ Created ${data.teams.length} teams`);

        // Step 4b: Link teams to season via season_teams junction table
        if (createdTeams && createdTeams.length > 0) {
          const teamIds = createdTeams.map((t: { id: string }) => t.id);
          const seasonTeamInserts = teamIds.map((teamId: string) => ({
            season_id: season.id,
            team_id: teamId,
          }));

          const { error: seasonTeamsError } = await (serviceSupabase as any)
            .from('season_teams')
            .insert(seasonTeamInserts);

          if (seasonTeamsError) {
            console.error('Failed to link teams to season:', seasonTeamsError);
            // Continue anyway - teams are created, just not linked
          } else {
            console.log(`✅ Linked ${teamIds.length} teams to season`);
          }
        }
      }

      // Step 5: Create organization_addons records for selected add-ons
      const addonsToCreate: { addon_type: string; amount_cents: number }[] = [];

      // Platform subscription is always created
      addonsToCreate.push({
        addon_type: 'platform_subscription',
        amount_cents: 29999, // $299.99
      });

      if (data.enableAdvancedStats) {
        addonsToCreate.push({
          addon_type: 'advanced_stats',
          amount_cents: 1499, // $14.99
        });
      }

      if (data.enableAiNews) {
        addonsToCreate.push({
          addon_type: 'ai_news',
          amount_cents: 1499, // $14.99
        });
      }

      for (const addon of addonsToCreate) {
        const { error: addonError } = await (serviceSupabase as any)
          .from('organization_addons')
          .upsert(
            {
              organization_id: org.id,
              addon_type: addon.addon_type,
              status: 'inactive', // Will be activated when billing is set up
              amount_cents: addon.amount_cents,
            },
            { onConflict: 'organization_id,addon_type' }
          );

        if (addonError) {
          console.error(`Failed to create addon ${addon.addon_type}:`, addonError);
          // Continue anyway - addons can be set up later
        } else {
          console.log(`✅ Add-on record created: ${addon.addon_type}`);
        }
      }

      // Step 6: Delete the specific draft if draftId was provided
      if (draftId) {
        await serviceSupabase
          .from('leagues')
          .delete()
          .eq('id', draftId)
          .eq('created_by', user.id)
          .eq('status', 'draft');

        console.log(`✅ Cleaned up draft: ${draftId}`);
      }

      // Revalidate relevant paths
      revalidatePath('/dashboard');
      revalidatePath('/dashboard/leagues');

      console.log('🎉 League creation complete!');

      return {
        success: true,
        data: {
          leagueId: league.id,
          slug: uniqueSlug,
          seasonId: season.id,
        },
      };
    } catch (rollbackError) {
      // ROLLBACK: Delete the league (cascades to all related records)
      console.error('❌ Rolling back due to error:', rollbackError);

      await serviceSupabase.from('leagues').delete().eq('id', league.id);

      return {
        success: false,
        error:
          rollbackError instanceof Error
            ? rollbackError.message
            : 'Failed to create league. Transaction rolled back.',
      };
    }
  } catch (error) {
    console.error('createLeague error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
