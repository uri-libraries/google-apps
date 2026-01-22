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
  "Missing personal item - Circulation 🔍": "circulation",
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

function debugLog(message) {
  try {
    // 🔴 REPLACE WITH YOUR ACTUAL SPREADSHEET ID 🔴
    var id = "YOUR_SPREADSHEET_ID_GOES_HERE"; 
    var sheet = SpreadsheetApp.openById(id).getSheetByName("DebugLog");
    
    // If sheet doesn't exist, create it automatically
    if (!sheet) {
      sheet = SpreadsheetApp.openById(id).insertSheet("DebugLog");
    }
    
    sheet.appendRow([new Date(), message]);
  } catch (e) {
    console.log("Logging failed: " + e.toString()); 
  }
}

function onFormSubmit(e) {
  debugLog("Script triggered");
  
  if (!e) {
    debugLog("Error: No event object 'e'. Are you running this manually?");
    return;
  }

  try {
    const itemResponses = e.response.getItemResponses();
    debugLog("Found " + itemResponses.length + " responses.");
  
    let issueTypes = [];
    let floor = "";
    let location = "";
    let additionalInfo = "";
    let contactInfo = "";
    let hasPhoto = false;
    
    itemResponses.forEach(function(itemResponse) {
      const question = itemResponse.getItem().getTitle();
      const answer = itemResponse.getResponse();
      
      if (question.includes("What kind of problem")) {
        debugLog("Problem found: " + answer);
        issueTypes = Array.isArray(answer) ? answer : [answer];
      } else if (question.includes("What floor")) {
        floor = answer;
      } else if (question.includes("room, internal landmark")) {
        location = answer;
      } else if (question.includes("Upload a picture")) {
        hasPhoto = answer && answer.length > 0;
      } else if (question.includes("anything else we should know")) {
        additionalInfo = answer || "";
      } else if (question.includes("name and email")) {
        contactInfo = answer || "";
      }
    });
    
    const departmentsToNotify = {};
    
    issueTypes.forEach(function(issue) {
      const department = ISSUE_MAPPINGS[issue] || "deansOffice";
      debugLog("Mapped '" + issue + "' to department: " + department);
      if (!departmentsToNotify[department]) {
        departmentsToNotify[department] = [];
      }
      departmentsToNotify[department].push(issue);
    });
    
    const depts = Object.keys(departmentsToNotify);
    debugLog("Notifying " + depts.length + " departments: " + depts.join(", "));

    for (const [department, issues] of Object.entries(departmentsToNotify)) {
      const recipient = EMAIL_CONTACTS[department];
      const ccEmail = department === "itCampus" ? EMAIL_CONTACTS.itLibrary : null;
      
      debugLog("Attempting to send to: " + recipient);
      sendNotificationEmail(EMAIL_CONTACTS[department], issues, floor, location, additionalInfo, contactInfo, hasPhoto, ccEmail);
      debugLog("Email sent command finished for " + department);
    }
  } catch (error) {
    debugLog("FATAL ERROR: " + error.message + " | Stack: " + error.stack);
  }
}

function sendNotificationEmail(recipientEmail, issues, floor, location, additionalInfo, contactInfo, hasPhoto, ccEmail) {
  const subject = "Library Issue Report: " + issues[0].split(" - ")[0];
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
  
  body += "\nFloor: " + (floor || "Not specified") + "\n";
  body += "\nLocation/Landmark: " + (location || "Not specified") + "\n";
  
  body += "\n───────────────────────────────────────────────────────\n";
  body += "ADDITIONAL INFORMATION\n";
  body += "───────────────────────────────────────────────────────\n\n";
  
  body += "Photo Attached: " + (hasPhoto ? "Yes (view in form response)" : "No") + "\n";
  body += "\nAdditional Notes:\n";
  body += "   " + (additionalInfo || "None provided") + "\n";
  
  body += "\n───────────────────────────────────────────────────────\n";
  body += "REPORTER CONTACT\n";
  body += "───────────────────────────────────────────────────────\n\n";
  
  body += "Contact Info: " + (contactInfo || "Anonymous (no contact provided)") + "\n";
  
  body += "\n═══════════════════════════════════════════════════════\n";
  body += "This is an automated notification from the Library Issue\n";
  body += "Reporting form. View all responses in the linked\n";
  body += "Google Sheet for complete details and uploaded photos.\n";
  body += "═══════════════════════════════════════════════════════\n";
  
  const emailOptions = { to: recipientEmail, subject: subject, body: body };
  if (ccEmail) {
    emailOptions.cc = ccEmail;
  }
  GmailApp.sendEmail(emailOptions);
}
