# User Stories: Apply for a passport

**Generated:** 11/21/2025, 1:13:00 PM
**Journey ID:** `passport-apply`

## Summary

- **Total Pages:** 6
- **Total Components:** 27
- **User Stories:** 5
- **Acceptance Criteria:** 28
- **Test Scenarios:** 19

### Complexity Breakdown

- **medium:** 5 stories

### Component Coverage

- **textInput:** 12
- **paragraph:** 6
- **heading:** 5
- **summaryList:** 3
- **insetText:** 2
- **dateInput:** 2
- **radios:** 2
- **panel:** 1

---

## Story 1: User Story for Passport Application Journey - Start and Personal Details Pages

**ID:** `passport-apply-journey-start-1763730704199`
**Complexity:** medium
**Tags:** `passport-apply`, `user-journey`, `form-validation`, `accessibility`

### User Story

> **As a** user applying for a passport
> **I want** to complete the online application process for a passport
> **So that** I can have my passport processed efficiently and receive it in a timely manner.

**Description:**

This user story encompasses the initial pages of the passport application journey, focusing on informing users about the process and collecting their personal details while ensuring accessibility and compliance with GOV.UK standards.

**Pages:** `start`, `personal-details`

**Components:**

- paragraph: 2
- heading: 1
- insetText: 1
- textInput: 2
- dateInput: 1

### Acceptance Criteria

#### 1. [MUST] ✅

- **Given** I am on the start page of the passport application
- **When** I read the information provided
- **Then** I should clearly understand the purpose of the service and what I need to apply for a passport.
- **Tags:** `journey-start`, `passport-apply`, `accessibility`

#### 2. [MUST] ✅

- **Given** I am on the start page of the passport application
- **When** I look for estimated completion time
- **Then** I should see the inset text indicating it takes around 10 minutes to complete the service.
- **Tags:** `journey-start`, `passport-apply`

#### 3. [MUST] ✅

- **Given** I am on the personal details page of the passport application
- **When** I fill in my personal information
- **Then** I should be able to enter my first name, last name, and date of birth correctly and submit the form without errors if all fields are filled in correctly.
- **Tags:** `personal-details`, `passport-apply`, `form-validation`

#### 4. [MUST] ✅

- **Given** I am on the personal details page of the passport application
- **When** I leave the first name field blank and try to submit
- **Then** I should receive an error message prompting me to enter my first name.
- **Tags:** `personal-details`, `passport-apply`, `error-handling`

#### 5. [SHOULD] ✅

- **Given** I am on the personal details page of the passport application
- **When** I enter an invalid date format in the date of birth field
- **Then** I should receive an error message instructing me on the correct format to enter my date of birth.
- **Tags:** `personal-details`, `passport-apply`, `form-validation`

#### 6. [MUST] ✅

- **Given** I have filled out the form correctly on the personal details page
- **When** I click the 'Continue' button
- **Then** I should be navigated to the next step in the passport application process.
- **Tags:** `personal-details`, `passport-apply`, `navigation-flow`

#### 7. [SHOULD] ✅

- **Given** I am on the personal details page of the passport application
- **When** I tab through the inputs
- **Then** All input fields should be accessible via keyboard navigation, demonstrating compliance with accessibility standards.
- **Tags:** `personal-details`, `passport-apply`, `accessibility`

### Test Scenarios

#### 1. Verify Start Page Information Display [high]

**ID:** `TS001`
**Description:** Ensure the start page displays the correct information about applying for a passport and the estimated time.

**Steps:**

1. Navigate to the start page of the passport application
2. Read the paragraph about the service
3. Check the inset text for estimated completion time
4. Verify the 'What you need' heading is displayed correctly

**Expected Result:** Information about the service and estimated completion time is displayed correctly.

**Pages:** `start`
**Components:** `paragraph`, `heading`, `insetText`
**Tags:** `journey-start`, `passport-apply`

#### 2. Form Submission with Valid Data [critical]

**ID:** `TS002`
**Description:** Test the personal details form submission with valid input data.

**Steps:**

1. Navigate to the personal details page
2. Fill in the first name and last name
3. Fill in the date of birth correctly
4. Click 'Continue' button

