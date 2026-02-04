# Season Fee Configuration UI - Visual Examples

## 1. Season Detail Page - Empty State

```
┌─────────────────────────────────────────────────────────────┐
│ Registration Fees                                [+ Add Fee]│
│ Configure player registration fees for Spring 2024 Season  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                         💲                                  │
│                                                             │
│               No fees configured                            │
│                                                             │
│    Create your first registration fee to start             │
│    collecting payments from players.                        │
│                                                             │
│                   [Create Fee]                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 2. Season Detail Page - With Fees

```
┌─────────────────────────────────────────────────────────────┐
│ Registration Fees                                [+ Add Fee]│
│ Configure player registration fees for Spring 2024 Season  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌────────────────────────────┐ ┌───────────────────────┐   │
│ │ Spring Registration   [✏️ ][🗑️]│ │ Late Registration [✏️ ][🗑️]│
│ │ Season registration fee    │ │ Fee for late sign-ups │   │
│ │                            │ │                       │   │
│ │ Base Amount     $150.00    │ │ Base Amount  $175.00  │   │
│ │ Early Bird     -$25.00     │ │ Late Fee     +$25.00  │   │
│ │   until Mar 1              │ │                       │   │
│ │                            │ │                       │   │
│ │ Payment Plans:             │ │ Payment Plans:        │   │
│ │ [Full Payment] [2 Payments]│ │ [Full Payment]        │   │
│ │ [3 Payments]               │ │                       │   │
│ │                            │ │                       │   │
│ │ Active          [●──]      │ │ Active       [○──]    │   │
│ └────────────────────────────┘ └───────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 3. Create/Edit Fee Dialog

```
┌─────────────────────────────────────────────────────────────┐
│ Create Registration Fee                              [✕]    │
│ Configure the registration fee details and payment options  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Fee Name *                                                  │
│ [Spring 2024 Registration_________________________]         │
│                                                             │
│ Description (Optional)                                      │
│ [Season registration fee for all players_________]          │
│                                                             │
│ Base Amount *          Currency                             │
│ [$] [150.00______]     [USD ▼]                              │
│                                                             │
│ ─────────────────────────────────────────────────────────   │
│ Payment Plans                                               │
│                                                             │
│ Full Payment              [●──]                             │
│ 2 Payments                [●──]                             │
│ 3 Payments                [●──]                             │
│                                                             │
│ Installment Fee (per payment)                               │
│ [$] [5.00________]                                          │
│ Optional fee charged for each installment payment           │
│                                                             │
│ ─────────────────────────────────────────────────────────   │
│                                                             │
│ Payment Deadline       Early Bird Deadline                  │
│ [📅] [05/31/2024]      [📅] [03/01/2024]                    │
│                                                             │
│ Early Bird Discount    Late Fee                             │
│ [$] [25.00]            [$] [25.00]                          │
│                                                             │
│ ℹ️  Late fees are automatically applied after the payment   │
│    deadline. Early bird discounts apply before the early    │
│    bird deadline.                                           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                   [Cancel] [Create Fee]     │
└─────────────────────────────────────────────────────────────┘
```

## 4. FeeBreakdown Component - Early Bird Active

```
┌─────────────────────────────────────────────────────────────┐
│ Spring 2024 Registration                                    │
│ Season registration fee for all players                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Base Registration Fee                           $150.00    │
│ ─────────────────────────────────────────────────────────   │
│ 🎁 Early Bird Discount                         -$25.00     │
│                                                             │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ 🕐 Early Bird Available!                              │   │
│ │    Register by March 1, 2024 to save $25.00         │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                             │
│ ─────────────────────────────────────────────────────────   │
│ Total Due                                       $125.00    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 💳 Choose Payment Plan                                      │
│                                                             │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ ✓ Pay in Full                              $125.00   │   │
│ │   Single payment                                     │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌──────────────────────────────────────────────────────┐   │
│ │   2 Payments                               $135.00   │   │
│ │   $67.50 per payment                  +$10.00 fees   │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌──────────────────────────────────────────────────────┐   │
│ │   3 Payments                               $140.00   │   │
│ │   $46.67 per payment                  +$15.00 fees   │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 📅 Payment Deadline: May 31, 2024                          │
└─────────────────────────────────────────────────────────────┘
```

## 5. FeeBreakdown Component - Late Fee Applied

```
┌─────────────────────────────────────────────────────────────┐
│ Spring 2024 Registration                                    │
│ Season registration fee for all players                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Base Registration Fee                           $150.00    │
│ ─────────────────────────────────────────────────────────   │
│ ⚠️  Late Registration Fee                       +$25.00    │
│                                                             │
│ ─────────────────────────────────────────────────────────   │
│ Total Due                                       $175.00    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 💳 Choose Payment Plan                                      │
│                                                             │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ ✓ Pay in Full                              $175.00   │   │
│ │   Single payment                                     │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌──────────────────────────────────────────────────────┐   │
│ │   2 Payments                               $185.00   │   │
│ │   $92.50 per payment                  +$10.00 fees   │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 6. FeeBreakdown Component - Standard Period

```
┌─────────────────────────────────────────────────────────────┐
│ Spring 2024 Registration                                    │
│ Season registration fee for all players                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Base Registration Fee                           $150.00    │
│ ─────────────────────────────────────────────────────────   │
│                                                             │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ ⚠️  Payment Deadline                                  │   │
│ │    Register by May 31, 2024 to avoid a $25.00       │   │
│ │    late fee                                          │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                             │
│ ─────────────────────────────────────────────────────────   │
│ Total Due                                       $150.00    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 💳 Choose Payment Plan                                      │
│                                                             │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ ✓ Pay in Full                              $150.00   │   │
│ │   Single payment                                     │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌──────────────────────────────────────────────────────┐   │
│ │   2 Payments                               $160.00   │   │
│ │   $80.00 per payment                  +$10.00 fees   │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌──────────────────────────────────────────────────────┐   │
│ │   3 Payments                               $165.00   │   │
│ │   $55.00 per payment                  +$15.00 fees   │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 7. League Wizard - Step 4 (Registration Fees)

