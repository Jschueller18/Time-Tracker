# Deep Work Timer - Backup System Testing Guide

This guide provides comprehensive testing procedures for the backup and restore functionality in the Deep Work Timer application.

## Overview

The backup system includes:
- **Manual Export/Import**: User-initiated backup through Settings
- **Auto-backup Triggers**: Automatic backups based on session count (10 sessions) or time (monthly)
- **Data Preservation**: Sessions, settings, and backup counters
- **Error Handling**: Validation and user feedback

## Prerequisites

1. Open the Deep Work Timer application in a web browser
2. Open Browser Developer Tools (F12)
3. Have sample session data (complete at least 1-2 timer sessions first)

---

## 1. Manual Export Testing

### Test 1.1: Basic Export Functionality

**Steps:**
1. Open Settings (⚙️ icon)
2. Scroll to "Data Backup" section
3. Click "📁 Export My Data" button
4. Verify download starts automatically

**Expected Results:**
- File downloads with name format: `deepwork-backup-YYYY-MM-DD.json`
- File contains valid JSON structure
- Backup status shows: "✓ Data exported successfully: [filename]"
- Status message disappears after 3 seconds

### Test 1.2: Export Content Validation

**Steps:**
1. Complete export as above
2. Open downloaded JSON file in text editor
3. Verify structure contains:

```json
{
  "version": "1.0",
  "exportDate": "2025-07-19T...",
  "totalSessions": [number],
  "sessions": [...],
  "settings": {...}
}
```

**Expected Results:**
- All session data present with correct fields (id, startTime, duration, rating, notes)
- Settings include all current user preferences
- Export date is current timestamp
- Total sessions count matches actual session count

### Test 1.3: Export with No Data

**Steps:**
1. Clear all data:
   ```javascript
   // In Browser Console:
   localStorage.clear()
   indexedDB.deleteDatabase('DeepWorkTimer')
   location.reload()
   ```
2. Attempt export without any sessions

**Expected Results:**
- Export still works
- File contains empty sessions array: `"sessions": []`
- Settings object may be empty: `"settings": {}`
- No errors displayed

---

## 2. Import/Restore Testing

### Test 2.1: Basic Import Functionality

**Prerequisites:** Have a valid backup file from export testing

**Steps:**
1. Open Settings → Data Backup section
2. Click "📂 Import Backup" button
3. Select the backup JSON file
4. Confirm the restoration dialog
5. Wait for page reload

**Expected Results:**
- Confirmation dialog appears with warning message
- Import status shows: "✓ Data imported successfully: X sessions restored"
- Page automatically reloads after 2 seconds
- All sessions from backup are restored
- Settings are restored to backup values

### Test 2.2: Import Validation - Invalid File Types

**Steps:**
1. Try importing different file types:
   - Text file (.txt)
   - Image file (.jpg)
   - Non-JSON file

**Expected Results:**
- Error message: "Please select a valid JSON backup file"
- No data changes occur
- File input resets

### Test 2.3: Import Validation - Invalid JSON Structure

**Steps:**
1. Create invalid backup files and test each:

**Invalid JSON syntax:**
```json
{
  "version": "1.0"
  "sessions": []  // Missing comma
}
```

**Missing required fields:**
```json
{
  "version": "1.0"
  // Missing sessions array
}
```

**Wrong data types:**
```json
{
  "version": "1.0",
  "sessions": "not an array"
}
```

**Expected Results:**
- Error message: "Invalid backup file format" or "Failed to parse backup file"
- No data changes occur
- File input resets

### Test 2.4: Import Cancellation

**Steps:**
1. Start import process
2. Click "Cancel" on confirmation dialog

**Expected Results:**
- Import is cancelled
- No data changes
- File input is reset
- No status messages

---

## 3. Auto-Backup Testing

### Test 3.1: Session Counter Auto-Backup (10 Sessions)

