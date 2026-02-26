// ===========================================================================
// CONFIGURATION
// ===========================================================================
const LOG_SPREADSHEET_ID = "12Wi6PsI1ZAkYRlpThuKKosywiuzmduUSaZZBymWXfYw"; 

const EMAIL_CONTACTS = {
  circulation: "librarycirc-group@uri.edu",
  itCampus: "helpdesk@uri.edu",
  itLibrary: "libtechsupport@uri.edu",
  housekeeping: "libadmin-group@uri.edu",
  facilities: "libadmin-group@uri.edu",
  deansOffice: "libadmin-group@uri.edu"
};

const ISSUE_MAPPINGS = {
  "Noise complaint - Circulation 🔊": "circulation",
  "Lost personal item - Circulation 🔍": "circulation",
  "Turn on lights - Circulation 💡": "circulation",
  "Printer problem - IT (Campus) 🖨️": "itCampus",
  "Library computers - IT (Library) 🖥️": "itLibrary",
  "Restroom needs restocking - Housekeeping 🧻": "housekeeping",
  "Cleaning needed - Housekeeping 🧹": "housekeeping",
  "Spill - Housekeeping 🫗": "housekeeping",
  "Water fountain issue - Facilities 💧": "facilities",
  "Repairs needed - Facilities 🔨": "facilities",
  "Graffiti - Dean's Office ❌": "deansOffice",
  "Vandalism - Dean's Office ⚠️": "deansOffice",
  "Safety issue - Dean's Office 🦺": "deansOffice"
};

// ===========================================================================
// DIAGNOSTIC TOOLS
// ===========================================================================

/**
 * ⚠️ IMPORTANT: RUN THIS FUNCTION MANUALLY FIRST!
 * It verifies permissions for Email and Spreadsheets.
 */
function testSystem() {
  console.log("Beginning system test...");
  
  // 1. Test Logging
  try {
    debugLog("✅ MANUAL TEST: System test initiated by user.");
    console.log("Spreadsheet logging successful. Check the 'DebugLog' tab.");
  } catch (e) {
    console.error("❌ SPREADSHEET ERROR: " + e.message);
    throw new Error("Fix Spreadsheet permissions first! " + e.message);
  }

  // 2. Test Email
  try {
    MailApp.sendEmail({
      to: Session.getActiveUser().getEmail(),
      subject: "✅ System Test Successful",
      body: "If you are reading this, the script has permission to send emails."
    });
    console.log("Test email sent.");
  } catch (e) {
    console.error("❌ EMAIL ERROR: " + e.message);
    debugLog("❌ EMAIL ERROR: " + e.message);
  }
}

/**
 * Robust logging function that tries to work even if things are broken
 */
function debugLog(message) {
  try {
    // Open by ID - requires explicit permission scope
    var sheet = SpreadsheetApp.openById(LOG_SPREADSHEET_ID).getSheetByName("DebugLog");
    
    // If sheet doesn't exist, try to create it
    if (!sheet) {
      sheet = SpreadsheetApp.openById(LOG_SPREADSHEET_ID).insertSheet("DebugLog");
    }
    
    sheet.appendRow([new Date(), message]);
  } catch (e) {
    // If we can't write to the sheet, we log to the execution console
    console.log("CRITICAL LOGGING FAILURE: " + e.toString());
  }
}

// ===========================================================================
// MAIN TRIGGER FUNCTION
// ===========================================================================