**Expected Result:** User is navigated to the next step in the application process.

**Pages:** `personal-details`
**Components:** `textInput`, `dateInput`
**Tags:** `passport-apply`, `navigation-flow`

#### 3. Handle Empty First Name Submission [high]

**ID:** `TS003`
**Description:** Test submitting the personal details form with an empty first name field.

**Steps:**

1. Navigate to the personal details page
2. Leave the first name field empty
3. Fill in the last name and date of birth
4. Click 'Continue' button

**Expected Result:** An error message prompts to input the first name and the form does not submit.

**Pages:** `personal-details`
**Components:** `textInput`, `dateInput`
**Tags:** `passport-apply`, `form-validation`

#### 4. Check Date Formatting Validation [medium]

**ID:** `TS004`
**Description:** Test the validation rule for the date of birth field to ensure it requires the correct format.

**Steps:**

1. Navigate to the personal details page
2. Fill in valid first name and last name
3. Enter an invalid format in the date of birth field
4. Click 'Continue' button

**Expected Result:** An error message displays, indicating the correct format for the date of birth.

**Pages:** `personal-details`
**Components:** `dateInput`
**Tags:** `passport-apply`, `form-validation`

---

## Story 2: Passport Application - User Personal Details Entry

**ID:** `passport-apply-data-entry-1763730723036`
**Complexity:** medium
**Tags:** `passport application`, `data-entry`, `GOV.UK`, `accessibility`

### User Story

> **As a** a citizen applying for a passport
> **I want** to enter my personal details accurately in the application form
> **So that** I can successfully complete my passport application without errors or delays

**Description:**

This user story covers the need for users to enter their personal information, including first name, last name, and date of birth, in an accessible and user-friendly format as part of the online passport application process.

**Pages:** `personal-details`, `contact-details`, `address`

**Components:**

- textInput: 8
- dateInput: 1
- radios: 1

### Acceptance Criteria

#### 1. [MUST] ✅

- **Given** I am on the personal details page of the passport application
- **When** I submit the form without entering any information
- **Then** I see validation messages indicating that all fields are required
- **Tags:** `form`, `validation`, `accessibility`

#### 2. [MUST] ✅

- **Given** I am on the personal details page and filled in all the required fields
- **When** I click the 'Next' button
- **Then** I am redirected to the contact details page
- **Tags:** `navigation`, `data-entry`

#### 3. [MUST] ✅

- **Given** I enter an invalid date in the date of birth field
- **When** I submit the form
- **Then** I see a validation message prompting me to enter a valid date
- **Tags:** `form`, `validation`

#### 4. [MUST] ✅

- **Given** I enter my first name and last name correctly
- **When** I try to enter the date of birth in an incorrect format
- **Then** I should be warned about the incorrect date format and not be able to proceed
- **Tags:** `form`, `validation`

#### 5. [SHOULD] ✅

- **Given** I have a screen reader configured for accessibility
- **When** I navigate to the personal details page
- **Then** I can hear the labels and hints of each input field clearly
- **Tags:** `accessibility`, `GOV.UK compliance`

#### 6. [MUST] ✅

- **Given** I have entered my details but missed the date of birth
- **When** I click 'Next' to navigate away
- **Then** I am prompted with an error message to fill out the missing date of birth field before proceeding
- **Tags:** `error handling`, `form`, `validation`

### Test Scenarios

#### 1. Personal Details Form Validation - Required Fields [critical]

**ID:** `TS001`
**Description:** Test validation of required fields on personal details page

**Steps:**

1. Navigate to the personal details page
2. Leave all fields blank
3. Click 'Next'

**Expected Result:** Validation messages appear for all required fields indicating that they must be filled out

**Pages:** `personal-details`
**Components:** `textInput`, `dateInput`
**Tags:** `validation`, `test`

#### 2. Correct Navigation to Next Step [high]

**ID:** `TS002`
**Description:** Check if users can successfully navigate to contact details page

**Steps:**

1. Navigate to the personal details page
2. Fill in the first name, last name, and date of birth
3. Click 'Next'

**Expected Result:** User is taken to the contact details page

**Pages:** `personal-details`
**Components:** `textInput`, `dateInput`
**Tags:** `navigation`, `test`