**Setup:**
```javascript
// In Browser Console - Simulate 9 completed sessions:
const counters = { sessionsCompleted: 9, lastMonthlyBackup: new Date().toISOString() }
localStorage.setItem('deepwork-backup-counters', JSON.stringify(counters))
```

**Steps:**
1. Complete one timer session (any duration)
2. Fill out session completion form and save
3. Monitor browser downloads folder

**Expected Results:**
- Auto-backup triggers immediately after 10th session
- Backup file downloads automatically
- Console shows: "Triggering auto-backup..." and "Auto-backup completed successfully"
- Counter resets to 0

**Verification:**
```javascript
// Check counter reset:
const counters = JSON.parse(localStorage.getItem('deepwork-backup-counters'))
console.log(counters.sessionsCompleted) // Should be 0
```

### Test 3.2: Monthly Auto-Backup

**Setup:**
```javascript
// Simulate last backup was 31 days ago:
const oneMonthAgo = new Date()
oneMonthAgo.setDate(oneMonthAgo.getDate() - 31)
const counters = { 
  sessionsCompleted: 5, 
  lastMonthlyBackup: oneMonthAgo.toISOString() 
}
localStorage.setItem('deepwork-backup-counters', JSON.stringify(counters))
```

**Steps:**
1. Complete any timer session
2. Save the session

**Expected Results:**
- Auto-backup triggers due to monthly threshold
- Backup file downloads
- Both session counter and monthly timestamp reset

### Test 3.3: Multiple Trigger Conditions

**Setup:**
```javascript
// Simulate both conditions met:
const oneMonthAgo = new Date()
oneMonthAgo.setDate(oneMonthAgo.getDate() - 31)
const counters = { 
  sessionsCompleted: 10, 
  lastMonthlyBackup: oneMonthAgo.toISOString() 
}
localStorage.setItem('deepwork-backup-counters', JSON.stringify(counters))
```

**Steps:**
1. Complete a timer session
2. Save the session

**Expected Results:**
- Auto-backup triggers (only once, not twice)
- Both counters reset
- Console logs show both conditions were true

### Test 3.4: No Auto-Backup When Not Due

**Setup:**
```javascript
// Recent backup, low session count:
const counters = { 
  sessionsCompleted: 3, 
  lastMonthlyBackup: new Date().toISOString() 
}
localStorage.setItem('deepwork-backup-counters', JSON.stringify(counters))
```

**Steps:**
1. Complete several timer sessions (but less than 10 total)

**Expected Results:**
- No auto-backup occurs
- Session counter increments normally
- No console messages about backup triggers

---

## 4. Error Handling Testing

### Test 4.1: Export Errors

**Simulate export failure:**
```javascript
// Temporarily break the export function:
const originalToJSON = JSON.stringify
JSON.stringify = () => { throw new Error('Simulated error') }

// Try export, then restore:
JSON.stringify = originalToJSON
```

**Expected Results:**
- Error status: "✗ Export failed: [error message]"
- Status message disappears after 5 seconds
- No file download occurs

### Test 4.2: Import with Corrupted Data

**Steps:**
1. Create backup file with corrupted session data:
```json
{
  "version": "1.0",
  "sessions": [
    {
      "id": "invalid",
      "startTime": "not a date",
      "duration": "not a number"
    }
  ],
  "settings": {}
}
```

**Expected Results:**
- Import may fail with database error
- Error message displayed
- Partial data may be imported (test both scenarios)

### Test 4.3: Large File Handling

**Steps:**
1. Create backup with many sessions (500+ entries)
2. Test import performance
3. Monitor browser memory usage

**Expected Results:**
- Import completes successfully (may take longer)
- No browser crashes
- All data imported correctly

---

## 5. Edge Cases and Boundary Testing

### Test 5.1: Backup Counter Edge Cases

**Test near-boundary values:**
```javascript
// Test counter at exactly 10:
const counters = { sessionsCompleted: 10, lastMonthlyBackup: new Date().toISOString() }
localStorage.setItem('deepwork-backup-counters', JSON.stringify(counters))

// Test counter overflow:
const counters2 = { sessionsCompleted: 999, lastMonthlyBackup: new Date().toISOString() }
localStorage.setItem('deepwork-backup-counters', JSON.stringify(counters2))
```