function onFormSubmit(e) {
  // 1. Immediate sanity check
  if (!e) {
    debugLog("❌ Error: 'onFormSubmit' called without event object (e). Do not run manually. Run 'testSystem' instead.");
    return;
  }
  
  debugLog("🚀 Trigger Received. Starting processing...");

  try {
    // 2. Extract Response securely
    if (!e.response) {
      debugLog("❌ Error: Event object exists but 'response' is missing. Verify Trigger is 'From Form'.");
      return;
    }

    const itemResponses = e.response.getItemResponses();
    debugLog("Processing " + itemResponses.length + " answers.");

    let issueTypes = [];
    let floor = "Not specified";
    let location = "Not specified";
    let additionalInfo = "None";
    let contactInfo = "Anonymous";
    let hasPhoto = false;

    // 3. Map answers
    itemResponses.forEach(function(itemResponse) {
      const question = itemResponse.getItem().getTitle();
      const answer = itemResponse.getResponse();
      
      // Fuzzy matching to avoid exact string mismatches
      if (question.indexOf("What kind of problem") > -1) {
        issueTypes = Array.isArray(answer) ? answer : [answer];
        debugLog("Issue Type: " + JSON.stringify(issueTypes));
      } 
      else if (question.indexOf("What floor") > -1) {
        floor = answer;
      } 
      else if (question.indexOf("room, internal landmark") > -1) {
        location = answer;
      } 
      else if (question.indexOf("Upload a picture") > -1) {
        // Answer to file upload is often an array kind of ID or empty
        hasPhoto = (answer && answer.length > 0);
      } 
      else if (question.indexOf("anything else we should know") > -1) {
        additionalInfo = answer;
      } 
      else if (question.indexOf("name and email") > -1) {
        contactInfo = answer;
      }
    });

    if (issueTypes.length === 0) {
      debugLog("⚠️ Warning: No issue types found selected. Defaulting to Dean's Office.");
    }

    // 4. Group by Department
    const departmentsToNotify = {};
    
    issueTypes.forEach(function(issue) {
      // If issue string doesn't match a key, default to deansOffice
      const department = ISSUE_MAPPINGS[issue] || "deansOffice";
      
      if (!departmentsToNotify[department]) {
        departmentsToNotify[department] = [];
      }
      departmentsToNotify[department].push(issue);
    });

    // 5. Send Emails
    const depts = Object.keys(departmentsToNotify);
    debugLog("Routing to departments: " + depts.join(", "));

    for (const [department, issues] of Object.entries(departmentsToNotify)) {
      const recipient = EMAIL_CONTACTS[department];
      
      if (!recipient) {
        debugLog("❌ Critical: No email configured for department '" + department + "'");
        continue;
      }

      const ccEmail = department === "itCampus" ? EMAIL_CONTACTS.itLibrary : null;
      
      sendNotificationEmail(recipient, issues, floor, location, additionalInfo, contactInfo, hasPhoto, ccEmail);
      debugLog("✅ Email sent to " + recipient);
    }

  } catch (error) {
    debugLog("💀 FATAL SCRIPT ERROR: " + error.message + "\nStack: " + error.stack);
  }
}

function sendNotificationEmail(recipientEmail, issues, floor, location, additionalInfo, contactInfo, hasPhoto, ccEmail) {
  const primaryIssue = issues[0] || "General Issue";
  const cleanSubject = primaryIssue.split(" - ")[0] || primaryIssue;
  const subject = "Library Issue Report: " + cleanSubject;
  const timestamp = new Date().toLocaleString();
  
  let body = "═══════════════════════════════════════════════════════\n";
  body += "        CAROTHERS LIBRARY ISSUE REPORT\n";
  body += "═══════════════════════════════════════════════════════\n\n";
  
  body += "REPORTED: " + timestamp + "\n\n";
  
  body += "───────────────────────────────────────────────────────\n";
  body += "ISSUE DETAILS\n";
  body += "───────────────────────────────────────────────────────\n\n";
  
  body += "Problem Type(s):\n";
  issues.forEach(function(issue) {
    body += "   - " + issue + "\n";
  });
  
  body += "\nFloor: " + floor + "\n";
  body += "\nLocation/Landmark: " + location + "\n";
  
  body += "\n───────────────────────────────────────────────────────\n";
  body += "ADDITIONAL INFORMATION\n";
  body += "───────────────────────────────────────────────────────\n\n";
  
  body += "Photo Attached: " + (hasPhoto ? "Yes (view in form response)" : "No") + "\n";
  body += "\nAdditional Notes:\n";
  body += "   " + (additionalInfo || "None provided") + "\n";
  
  body += "\n───────────────────────────────────────────────────────\n";
  body += "REPORTER CONTACT\n";
  body += "───────────────────────────────────────────────────────\n\n";
  
  body += "Contact Info: " + contactInfo + "\n";
  
  body += "\n═══════════════════════════════════════════════════════\n";
  body += "This is an automated notification from the Library Issue\n";
  body += "Reporting form. View all responses in the linked\n";
  body += "Google Sheet for complete details and uploaded photos.\n";
  body += "\n";
  body += "View Response Spreadsheet:\n";
  body += "https://docs.google.com/spreadsheets/d/1acmZfeHn8uPXs-5r94UFrl-EW_x-X_Q_wb2hp_0M3gM/edit?usp=sharing\n";
  body += "═══════════════════════════════════════════════════════\n";
  
  const emailOptions = { 
    to: recipientEmail, 
    subject: subject, 
    body: body,
    name: "Library Issue Bot"
  };
  
  if (ccEmail) {
    emailOptions.cc = ccEmail;
  }
  
  // Final safeguard
  if (recipientEmail && recipientEmail.includes("@")) {
    MailApp.sendEmail(emailOptions);
  } else {
    debugLog("❌ Skipped email - invalid recipient: " + recipientEmail);
  }
}