#### 3. Accessibility of Input Fields [medium]

**ID:** `TS003`
**Description:** Ensure screen reader functionalities work correctly with form fields

**Steps:**

1. Navigate to the personal details page with a screen reader
2. Focus on each input element

**Expected Result:** All input elements should communicate their purpose and hints correctly via the screen reader

**Pages:** `personal-details`
**Components:** `textInput`, `dateInput`
**Tags:** `accessibility`, `test`

#### 4. Incorrect Date Format Warning [high]

**ID:** `TS004`
**Description:** Test that the user is warned if they enter an incorrect date format in date of birth

**Steps:**

1. Navigate to the personal details page
2. Enter an incorrect date in the date of birth field
3. Click 'Next'

**Expected Result:** An error message appears indicating an invalid date format

**Pages:** `personal-details`
**Components:** `dateInput`
**Tags:** `validation`, `error handling`, `test`

---

## Story 3: User submits contact details for passport application

**ID:** `passport-apply-selection-1763730738962`
**Complexity:** medium
**Tags:** `passport`, `user journey`, `GOV.UK Design System`, `accessibility`, `user needs`

### User Story

> **As a** User applying for a passport
> **I want** to provide my contact details
> **So that** I can receive updates about my application

**Description:**

The user needs to fill out their contact details including email, phone number, and preferred method of contact during the passport application process. This information is essential to keep the user informed about their application status.

**Pages:** `contact-details`

**Components:**

- textInput: 2
- radios: 1

### Acceptance Criteria

#### 1. [MUST] ✅

- **Given** The user is on the contact details page of the passport application journey
- **When** the user attempts to submit the form without filling any field
- **Then** an error message should be displayed for each required field: email, phone, and contact preference
- **Tags:** `form validation`, `accessibility`, `GOV.UK compliance`

#### 2. [MUST] ✅

- **Given** The user is on the contact details page
- **When** the user fills in the email field with a valid email format, the phone field with a valid phone number, and selects a contact preference
- **Then** the user should be able to successfully submit the form without error messages
- **Tags:** `success scenario`, `navigation flow`

#### 3. [SHOULD] ✅

- **Given** The user is on the contact details page
- **When** the user fills in the email field with an invalid format (e.g., missing '@')
- **Then** an error message should indicate the email address is invalid
- **Tags:** `form validation`, `accessibility`

#### 4. [MUST] ✅

- **Given** The user has filled in the email and phone fields correctly
- **When** the user does not select a contact preference and tries to submit the form
- **Then** an error message should indicate that contact preference is required
- **Tags:** `form validation`, `error handling`

#### 5. [SHOULD] ✅

- **Given** The user successfully submits their contact details
- **When** they are redirected to the next page
- **Then** the page should display a confirmation message about the successful submission
- **Tags:** `navigation flow`, `success scenario`

### Test Scenarios

#### 1. Validate required fields [critical]

**ID:** `TC1`
**Description:** User tries to submit the form without filling any fields

**Steps:**

1. Navigate to the contact details page
2. Click the submit button

**Expected Result:** Error messages are displayed for email, phone, and contact preference fields

**Pages:** `passport-apply_contact-details`
**Components:** `textInput`, `radios`
**Tags:** `form validation`, `error handling`

#### 2. Email format validation [high]

**ID:** `TC2`
**Description:** User enters an invalid email and submits the form

**Steps:**

1. Navigate to the contact details page
2. Enter 'invalidEmail' in the email field
3. Enter '1234567890' in the phone field
4. Select a contact preference
5. Click the submit button

**Expected Result:** Error message displayed indicating the email address is invalid

**Pages:** `passport-apply_contact-details`
**Components:** `textInput`
**Tags:** `form validation`

#### 3. Successful submission of contact details [critical]

**ID:** `TC3`
**Description:** User submits valid contact details

**Steps:**

1. Navigate to the contact details page
2. Fill in a valid email and phone number
3. Select a contact preference
4. Click the submit button

**Expected Result:** User is redirected to the next step with a confirmation message

**Pages:** `passport-apply_contact-details`
**Components:** `textInput`, `radios`
**Tags:** `success scenario`, `navigation flow`

---