### Test 5.2: Date Handling Edge Cases

**Test various date scenarios:**
```javascript
// Invalid date:
const counters1 = { sessionsCompleted: 5, lastMonthlyBackup: "invalid date" }

// Future date:
const futureDate = new Date()
futureDate.setFullYear(futureDate.getFullYear() + 1)
const counters2 = { sessionsCompleted: 5, lastMonthlyBackup: futureDate.toISOString() }

// Very old date:
const counters3 = { sessionsCompleted: 5, lastMonthlyBackup: "1970-01-01T00:00:00.000Z" }
```

### Test 5.3: Browser Storage Limits

**Test with large datasets:**
1. Create backup with maximum realistic data (several years of sessions)
2. Test import/export performance
3. Monitor localStorage size limits

---

## 6. Browser Developer Tools Utilities

### Useful Console Commands

**Check backup counters:**
```javascript
const counters = JSON.parse(localStorage.getItem('deepwork-backup-counters') || '{}')
console.log('Session count:', counters.sessionsCompleted)
console.log('Last monthly backup:', new Date(counters.lastMonthlyBackup))
```

**Manually trigger backup conditions:**
```javascript
// Force 10-session trigger:
sessionDB.incrementSessionCounter()
console.log(sessionDB.shouldTriggerAutoBackup())

// Force monthly trigger:
const counters = JSON.parse(localStorage.getItem('deepwork-backup-counters') || '{}')
counters.lastMonthlyBackup = new Date('2024-01-01').toISOString()
localStorage.setItem('deepwork-backup-counters', JSON.stringify(counters))
```

**Reset backup counters:**
```javascript
sessionDB.resetBackupCounters()
```

**View all sessions:**
```javascript
sessionDB.getAllSessions().then(sessions => console.log(sessions))
```

**Clear all data for testing:**
```javascript
// Clear localStorage
localStorage.clear()

// Clear IndexedDB
sessionDB.db.sessions.clear().then(() => console.log('Sessions cleared'))
```

---

## 7. Testing Checklist

### Pre-Testing Setup
- [ ] Browser Developer Tools open
- [ ] Sample session data created
- [ ] Backup folder location noted

### Manual Backup Testing
- [ ] Basic export functionality
- [ ] Export content validation
- [ ] Export with no data
- [ ] Download file naming convention

### Import Testing
- [ ] Valid backup import
- [ ] Invalid file type rejection
- [ ] Invalid JSON structure handling
- [ ] Import cancellation
- [ ] Settings restoration
- [ ] Session data restoration

### Auto-Backup Testing
- [ ] 10-session trigger
- [ ] Monthly trigger
- [ ] Multiple conditions trigger
- [ ] No trigger when not due
- [ ] Counter reset after backup

### Error Handling
- [ ] Export error scenarios
- [ ] Import error scenarios
- [ ] Network issues (if applicable)
- [ ] Storage quota exceeded

### Browser Compatibility
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (if accessible)
- [ ] Edge

---

## Expected File Locations

- **Backup files**: Usually in user's default Downloads folder
- **File naming**: `deepwork-backup-YYYY-MM-DD.json`
- **localStorage keys**: 
  - `deepwork-settings`: User preferences
  - `deepwork-backup-counters`: Auto-backup tracking
- **IndexedDB**: `DeepWorkTimer` database, `sessions` table

---

## Troubleshooting Common Issues

1. **Auto-backup not triggering**: Check console for errors, verify counter values
2. **Import fails**: Validate JSON structure, check file permissions
3. **Export downloads multiple times**: Browser download settings, check for duplicate event handlers
4. **Page doesn't reload after import**: Check for JavaScript errors, browser compatibility

This testing guide ensures comprehensive validation of the backup system's reliability and user experience.