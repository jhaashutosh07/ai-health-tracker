# Testing Guide - AI-Powered Medical Symptom Checker

## Overview
This document outlines the testing procedures for all implemented features in the AI-Powered Medical Symptom Checker application.

**Test Date:** November 8, 2025
**Application URL:** http://localhost:3000
**Test Environment:** Development (SQLite database with seed data)

---

## Phase 1 Features Testing

### 1.1 Forgot Password Functionality

#### Test Cases:

**TC1.1.1: Request Password Reset**
- **Steps:**
  1. Navigate to `/auth/signin`
  2. Click "Forgot Password?" link
  3. Enter registered email: `patient@example.com`
  4. Click "Send Reset Link"
- **Expected Result:**
  - Success message displayed
  - Reset token generated in database
  - Email with reset link would be sent (mock in development)

**TC1.1.2: Reset Password with Valid Token**
- **Steps:**
  1. Copy reset token from database (User table)
  2. Navigate to `/auth/reset-password?token={token}`
  3. Enter new password (min 8 characters)
  4. Confirm password
  5. Click "Reset Password"
- **Expected Result:**
  - Password successfully updated
  - Redirect to sign-in page
  - Can login with new password

**TC1.1.3: Invalid/Expired Token**
- **Steps:**
  1. Navigate to `/auth/reset-password?token=invalid-token-123`
  2. Enter new password
  3. Click "Reset Password"
- **Expected Result:**
  - Error message: "Invalid or expired reset token"
  - Password not changed

---

### 1.2 Google Maps Integration

#### Test Cases:

**TC1.2.1: View Nearby Doctors on Map**
- **Steps:**
  1. Sign in as patient
  2. Navigate to `/find-doctors`
  3. Allow browser location access
- **Expected Result:**
  - Google Map loads successfully
  - User location marker displayed (blue pin)
  - Doctor markers displayed (red pins)
  - Map centered on user location

**TC1.2.2: Search Doctors by Location**
- **Steps:**
  1. On `/find-doctors` page
  2. Enter city in search: "New York"
  3. Click search icon
- **Expected Result:**
  - Map re-centers to searched location
  - Doctors in that area displayed
  - Distance calculated from search location

**TC1.2.3: Filter by Distance**
- **Steps:**
  1. On `/find-doctors` page
  2. Adjust distance slider to 5 km
- **Expected Result:**
  - Only doctors within 5 km displayed
  - Doctor count updates
  - Map markers filtered accordingly

**TC1.2.4: Filter by Specialization**
- **Steps:**
  1. On `/find-doctors` page
  2. Select "Cardiologist" from specialization filter
- **Expected Result:**
  - Only cardiologists displayed
  - Other specialists hidden
  - Map shows only matching doctors

**TC1.2.5: View Doctor Details**
- **Steps:**
  1. Click on doctor marker on map
  2. View info window
  3. Click "View Profile" in doctor card
- **Expected Result:**
  - Doctor details displayed (name, specialization, rating)
  - Distance from user shown
  - Contact information visible
  - Consultation fee displayed

---

### 1.3 Advanced Doctor Filtering

#### Test Cases:

**TC1.3.1: Book Appointment with Doctor Selection**
- **Steps:**
  1. Navigate to `/appointments/new`
  2. Browse available doctors list
  3. Select specialization filter: "General Physician"
  4. Choose a doctor from list
  5. Select appointment date and time
  6. Fill in reason for visit
  7. Submit appointment
- **Expected Result:**
  - Doctors filtered by specialization
  - Appointment created successfully
  - Confirmation message displayed

**TC1.3.2: Search Doctor by Name**
- **Steps:**
  1. On `/appointments/new` page
  2. Enter doctor name in search: "Smith"
- **Expected Result:**
  - Matching doctors displayed
  - Non-matching doctors hidden
  - Search is case-insensitive

**TC1.3.3: Filter by City**
- **Steps:**
  1. On `/appointments/new` page
  2. Enter city in filter: "Brooklyn"
- **Expected Result:**
  - Only doctors in Brooklyn displayed
  - Doctor count updates

**TC1.3.4: Sort Doctors**
- **Steps:**
  1. On `/appointments/new` page
  2. Select "Rating (High to Low)" from sort dropdown
- **Expected Result:**
  - Doctors sorted by rating descending
  - Highest rated doctors appear first