## Story 4: Check Your Answers for Passport Application

**ID:** `passport-apply-review-1763730753805`
**Complexity:** medium
**Tags:** `passport-application`, `user-validation`, `accessibility`, `GOV.UK`

### User Story

> **As a** passport applicant
> **I want** to review all my application details before I submit
> **So that** I can ensure my information is correct and avoid any delays in processing my passport

**Description:**

As a passport applicant, I need to confirm that the details I provided in my application are accurate by reviewing them on the 'Check your answers' page. This will help me catch any mistakes before submission, making sure the application is processed effectively and promptly.

**Pages:** `check-answers`

**Components:**

- heading: 2
- summaryList: 3
- paragraph: 1

### Acceptance Criteria

#### 1. [MUST] ✅

- **Given** I am on the Check your answers page after completing my passport application details
- **When** I review the displayed personal details, contact details, and address information
- **Then** I should see my entered information displayed accurately in a structured format with headings and sections for clarity
- **Tags:** `user-validation`, `data-verification`, `accessibility`

#### 2. [MUST] ✅

- **Given** I am about to submit my application
- **When** I click the 'Submit' button
- **Then** I should receive a confirmation message indicating that my application has been submitted successfully
- **Tags:** `submission-flow`, `user-feedback`

#### 3. [SHOULD] ✅

- **Given** I have made an error in my application details
- **When** I attempt to submit the application
- **Then** I should see an error message indicating the specific field that needs correction before I can proceed
- **Tags:** `error-handling`, `form-validation`

#### 4. [MUST] ✅

- **Given** I am on the Check your answers page
- **When** I navigate using keyboard shortcuts
- **Then** I should be able to access all interactive components and links without using a mouse, adhering to accessibility standards
- **Tags:** `accessibility`, `keyboard-navigation`

#### 5. [SHOULD] ✅

- **Given** I have reviewed my application details
- **When** I close the browser and reopen the page later
- **Then** I should not see my previous information, ensuring the privacy and security of my application details
- **Tags:** `privacy`, `session-management`

### Test Scenarios

#### 1. Successful review and submission of application [high]

**ID:** `scenario-1`
**Description:** Verify that the applicant can successfully review and submit their application.

**Steps:**

1. Navigate to Check your answers page
2. Verify all details are displayed correctly
3. Click 'Submit' button

**Expected Result:** Application submission confirmation is displayed to the user.

**Pages:** `passport-apply-check-answers`
**Components:** `summaryList`, `button`
**Tags:** `submission`, `confirmation`

#### 2. Form validation for required fields [high]

**ID:** `scenario-2`
**Description:** Check that error messages are displayed when required fields are empty.

**Steps:**

1. Navigate to Check your answers page
2. Leave required fields empty
3. Click 'Submit' button

**Expected Result:** Error messages are shown for all required fields that are empty.

**Pages:** `passport-apply-check-answers`
**Components:** `form`, `error-message`
**Tags:** `validation`, `error-handling`

#### 3. Accessibility navigation using keyboard [medium]

**ID:** `scenario-3`
**Description:** Ensure all components are accessible using keyboard navigation.

**Steps:**

1. Load Check your answers page
2. Use Tab key to navigate through elements
3. Press Enter on buttons to activate

**Expected Result:** All interactive elements are reachable and usable without a mouse.

**Pages:** `passport-apply-check-answers`
**Components:** `heading`, `summaryList`, `button`
**Tags:** `accessibility`, `keyboard-test`

#### 4. Display of applicant's details [high]

**ID:** `scenario-4`
**Description:** Verify that all entered details are displayed correctly in the summary list.

**Steps:**

1. Navigate to Check your answers page
2. Check each summary list for accuracy

**Expected Result:** All details match the previously entered information perfectly.

**Pages:** `passport-apply-check-answers`
**Components:** `summaryList`
**Tags:** `data-verification`, `user-experience`

---

## Story 5: Confirmation of Passport Application Submission

**ID:** `passport-apply-completion-1763730780237`
**Complexity:** medium
**Tags:** `passport`, `user-journey`, `confirmation`, `GOV.UK`

### User Story