```
┌─────────────────────────────────────────────────────────────┐
│ Step 4 of 7: Registration & Fees                           │
│ Configure registration fees and payment options             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ 💳 Enable Paid Registration            [○──]         │   │
│ │    Collect registration fees from players            │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                             │
│ ─────────────────────────────────────────────────────────   │
│                                                             │
│                         💲                                  │
│                                                             │
│                  Free Registration                          │
│                                                             │
│    Registration will be free for all players. You can      │
│    enable paid registration later from your league         │
│    settings.                                                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                              [← Back] [Next: Payment →]     │
└─────────────────────────────────────────────────────────────┘
```

## 8. League Wizard - Step 4 (With Paid Registration Enabled)

```
┌─────────────────────────────────────────────────────────────┐
│ Step 4 of 7: Registration & Fees                           │
│ Configure registration fees and payment options             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ 💳 Enable Paid Registration            [●──]         │   │
│ │    Collect registration fees from players            │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                             │
│ 💲 Registration Fee                                         │
│                                                             │
│ Base Registration Fee *                                     │
│ [$] [150.00______]                                          │
│ Enter the fee in dollars (e.g., 150.00)                    │
│                                                             │
│ ─────────────────────────────────────────────────────────   │
│                                                             │
│ 🎁 Early Bird Discount                     [●──]           │
│                                                             │
│ ℹ️  Offer a discount to players who register early. The    │
│    discount can be a fixed dollar amount or a percentage.  │
│                                                             │
│ Discount Type                                               │
│ [💲 Fixed Amount] [% Percentage]                            │
│                                                             │
│ Discount Amount        Early Bird Deadline                  │
│ [$] [25.00]            [📅] [03/01/2024]                    │
│                                                             │
│ ─────────────────────────────────────────────────────────   │
│                                                             │
│ ⚠️  Late Registration Fee                  [●──]           │
│                                                             │
│ ℹ️  Add an additional fee for players who register after   │
│    a certain date. This encourages early registration.     │
│                                                             │
│ Additional Late Fee    Late Fees Start                      │
│ [$] [25.00]            [🕐] [06/01/2024]                    │
│                                                             │
│ ─────────────────────────────────────────────────────────   │
│                                                             │
│ Payment Instructions (Optional)                             │
│ [Additional instructions shown to players during_____]      │
│ [registration_______________________________________]        │
│                                                             │
│ ─────────────────────────────────────────────────────────   │
│                                                             │
│ Fee Structure Preview                                       │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Base Registration Fee                    $150.00     │   │
│ │ ──────────────────────────────────────────────────── │   │
│ │ Early Bird Price                         $125.00     │   │
│ │   Before Mar 1, 2024         Save $25.00            │   │
│ │ ──────────────────────────────────────────────────── │   │
│ │ Late Registration Price                  $175.00     │   │
│ │   After Jun 1, 2024           +$25.00 late fee      │   │
│ │ ──────────────────────────────────────────────────── │   │
│ │ Timeline:                                            │   │
│ │ [Early Bird] until Mar 1 | [Standard] | [Late]      │   │
│ │                            from Jun 1                │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                              [← Back] [Next: Payment →]     │
└─────────────────────────────────────────────────────────────┘
```

## Color Legend

- ✅ Green: Positive actions, savings, early bird
- ⚠️  Orange/Yellow: Warnings, late fees, deadlines
- 🔴 Red: Errors, destructive actions
- 💙 Blue/Rink: Primary actions, active states
- ⚫ Gray: Inactive, disabled states

## Icons Used

- 💲 Dollar sign - Money/fees
- 💳 Credit card - Payment
- 🎁 Gift - Discounts/savings
- ⚠️  Warning triangle - Late fees/warnings
- 📅 Calendar - Dates/deadlines
- 🕐 Clock - Time-based
- ✏️  Pencil - Edit
- 🗑️  Trash - Delete
- ✓ Checkmark - Selected/completed
- ℹ️  Info - Information/help
- ✕ X - Close/cancel

## Responsive Behavior

### Desktop (lg)
- Fees displayed in 2-column grid
- Payment plans side-by-side
- Full dialog width (max 672px)

### Tablet (md)
- Fees displayed in 2-column grid
- Payment plan options stacked
- Responsive dialog width

### Mobile (sm)
- Fees displayed in 1-column stack
- Payment plans full width
- Dialog full screen on mobile
- Touch-friendly buttons