**TC1.3.5: Filter by Minimum Rating**
- **Steps:**
  1. On `/appointments/new` page
  2. Set minimum rating to 4.0
- **Expected Result:**
  - Only doctors with rating >= 4.0 displayed
  - Lower-rated doctors filtered out

---

## Phase 2 Features Testing

### 2.1 Medical Records Management

#### Test Cases:

**TC2.1.1: Upload Medical Document**
- **Steps:**
  1. Sign in as patient
  2. Navigate to `/medical-records`
  3. Click "Upload Document"
  4. Select file (PDF, JPG, or PNG)
  5. Enter title: "Blood Test Results"
  6. Select category: "Lab Reports"
  7. Enter document date
  8. Add description (optional)
  9. Click "Upload Document"
- **Expected Result:**
  - File uploads successfully
  - Success message displayed
  - Document appears in list
  - File saved in `/public/uploads/medical-documents/`

**TC2.1.2: Upload File Size Validation**
- **Steps:**
  1. On `/medical-records` page
  2. Attempt to upload file > 10MB
- **Expected Result:**
  - Error message displayed
  - Upload rejected
  - No file saved to server

**TC2.1.3: Upload File Type Validation**
- **Steps:**
  1. On `/medical-records` page
  2. Attempt to upload .exe or other unsupported file
- **Expected Result:**
  - File input rejects unsupported types
  - Only PDF, JPG, PNG, DOC, DOCX accepted

**TC2.1.4: Filter Documents by Category**
- **Steps:**
  1. On `/medical-records` page
  2. Click "Lab Reports" category filter
- **Expected Result:**
  - Only lab reports displayed
  - Other categories hidden
  - Document count updates

**TC2.1.5: View All Documents**
- **Steps:**
  1. On `/medical-records` page
  2. Click "All Documents" category
- **Expected Result:**
  - All documents from all categories displayed
  - Total count shown

**TC2.1.6: Download Medical Document**
- **Steps:**
  1. On `/medical-records` page
  2. Locate uploaded document
  3. Click download icon (blue download button)
- **Expected Result:**
  - File downloads to browser downloads folder
  - Original filename preserved
  - File opens correctly

**TC2.1.7: Delete Medical Document**
- **Steps:**
  1. On `/medical-records` page
  2. Click delete icon (red trash button)
  3. Confirm deletion in popup
- **Expected Result:**
  - Confirmation dialog appears
  - Document removed from database
  - File deleted from filesystem
  - Document removed from list
  - Success feedback shown

**TC2.1.8: Cancel Document Deletion**
- **Steps:**
  1. On `/medical-records` page
  2. Click delete icon
  3. Click "Cancel" in confirmation dialog
- **Expected Result:**
  - Deletion cancelled
  - Document remains in list
  - No changes to database

**TC2.1.9: View Document Metadata**
- **Steps:**
  1. On `/medical-records` page
  2. View document card
- **Expected Result:**
  - Title displayed
  - Description shown (if provided)
  - Category with icon
  - File size formatted (KB/MB)
  - Upload date formatted
  - Document date shown (if provided)
  - Original filename displayed

**TC2.1.10: Upload Multiple Documents**
- **Steps:**
  1. Upload 3 different documents with different categories
  2. Upload "X-Ray Chest" as XRAY category
  3. Upload "Prescription.pdf" as PRESCRIPTION
  4. Upload "Medical Certificate.pdf" as CERTIFICATE
- **Expected Result:**
  - All documents uploaded successfully
  - Each shows correct category icon
  - All appear in "All Documents" view
  - Each appears when respective category filter selected

---

## Integration Testing

### End-to-End User Flows

**E2E1: Complete Symptom Check to Appointment Booking**
- **Steps:**
  1. Sign in as patient
  2. Navigate to symptom checker
  3. Complete symptom conversation (6+ messages)
  4. Click "Book Appointment"
  5. Select doctor from filtered list
  6. Book appointment
  7. Verify appointment in appointments list
- **Expected Result:**
  - Smooth flow from symptom check to booking
  - Symptom log linked to appointment
  - Doctor recommendation based on symptoms

**E2E2: New Patient Registration to Document Upload**
- **Steps:**
  1. Register new account
  2. Sign in
  3. Upload medical document
  4. Verify document is saved
- **Expected Result:**
  - Account created successfully
  - Session persists
  - Documents tied to user account
  - User can only see their own documents