> **As a** citizen applying for a passport
> **I want** to receive a clear confirmation of my application submission with instructions on what to expect next
> **So that** I feel assured that my application is successful and I know what steps to take if I need further assistance

**Description:**

Upon completing the passport application, users should be presented with a confirmation page that summarizes their submission, including a reference number and expected timelines for their passport's arrival. The page should also provide contact information for assistance, ensuring that users can easily reach out if needed.

**Pages:** `confirmation`

**Components:**

- panel: 1
- heading: 2
- paragraph: 3
- insetText: 1

### Acceptance Criteria

#### 1. [MUST] ✅

- **Given** the user has completed their passport application
- **When** they reach the confirmation page
- **Then** they see a panel titled 'Application submitted' with their unique reference number; priority: must; testable: true; tags: [confirmation, user-experience, accessibility] 
- **Tags:** `confirmation`, `user-experience`, `accessibility`

#### 2. [MUST] ✅

- **Given** the user is on the confirmation page
- **When** they look for next steps
- **Then** they see a heading 'What happens next' and explanations of what to expect within 3 weeks; priority: must; testable: true; tags: [user-information, accessibility]
- **Tags:** `user-information`, `accessibility`

#### 3. [SHOULD] ✅

- **Given** the user is on the confirmation page
- **When** they browse for contact information
- **Then** they find a heading 'If you need to contact us' with a phone number and operating times; priority: should; testable: true; tags: [contact-info, user-support]
- **Tags:** `contact-info`, `user-support`

#### 4. [MUST] ✅

- **Given** the user is accessing the confirmation page using assistive technology
- **When** the page loads
- **Then** all interactive elements are correctly labeled and readable by screen readers; priority: must; testable: true; tags: [accessibility, assistive-technology]
- **Tags:** `accessibility`, `assistive-technology`

#### 5. [SHOULD] ✅

- **Given** the user is viewing the confirmation page on a mobile device
- **When** they scroll through the content
- **Then** the layout adapts properly without loss of functionality or readability; priority: should; testable: true; tags: [responsive-design, mobile]
- **Tags:** `responsive-design`, `mobile`

### Test Scenarios

#### 1. Display confirmation message [critical]

**ID:** `TS001`
**Description:** Ensure the application submission panel displays the correct reference number.

**Steps:**

1. Navigate to the confirmation page after submission
2. Verify the panel titled 'Application submitted' contains the text 'Your reference number is HDJ2123F'

**Expected Result:** The reference number is displayed as expected on the confirmation panel.

**Pages:** `confirmation`
**Components:** `panel`
**Tags:** `confirmation`, `validation`

#### 2. Check next steps information [high]

**ID:** `TS002`
**Description:** Ensure the next steps section provides clear information on passport arrival and contact options.

**Steps:**

1. Navigate to the confirmation page
2. Locate the 'What happens next' section
3. Verify the passport arrival information is correct and visible
4. Locate the 'If you need to contact us' section

**Expected Result:** The next steps include the timeframe for passport arrival and the contact information is clearly visible.

**Pages:** `confirmation`
**Components:** `heading`, `paragraph`
**Tags:** `user-information`, `content-validation`

#### 3. Ensure accessibility for users with assistive technology [high]

**ID:** `TS003`
**Description:** Verify that all elements on the confirmation page are accessible for screen reader users.

**Steps:**

1. Use a screen reader to navigate to the confirmation page
2. Verify that all interactive elements are properly announced by the screen reader
3. Check for appropriate aria-labels on buttons and links

**Expected Result:** All elements are accessible and readable by the screen reader without issues.

**Pages:** `confirmation`
**Components:** `panel`, `heading`, `paragraph`
**Tags:** `accessibility`, `assistive-technology`

#### 4. Mobile responsiveness check [medium]

**ID:** `TS004`
**Description:** Verify that the confirmation page elements are displayed correctly on mobile devices.

**Steps:**

1. Open the confirmation page in mobile view
2. Scroll through the confirmation panel and headings
3. Check if all text is readable and no elements overlap

**Expected Result:** All content is properly displayed, readable, and functional on mobile devices without any overlapping or cut-off content.

**Pages:** `confirmation`
**Components:** `panel`, `heading`, `paragraph`
**Tags:** `responsive-design`, `mobile`

---
