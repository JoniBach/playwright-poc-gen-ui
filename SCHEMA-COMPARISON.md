# Schema Comparison: Generator vs UI

## Analysis Results

Comparing the journey generator schemas with the actual UI component schemas to ensure 100% compatibility.

## Component Types in UI Schema (23 total)

### ✅ Form Input Components (8)
1. **textInput** - Text input fields
2. **email** - Email input fields  
3. **tel** - Telephone input fields
4. **textarea** - Multi-line text areas
5. **dateInput** - Date input with day/month/year fields
6. **radios** - Radio button groups (single choice)
7. **checkboxes** - Checkbox groups (multiple choice)
8. **select** - Dropdown select menus

### ✅ Content Components (6)
9. **heading** - Page titles and section headers
10. **paragraph** - Text paragraphs
11. **list** - Bulleted or numbered lists
12. **insetText** - Highlighted information boxes
13. **warningText** - Warning messages
14. **details** - Expandable details/accordion

### ✅ Display Components (4)
15. **panel** - Colored panel boxes
16. **summaryList** - Key-value summary lists
17. **table** - Data tables
18. **notificationBanner** - Success/important banners

### ✅ Interactive Components (1)
19. **button** - Navigation and action buttons

### ⚠️ Journey Type Components (3)
20. **data-entry** - Journey type metadata
21. **data-lookup** - Journey type metadata
22. **success** - Journey type metadata

---

## Current Generator Schema Coverage

### ✅ Currently Supported (8 types)
- heading
- paragraph
- textInput
- radios
- checkboxes
- button
- insetText
- warningText

### ❌ Missing from Generator (11 types)
- **email** - Email input fields
- **tel** - Telephone input fields
- **textarea** - Multi-line text areas
- **dateInput** - Date input components
- **select** - Dropdown select menus
- **list** - Bulleted/numbered lists
- **details** - Expandable details
- **panel** - Panel components
- **summaryList** - Summary lists
- **table** - Data tables
- **notificationBanner** - Notification banners

---

## Key Schema Differences Found

### 1. ✅ FIXED: Radios & Checkboxes Structure
**Issue:** Generator had nested `fieldset` object, UI has flat structure

**UI Schema (Correct):**
```typescript
props: {
  id: string,
  name: string,
  legend: string,  // Flat, not nested
  hint?: string,
  items: [...]
}
```

**Generator Schema:** ✅ Now matches UI schema

### 2. ⚠️ TextInput Missing Properties
**UI Schema has:**
- `width`: '5'|'10'|'20'|'30'|'full'
- `disabled`: boolean
- `readonly`: boolean
- `spellcheck`: boolean
- `value`: string

**Generator Schema has:**
- Only: `name`, `label`, `hint`, `type`, `autocomplete`

### 3. ⚠️ Heading Has Multiple Property Names
**UI Schema supports:**
- `text` OR `content` (either one)
- `level` OR `size` (both supported)
- `tag`: 'h1'|'h2'|'h3'|'h4'|'h5'|'h6'
- `caption`: string

**Generator Schema has:**
- Only: `text`, `size`

### 4. ⚠️ Paragraph Has Multiple Property Names
**UI Schema supports:**
- `text` OR `content` (either one)
- `lead`: boolean (for lead paragraphs)

**Generator Schema has:**
- Only: `text`

### 5. ⚠️ InsetText Has Multiple Property Names
**UI Schema supports:**
- `text` OR `content` (either one)

**Generator Schema has:**
- Only: `text`

### 6. ⚠️ Button Missing Properties
**UI Schema has:**
- `element`: 'a'|'button'|'input'
- `name`: string
- `type`: 'button'|'submit'|'reset'
- `value`: string
- `disabled`: boolean
- `preventDoubleClick`: boolean
- `isStartButton`: boolean

**Generator Schema has:**
- Only: `text`, `href`

---

## Recommendations

### Priority 1: Fix Existing Components (High Impact)
1. ✅ **radios/checkboxes** - FIXED: Changed from nested fieldset to flat structure
2. 🔧 **textInput** - Add missing properties (width, disabled, readonly, spellcheck, value)
3. 🔧 **heading** - Support both `text` and `content`, add `tag` and `caption`
4. 🔧 **paragraph** - Support both `text` and `content`, add `lead`
5. 🔧 **insetText** - Support both `text` and `content`
6. 🔧 **button** - Add missing properties

### Priority 2: Add Common Components (Medium Impact)
7. ➕ **textarea** - Multi-line text input (very common)
8. ➕ **select** - Dropdown menus (very common)
9. ➕ **dateInput** - Date inputs (common for forms)
10. ➕ **list** - Lists for content (common in landing pages)
11. ➕ **details** - Expandable sections (useful for help text)

### Priority 3: Add Display Components (Lower Impact)
12. ➕ **panel** - For confirmation pages
13. ➕ **summaryList** - For check-your-answers pages
14. ➕ **notificationBanner** - For success messages
15. ➕ **email** - Specific email input type
16. ➕ **tel** - Specific telephone input type

### Priority 4: Advanced Components (Optional)
17. ➕ **table** - Data tables (less common in forms)

---

## Impact Assessment

### Current State
- **8/23 components supported** (35% coverage)
- Basic forms work, but limited functionality
- Missing common components like textarea, select, dateInput

### After Priority 1 Fixes
- **8/23 components with full properties** (35% coverage, 100% accuracy)
- Existing components will generate correctly
- No more validation errors for supported types

### After Priority 2 Additions
- **13/23 components supported** (57% coverage)
- Can generate most common form patterns
- Landing pages with lists
- Date inputs for applications

### After Priority 3 Additions
- **18/23 components supported** (78% coverage)
- Can generate complete journeys with check-your-answers
- Success/confirmation pages
- Comprehensive form types

---

## Next Steps

1. ✅ **COMPLETED:** Fix radios/checkboxes structure
2. 🔧 **IN PROGRESS:** Update existing component schemas to match UI exactly
3. ➕ **TODO:** Add missing common components (textarea, select, dateInput, list, details)
4. ➕ **TODO:** Add display components (panel, summaryList, notificationBanner)
5. 📝 **TODO:** Update system prompt with all component types and correct structures
6. ✅ **TODO:** Test generation with updated schemas

---

## Testing Checklist

- [x] radios - Flat structure with id, name, legend
- [x] checkboxes - Flat structure with id, name, legend
- [ ] textInput - All properties (width, disabled, etc.)
- [ ] heading - Both text/content, tag, caption
- [ ] paragraph - Both text/content, lead
- [ ] insetText - Both text/content
- [ ] button - All properties
- [ ] textarea - NEW component
- [ ] select - NEW component
- [ ] dateInput - NEW component
- [ ] list - NEW component
- [ ] details - NEW component
- [ ] panel - NEW component
- [ ] summaryList - NEW component
- [ ] notificationBanner - NEW component