**E2E3: Password Reset to Sign In**
- **Steps:**
  1. Request password reset
  2. Use reset token
  3. Set new password
  4. Sign in with new credentials
  5. Access protected pages
- **Expected Result:**
  - Complete password reset flow works
  - New password is hashed correctly
  - Old password no longer works

---

## Security Testing

### Authentication & Authorization

**SEC1: Protected Routes**
- **Test:** Access `/medical-records` without authentication
- **Expected:** Redirect to `/auth/signin`

**SEC2: User Isolation**
- **Test:** User A tries to delete User B's document by ID
- **Expected:** 404 or 403 error, operation fails

**SEC3: File Upload Security**
- **Test:** Upload file with malicious name or path traversal
- **Expected:** Filename sanitized, saved with safe name

**SEC4: SQL Injection Prevention**
- **Test:** Enter `' OR '1'='1` in search fields
- **Expected:** Prisma ORM prevents injection, treats as literal string

---

## Performance Testing

**PERF1: Large File Upload**
- Upload 9.5 MB file
- Expected: Upload completes within reasonable time (<30 seconds)

**PERF2: Map Loading with Multiple Markers**
- Load map with 6+ doctors
- Expected: Map renders within 3 seconds

**PERF3: Document List with Many Items**
- Upload 20+ documents
- Expected: List renders smoothly, pagination not needed for <50 items

---

## Browser Compatibility

Test on:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Edge (latest)
- ✅ Safari (latest - if available)

---

## Mobile Responsiveness

Test pages on mobile viewport (375px width):
- ✅ `/medical-records` - Upload form adapts
- ✅ `/find-doctors` - Map resizes, controls accessible
- ✅ `/appointments/new` - Filters collapse properly
- ✅ `/symptom-check` - Chat interface mobile-friendly

---

## Known Issues

1. **EPERM Error on Windows**: `prisma generate` shows rename permission error - does not affect functionality
2. **API Keys Required for Production**:
   - Google Maps requires `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
   - Anthropic Claude requires `ANTHROPIC_API_KEY`
   - Currently running in demo mode for AI features

---

## Test Results Summary

### Phase 1.1 - Forgot Password
- [ ] TC1.1.1 - Request Password Reset
- [ ] TC1.1.2 - Reset Password with Valid Token
- [ ] TC1.1.3 - Invalid/Expired Token

### Phase 1.2 - Google Maps Integration
- [ ] TC1.2.1 - View Nearby Doctors on Map
- [ ] TC1.2.2 - Search Doctors by Location
- [ ] TC1.2.3 - Filter by Distance
- [ ] TC1.2.4 - Filter by Specialization
- [ ] TC1.2.5 - View Doctor Details

### Phase 1.3 - Advanced Doctor Filtering
- [ ] TC1.3.1 - Book Appointment with Doctor Selection
- [ ] TC1.3.2 - Search Doctor by Name
- [ ] TC1.3.3 - Filter by City
- [ ] TC1.3.4 - Sort Doctors
- [ ] TC1.3.5 - Filter by Minimum Rating

### Phase 2 - Medical Records Management
- [ ] TC2.1.1 - Upload Medical Document
- [ ] TC2.1.2 - Upload File Size Validation
- [ ] TC2.1.3 - Upload File Type Validation
- [ ] TC2.1.4 - Filter Documents by Category
- [ ] TC2.1.5 - View All Documents
- [ ] TC2.1.6 - Download Medical Document
- [ ] TC2.1.7 - Delete Medical Document
- [ ] TC2.1.8 - Cancel Document Deletion
- [ ] TC2.1.9 - View Document Metadata
- [ ] TC2.1.10 - Upload Multiple Documents

---

## Testing Credentials

**Patient Account:**
- Email: `patient@example.com`
- Password: `password123`

**Test Data:**
- 6 sample doctors with NYC locations
- Specializations: Cardiologist, Dermatologist, Pediatrician, Orthopedic Surgeon, General Physician, Neurologist
- GPS coordinates for realistic distance calculations

---

## Next Steps After Testing

1. Fix any identified bugs
2. Add automated tests (Jest/Cypress)
3. Implement email notifications for password reset
4. Add file preview functionality
5. Implement pagination for large document lists
6. Add search functionality for medical records
7. Deploy to production environment
